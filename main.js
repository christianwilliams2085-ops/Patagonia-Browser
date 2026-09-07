const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain,
    session,
    shell,
    dialog,
    Menu
} = require("electron");

if (require("electron-squirrel-startup")) {
    app.quit();
    return;
}

const {
    ALTURA_BARRA,
    ALTURA_BUSQUEDA,
    ANCHO_BARRA_LATERAL,
    PAGINA_INICIO
} = require("./src/shared/constants");

const {
    navegar,
    atras,
    adelante,
    recargar,
    detener,
    obtenerContenido,
    estadoNavegacion
} = require("./src/main/navigation");

const path = require("path");
const fs = require("node:fs");
const { pathToFileURL } = require("node:url");
const { crearIPCInterfaz, protegerInterfaz } = require("./src/main/security");
const { registrarAtajos } = require("./src/main/shortcuts");
const { registrarConfiguracion } = require("./src/main/settings");
const { registrarInstanciaUnica, registrarCierre, cerrarContenido } = require("./src/main/lifecycle");
const { registrarAperturas, PREFERENCIAS_WEB } = require("./src/main/newWindows");
const { crearBusqueda } = require("./src/main/find");
const { registrarMenu } = require("./src/main/menu");
const { registrarPermisos } = require("./src/main/permissions");
const { crearPestanasCerradas } = require("./src/main/closedTabs");
const { registrarSesiones, crearInstantanea } = require("./src/main/sessions");
const { registrarDescargas } = require("./src/main/downloads");
const { registrarHistorial } = require("./src/main/history");
const { registrarFavoritos } = require("./src/main/bookmarks");
const { registrarErroresCarga } = require("./src/main/loadErrors");
const { crearProteccion } = require("./src/main/adblocker");
const { obtenerHTMLPagina, MAX_ELEMENTOS } = require("./src/main/pageSnapshot");
const {
    Readability
} = require("@mozilla/readability");

const {
    JSDOM
} = require("jsdom");

const {
    crearContextoPagina
} = require("./ui/modules/pageContext");

const {
    procesarConsulta
} = require("./services/ai");

let ventanaPrincipal;
let pestanas = [];
let idPestanaActiva = null;
let siguienteId = 1;
let barraLateralAbierta = false;
let observarVisitas;
let gestorSesion;
let sesionInicial;
let restaurandoSesion = true;
let cerrandoVentana = false;
let gestorConfiguracion;
let gestorDescargas;
let gestorPermisos;
let gestorFavoritos;
let gestorProteccion;
const pestañasCerradas = crearPestanasCerradas();
const cierresSolicitados = new Set();
const ipcInterfaz = crearIPCInterfaz(ipcMain, () => ventanaPrincipal);
const RUTA_NUEVA_PESTANA = path.join(__dirname, "ui", "new-tab.html");
const URL_NUEVA_PESTANA = pathToFileURL(RUTA_NUEVA_PESTANA).href;
const RUTA_ICONO = path.join(__dirname, "assets", "patagonia-oficial.ico");

app.setAppUserModelId?.("com.squirrel.PatagoniaBrowser.PatagoniaBrowser");
if (typeof app.setPath === "function") {
    const perfilEstable = path.join(app.getPath("appData"), "patagonia-browser-main");
    fs.mkdirSync(perfilEstable, { recursive: true });
    app.setPath("userData", perfilEstable);
}
const gestorBusqueda = crearBusqueda({
    obtenerContenido: () => obtenerContenido(obtenerPestanaActiva()),
    notificar: (estado, enfocar) => {
        if (!ventanaPrincipal || ventanaPrincipal.isDestroyed()) return;
        ajustarVista();
        if (enfocar) ventanaPrincipal.webContents.focus();
        ventanaPrincipal.webContents.send("estado-busqueda", { ...estado, enfocar });
    }
});

function paginaInicio() {
    return gestorConfiguracion?.estado().inicio || PAGINA_INICIO;
}

function esNuevaPestanaPatagonia(url) {
    return url === URL_NUEVA_PESTANA;
}

function irAInicio() {
    navegar(obtenerPestanaActiva(), paginaInicio());
}

function detenerCargaActiva() {
    const pestana = obtenerPestanaActiva();
    if (!detener(pestana)) return;
    if (esNuevaPestanaPatagonia(obtenerContenido(pestana)?.getURL())) {
        pestana.url = "";
        pestana.interna = true;
    }
    enviarURLActual();
    enviarPestanas();
}

function cambiarPestana(desplazamiento) {
    if (!pestanas.length) return;
    const indice = pestanas.findIndex(pestana => pestana.id === idPestanaActiva);
    activarPestana(pestanas[(indice + desplazamiento + pestanas.length) % pestanas.length].id);
}

function accionesNavegacion() {
    return {
        direccion: () => {
            ventanaPrincipal.webContents.focus();
            ventanaPrincipal.webContents.send("enfocar-direccion");
        },
        nueva: () => crearPestana(),
        reabrir: reabrirUltimaPestana,
        cerrar: () => cerrarPestana(idPestanaActiva),
        recargar: () => recargar(obtenerPestanaActiva()),
        detener: detenerCargaActiva,
        atras: () => atras(obtenerPestanaActiva()),
        adelante: () => adelante(obtenerPestanaActiva()),
        inicio: irAInicio,
        buscar: () => gestorBusqueda.abrir(),
        buscarSiguiente: () => gestorBusqueda.siguiente(),
        buscarAnterior: () => gestorBusqueda.siguiente(false),
        cerrarBusqueda: () => {
            if (!gestorBusqueda.estado().abierta) return false;
            gestorBusqueda.cerrar();
            obtenerContenido(obtenerPestanaActiva())?.focus();
            return true;
        },
        cerrarVentana: () => ventanaPrincipal.close(),
        siguiente: () => cambiarPestana(1),
        anterior: () => cambiarPestana(-1)
    };
}

function conectarAtajos(contenido) {
    registrarAtajos(contenido, accionesNavegacion());
}

function recordarSesion() {
    if (!restaurandoSesion && !cerrandoVentana) gestorSesion?.actualizar(pestanas, idPestanaActiva);
}

function obtenerPestanaActiva() {
    return pestanas.find(
        (pestana) => pestana.id === idPestanaActiva
    );
}

function obtenerURLPrincipal(idContenido) {
    for (const pestana of pestanas) {
        const contenido = obtenerContenido(pestana);
        if (contenido && contenido.id === idContenido) return contenido.getURL() || pestana.url;
    }
    return "";
}

function ajustarVista() {
    const pestanaActiva = obtenerPestanaActiva();

    if (cerrandoVentana || !ventanaPrincipal || ventanaPrincipal.isDestroyed() || !obtenerContenido(pestanaActiva)) {
        return;
    }

    const [ancho, alto] =
        ventanaPrincipal.getContentSize();

    const anchoLateral = barraLateralAbierta
        ? ANCHO_BARRA_LATERAL
        : 0;
    const alturaSuperior = ALTURA_BARRA + (gestorBusqueda.estado().abierta ? ALTURA_BUSQUEDA : 0);

    pestanaActiva.vista.setBounds({
        x: 0,
        y: alturaSuperior,
        width: Math.max(
            0,
            ancho - anchoLateral
        ),
        height: Math.max(
            0,
            alto - alturaSuperior
        )
    });
}

function enviarEstadoBarraLateral() {
    if (
        !ventanaPrincipal ||
        ventanaPrincipal.isDestroyed()
    ) {
        return;
    }

    ventanaPrincipal.webContents.send(
        "estado-barra-lateral",
        barraLateralAbierta
    );
}

function enviarEstadoProteccion() {
    if (!ventanaPrincipal || ventanaPrincipal.isDestroyed() || !gestorProteccion) return;
    const pestana = obtenerPestanaActiva();
    const contenido = pestana?.vista?.webContents;
    const contenidoDisponible = contenido && !contenido.isDestroyed();
    const url = contenidoDisponible
        ? contenido.getURL()
        : pestana?.url || "";
    ventanaPrincipal.webContents.send(
        "proteccion-actualizada",
        gestorProteccion.estado(contenidoDisponible ? contenido.id : 0, url)
    );
}

function enviarPestanas() {
    recordarSesion();
    if (
        !ventanaPrincipal ||
        ventanaPrincipal.isDestroyed()
    ) {
        return;
    }

    const datosPestanas = pestanas.map(
        (pestana) => ({
            id: pestana.id,
            titulo: pestana.titulo,
            url: pestana.url,
            favicon: pestana.favicon,
            cargando: pestana.cargando,
            ...estadoNavegacion(pestana),
            errorCarga: pestana.errorCarga || null,
            activa:
                pestana.id === idPestanaActiva
        })
    );

    ventanaPrincipal.webContents.send(
        "pestanas-actualizadas",
        datosPestanas
    );
}

function enviarURLActual() {
    const pestanaActiva =
        obtenerPestanaActiva();

    if (
        pestanaActiva &&
        ventanaPrincipal &&
        !ventanaPrincipal.isDestroyed()
    ) {
        ventanaPrincipal.webContents.send( 
            "url-actualizada",
            pestanaActiva.url
        );
}
}        
async function obtenerContextoPestanaActiva() {
    const pestanaActiva =
        obtenerPestanaActiva();

    if (!pestanaActiva) {
        throw new Error(
            "No hay una pestaña activa."
        );
    }

    const contenido = obtenerContenido(pestanaActiva);
    if (!contenido) {
        throw new Error(
            "La pestaña activa ya no está disponible."
        );
    }

    const datosPagina = await obtenerHTMLPagina(contenido);
    if (obtenerPestanaActiva() !== pestanaActiva) {
        throw new Error("Cambiaste de pestaña durante la lectura. Volvé a intentarlo.");
    }

    const dom = new JSDOM(
        datosPagina.html,
        {
            url: datosPagina.url
        }
    );

    try {
        const articulo =
            new Readability(
                dom.window.document,
                { maxElemsToParse: MAX_ELEMENTOS }
            ).parse();
        const textoAlternativo =
            dom.window.document.body
                ?.textContent || "";

        return crearContextoPagina({
            titulo:
                articulo?.title ||
                datosPagina.titulo ||
                "",
            url:
                datosPagina.url,
            texto:
                articulo?.textContent ||
                textoAlternativo
        });
    } finally {
        dom.window.close();
    }
}

function crearPestana(
    url = null,
    { vista: vistaExistente, activar = true, cargar = true, opcionesCarga } = {}
) {
    if (cerrandoVentana || !ventanaPrincipal || ventanaPrincipal.isDestroyed()) return null;
    const id = siguienteId++;
    const esNuevaPestana = url === null;
    const destino = esNuevaPestana ? URL_NUEVA_PESTANA : url;

    const vista = vistaExistente || new WebContentsView({
        webPreferences: PREFERENCIAS_WEB
    });
    const idContenido = vista.webContents.id;

    const pestana = {
        id,
        vista,
        titulo: "Nueva pestaña",
        url: esNuevaPestana ? "" : url,
        interna: esNuevaPestana,
        favicon: "",
        cargando: false
    };

    pestanas.push(pestana);
    gestorProteccion?.reiniciarPestana(idContenido);
    conectarAtajos(vista.webContents);
    observarVisitas(vista.webContents);
    gestorBusqueda.observar(vista.webContents);
    registrarAperturas({
        contenido: vista.webContents,
        crearVista: opciones => new WebContentsView(opciones),
        agregarPestana: crearPestana,
        puedeAbrir: () => Boolean(ventanaPrincipal && !ventanaPrincipal.isDestroyed() && !cerrandoVentana)
    });
    vista.webContents.once("destroyed", () => {
        gestorProteccion?.olvidarPestana(idContenido);
        const recordar = cierresSolicitados.delete(id);
        if (!cerrandoVentana && ventanaPrincipal && !ventanaPrincipal.isDestroyed()) quitarPestana(id, recordar);
    });

    registrarErroresCarga(pestana, () => {
        pestana.interna = esNuevaPestanaPatagonia(pestana.url);
        if (pestana.interna) pestana.url = "";
        enviarURLActual();
        enviarPestanas();
    });

    vista.webContents.on(
        "did-start-navigation",
        (_evento, _url, _enMismaPagina, esMarcoPrincipal) => {
            if (esMarcoPrincipal) gestorProteccion?.reiniciarPestana(idContenido);
        }
    );

    vista.webContents.on(
        "did-start-loading",
        () => {
            pestana.cargando = true;
            enviarPestanas();
        }
    );

    vista.webContents.on(
        "did-stop-loading",
        () => {
            pestana.cargando = false;
            enviarPestanas();
        }
    );

    vista.webContents.on(
        "did-navigate",
        (_evento, nuevaURL) => {
            pestana.interna = esNuevaPestanaPatagonia(nuevaURL);
            pestana.url = pestana.interna ? "" : nuevaURL;

            if (
                pestana.id ===
                idPestanaActiva
            ) {
                enviarURLActual();
                enviarEstadoProteccion();
            }

            enviarPestanas();
        }
    );

    vista.webContents.on(
        "did-navigate-in-page",
        (_evento, nuevaURL, esMarcoPrincipal) => {
            if (!esMarcoPrincipal) return;
            pestana.interna = esNuevaPestanaPatagonia(nuevaURL);
            pestana.url = pestana.interna ? "" : nuevaURL;

            if (
                pestana.id ===
                idPestanaActiva
            ) {
                enviarURLActual();
                enviarEstadoProteccion();
            }

            enviarPestanas();
        }
    );

    vista.webContents.on(
        "page-title-updated",
        (_evento, titulo) => {
            pestana.titulo =
                titulo ||
                "Nueva pestaña";

            enviarPestanas();
        }
    );

    vista.webContents.on(
        "page-favicon-updated",
        (_evento, favicons) => {
            pestana.favicon =
                favicons[0] || "";

            enviarPestanas();
        }
    );

    if (cargar) {
        if (opcionesCarga) {
            vista.webContents.loadURL(destino, opcionesCarga).catch(() => {
                // registrarErroresCarga informa el fallo en esta pestaña.
            });
        } else if (esNuevaPestana) {
            vista.webContents.loadURL(destino).catch(() => {
                // registrarErroresCarga informa el fallo en esta pestaña.
            });
        } else navegar(pestana, destino);
    }
    if (activar || idPestanaActiva === null) activarPestana(id);
    else enviarPestanas();
    return id;
}

function activarPestana(id) {
    const pestana = pestanas.find(
        (elemento) =>
            elemento.id === id
    );

    if (cerrandoVentana || !ventanaPrincipal || ventanaPrincipal.isDestroyed() || !obtenerContenido(pestana)) {
        return;
    }

    pestanas.forEach(
        (elemento) => {
            ventanaPrincipal.contentView
                .removeChildView(
                    elemento.vista
                );
        }
    );

    idPestanaActiva = id;
    gestorPermisos?.cambiarPestana();
    gestorBusqueda.cambiarPestana();

    ventanaPrincipal.contentView
        .addChildView(
            pestana.vista
        );

    ajustarVista();
    enviarURLActual();
    enviarPestanas();
    enviarEstadoProteccion();
}

function cerrarPestana(id) {
    const pestana = pestanas.find(elemento => elemento.id === id);
    if (!pestana || cerrandoVentana || cierresSolicitados.has(id)) return;
    const contenido = obtenerContenido(pestana);
    if (!contenido) { quitarPestana(id); return; }
    cierresSolicitados.add(id);
    void cerrarContenido({ contenido, ventana: ventanaPrincipal, dialog })
        .then(cerrada => { if (!cerrada) cierresSolicitados.delete(id); });
}

function reabrirUltimaPestana() {
    if (cerrandoVentana || !ventanaPrincipal || ventanaPrincipal.isDestroyed()) return false;
    const cerrada = pestañasCerradas.recuperar();
    if (!cerrada) return false;
    crearPestana(cerrada.url);
    return true;
}

function quitarPestana(id, recordar = false) {
    const indice =
        pestanas.findIndex(
            (pestana) =>
                pestana.id === id
        );

    if (indice === -1) {
        return;
    }

    const pestanaCerrada =
        pestanas[indice];

    if (recordar) pestañasCerradas.guardar(pestanaCerrada);

    ventanaPrincipal.contentView
        .removeChildView(
            pestanaCerrada.vista
        );

    pestanas.splice(indice, 1);

    if (pestanas.length === 0) {
        crearPestana();
        return;
    }

    if (idPestanaActiva === id) {
        const nuevaActiva =
            pestanas[
                Math.min(
                    indice,
                    pestanas.length - 1
                )
            ];

        activarPestana(
            nuevaActiva.id
        );
    } else {
        enviarPestanas();
    }
}

function crearVentana() {
    console.log("Creando ventana...");

    ventanaPrincipal = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        show: false,
        center: true,
        title: "Patagonia Browser",
        titleBarStyle: "hidden",
        titleBarOverlay: {
            color: "#061624",
            symbolColor: "#e7f2f8",
            height: 44
        },
        autoHideMenuBar: true,
        backgroundColor: "#061624",
        icon: RUTA_ICONO,
        webPreferences: {
            preload: path.join(
                __dirname,
                "preload.js"
            ),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    console.log("BrowserWindow creada.");
    protegerInterfaz(ventanaPrincipal.webContents);
    conectarAtajos(ventanaPrincipal.webContents);
    registrarMenu(Menu, accionesNavegacion());
    ventanaPrincipal.setMenuBarVisibility?.(false);

    ventanaPrincipal.webContents.on(
        "did-finish-load",
        () => {
            if (!restaurandoSesion) {
                enviarURLActual();
                enviarPestanas();
                enviarEstadoBarraLateral();
                enviarEstadoProteccion();
                gestorBusqueda.reenviar();
                return;
            }
            console.log(
                "Interfaz principal lista."
            );

            ventanaPrincipal.center();
            ventanaPrincipal.show();
            ventanaPrincipal.restore();
            ventanaPrincipal.focus();

            const anteriores = gestorConfiguracion.estado().restaurar ? (sesionInicial?.pestanas || []) : [];
            const ids = anteriores.map(pestana => crearPestana(pestana.url));
            if (ids.length) activarPestana(ids[sesionInicial.activa] || ids[0]);
            else crearPestana();
            restaurandoSesion = false;
            recordarSesion();
            enviarEstadoBarraLateral();
            enviarEstadoProteccion();
        }
    );

    ventanaPrincipal.webContents.on(
        "did-fail-load",
        (
            _evento,
            codigoError,
            descripcionError
        ) => {
            console.error(
                "Falló la carga de la interfaz:",
                codigoError,
                descripcionError
            );
        }
    );

    ventanaPrincipal
        .loadFile(path.join(__dirname, "index.html"))
        .then(() => {
            console.log(
                "index.html cargado correctamente."
            );
        })
        .catch((error) => {
            console.error(
                "Error al cargar index.html:",
                error
            );
        });

    ventanaPrincipal.on(
        "resize",
        ajustarVista
    );

    registrarCierre({
        ventana: ventanaPrincipal,
        dialog,
        contarDescargas: () => gestorDescargas.contarActivas(),
        guardarDatos: async () => {
            recordarSesion();
            const resultados = await Promise.allSettled([
                gestorSesion.guardarAhora(), gestorFavoritos.esperar(),
                observarVisitas.esperar(), gestorConfiguracion.esperar(), gestorProteccion?.esperar()
            ]);
            const fallo = resultados.find(resultado => resultado.status === "rejected");
            if (fallo) throw fallo.reason;
            // Las páginas pueden terminar de navegar mientras se guardan los otros datos.
            if (!gestorSesion.estado().guardada) await gestorSesion.guardarAhora();
        },
        cerrarPestanas: async () => {
            const ventana = ventanaPrincipal;
            const anteriores = [...pestanas];
            sesionInicial = crearInstantanea(anteriores, idPestanaActiva);
            // Conservar la sesión guardada mientras se cierran los documentos.
            // Si el usuario cancela, las pestañas restantes siguen disponibles.
            cerrandoVentana = true;
            let completado = false;
            try {
                for (const pestana of anteriores) {
                    if (!await cerrarContenido({ contenido: obtenerContenido(pestana), ventana, dialog })) return false;
                    pestañasCerradas.guardar(pestana);
                }
                completado = true;
                return true;
            } finally {
                if (!completado && !ventana.isDestroyed()) {
                    for (const pestana of pestanas) {
                        if (!obtenerContenido(pestana)) ventana.contentView.removeChildView(pestana.vista);
                    }
                    pestanas = pestanas.filter(pestana => obtenerContenido(pestana));
                    cerrandoVentana = false;
                    if (!pestanas.length) crearPestana();
                    else activarPestana(obtenerPestanaActiva()?.id ?? pestanas[0].id);
                }
            }
        }
    });

    ventanaPrincipal.on(
        "closed",
        () => {
            cerrandoVentana = true;
            const anteriores = pestanas;
            // Los eventos de destrucción y las solicitudes pendientes no deben
            // encontrar pestañas retiradas durante la limpieza final.
            pestanas = [];
            cierresSolicitados.clear();
            idPestanaActiva = null;
            barraLateralAbierta = false;
            ventanaPrincipal = null;
            for (const pestana of anteriores) obtenerContenido(pestana)?.close();
        }
    );
}

ipcInterfaz.on("abrir-busqueda", () => gestorBusqueda.abrir());
ipcInterfaz.on("detener-carga", detenerCargaActiva);
ipcInterfaz.on("buscar-en-pagina", (_evento, datos) => {
    if (!datos || typeof datos.texto !== "string" || typeof datos.adelante !== "boolean" || typeof datos.repetir !== "boolean") return;
    gestorBusqueda.buscar(datos.texto, datos.adelante, datos.repetir);
});
ipcInterfaz.on("cerrar-busqueda", () => {
    gestorBusqueda.cerrar();
    obtenerContenido(obtenerPestanaActiva())?.focus();
});

ipcInterfaz.on(
    "nueva-pestana",
    () => {
        crearPestana();
    }
);

ipcInterfaz.on(
    "activar-pestana",
    (_evento, id) => {
        activarPestana(
            Number(id)
        );
    }
);

ipcInterfaz.on(
    "cerrar-pestana",
    (_evento, id) => {
        cerrarPestana(
            Number(id)
        );
    }
);

ipcInterfaz.on(
    "navegar",
    (_evento, direccion) => {
        navegar(
            obtenerPestanaActiva(),
            direccion
        );
    }
);

ipcInterfaz.on(
    "atras",
    () => {
        atras(
            obtenerPestanaActiva()
        );
    }
);

ipcInterfaz.on(
    "adelante",
    () => {
        adelante(
            obtenerPestanaActiva()
        );
    }
);

ipcInterfaz.on(
    "recargar",
    () => {
        recargar(
            obtenerPestanaActiva()
        );
    }
);

ipcInterfaz.on(
    "inicio",
    () => {
        irAInicio();
    }
);

ipcInterfaz.on(
    "alternar-barra-lateral",
    () => {
        barraLateralAbierta =
            !barraLateralAbierta;

        ajustarVista();
        enviarEstadoBarraLateral();
    }
);

ipcInterfaz.handle("obtener-proteccion", () => {
    const pestana = obtenerPestanaActiva();
    const contenido = pestana?.vista?.webContents;
    const contenidoDisponible = contenido && !contenido.isDestroyed();
    return {
        correcto: true,
        proteccion: gestorProteccion?.estado(
            contenidoDisponible ? contenido.id : 0,
            contenidoDisponible ? contenido.getURL() : pestana?.url || ""
        ) || { disponible: false, sitio: "", activa: false, permitida: false, anuncios: 0, rastreadores: 0, total: 0 }
    };
});

ipcInterfaz.handle("alternar-proteccion-sitio", async () => {
    const pestana = obtenerPestanaActiva();
    const contenido = pestana?.vista?.webContents;
    if (!gestorProteccion || !contenido || contenido.isDestroyed()) {
        return { correcto: false, error: "La protección todavía no está disponible." };
    }
    try {
        const proteccion = await gestorProteccion.alternarSitio(contenido.id, contenido.getURL());
        // La pestaña puede cerrarse mientras se guarda la excepción.
        if (!contenido.isDestroyed()) contenido.reload();
        enviarEstadoProteccion();
        return { correcto: true, proteccion };
    } catch (error) {
        return { correcto: false, error: error.message };
    }
});

ipcInterfaz.handle(
    "obtener-contexto-pagina",
    async () => {
        try {
            const contexto =
                await obtenerContextoPestanaActiva();

            return {
                correcto: true,
                contexto
            };
        } catch (error) {
            console.error(
                "No se pudo obtener el contexto de la página:",
                error
            );

            return {
                correcto: false,
                error: error.message
            };
        }
    }
);

ipcInterfaz.handle(
    "procesar-consulta-ia",
    async (_evento, mensaje) => {
        try {
            const texto =
                String(
                    mensaje || ""
                ).trim();

            if (!texto) {
                throw new Error(
                    "El mensaje está vacío."
                );
            }

            const contexto =
                await obtenerContextoPestanaActiva();

            const resultado =
                await procesarConsulta({
                    mensaje: texto,
                    contexto
                });

            return {
                correcto: true,
                resultado
            };
        } catch (error) {
            console.error(
                "No se pudo procesar la consulta de IA:",
                error
            );

            return {
                correcto: false,
                error: error.message
            };
        }
    }
);

process.on(
    "uncaughtException",
    (error) => {
        console.error(
            "Error no controlado:",
            error
        );
    }
);

process.on(
    "unhandledRejection",
    (error) => {
        console.error(
            "Promesa rechazada:",
            error
        );
    }
);

if (registrarInstanciaUnica(app, () => ventanaPrincipal)) app.whenReady()
    .then(async () => {
        console.log("Electron listo.");
        gestorConfiguracion = registrarConfiguracion({
            ipcMain,
            archivo: path.join(app.getPath("userData"), "configuracion.json"),
            obtenerVentana: () => ventanaPrincipal
        });
        await gestorConfiguracion.iniciar();
        gestorSesion = registrarSesiones({
            ipcMain,
            archivo: path.join(app.getPath("userData"), "sesion.json"),
            obtenerVentana: () => ventanaPrincipal
        });
        sesionInicial = await gestorSesion.iniciar();
        gestorDescargas = registrarDescargas({
            ipcMain,
            sesion: session.defaultSession,
            shell,
            obtenerVentana: () => ventanaPrincipal,
            esPestanaPropia: contenido => pestanas.some(pestana => pestana.vista.webContents === contenido)
        });
        gestorPermisos = registrarPermisos({
            sesion: session.defaultSession,
            dialog,
            obtenerVentana: () => ventanaPrincipal,
            esPestanaPropia: contenido => pestanas.some(pestana => pestana.vista.webContents === contenido),
            esPestanaActiva: contenido => obtenerPestanaActiva()?.vista.webContents === contenido
        });
        gestorProteccion = crearProteccion({
            sesion: session.defaultSession,
            directorioDatos: app.getPath("userData"),
            rutaMotorIncluido: path.join(__dirname, "assets", "patagonia-adblock.bin"),
            obtenerURLPrincipal,
            notificar: enviarEstadoProteccion
        });
        await gestorProteccion.iniciar().catch(error => {
            console.error("La protección contra anuncios no pudo iniciarse:", error.message);
        });
        observarVisitas = registrarHistorial({
            ipcMain,
            archivo: path.join(app.getPath("userData"), "historial.json"),
            obtenerVentana: () => ventanaPrincipal,
            obtenerPestana: obtenerPestanaActiva,
            navegar
        });
        gestorFavoritos = registrarFavoritos({
            ipcMain,
            archivo: path.join(app.getPath("userData"), "favoritos.json"),
            obtenerVentana: () => ventanaPrincipal,
            obtenerPestana: obtenerPestanaActiva,
            navegar
        });
        crearVentana();
        gestorProteccion.actualizarSiHaceFalta();
    })
    .catch((error) => {
        console.error(
            "Error al iniciar Electron:",
            error
        );
    });

let datosGuardadosAlSalir = false;
let esperandoSalida = false;
app.on("will-quit", (evento) => {
    if (datosGuardadosAlSalir || !observarVisitas) {
        gestorProteccion?.cerrar();
        return;
    }
    evento.preventDefault();
    if (esperandoSalida) return;
    esperandoSalida = true;
    Promise.allSettled([observarVisitas.esperar(), gestorFavoritos?.esperar(), gestorSesion?.guardarAhora(), gestorConfiguracion?.esperar(), gestorProteccion?.esperar()]).finally(() => {
        datosGuardadosAlSalir = true;
        app.quit();
    });
});

app.on(
    "window-all-closed",
    () => {
        if (
            process.platform !==
            "darwin"
        ) {
            app.quit();
        }
    }
);

// En macOS cerrar la última ventana no termina la aplicación.
app.on("activate", () => {
    if (!ventanaPrincipal && observarVisitas && gestorSesion) {
        cerrandoVentana = false;
        restaurandoSesion = true;
        crearVentana();
    }
});
