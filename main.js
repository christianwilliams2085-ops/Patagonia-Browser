const {
    app,
    BrowserWindow,
    WebContentsView,
    ipcMain
} = require("electron");

const {
    ALTURA_BARRA,
    ANCHO_BARRA_LATERAL,
    PAGINA_INICIO
} = require("./src/shared/constants");

const {
    navegar,
    atras,
    adelante,
    recargar,
    irAInicio
} = require("./src/main/navigation");

const path = require("path");
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

function obtenerPestanaActiva() {
    return pestanas.find(
        (pestana) => pestana.id === idPestanaActiva
    );
}

function ajustarVista() {
    const pestanaActiva = obtenerPestanaActiva();

    if (!ventanaPrincipal || !pestanaActiva) {
        return;
    }

    const [ancho, alto] =
        ventanaPrincipal.getContentSize();

    const anchoLateral = barraLateralAbierta
        ? ANCHO_BARRA_LATERAL
        : 0;

    pestanaActiva.vista.setBounds({
        x: 0,
        y: ALTURA_BARRA,
        width: Math.max(
            0,
            ancho - anchoLateral
        ),
        height: Math.max(
            0,
            alto - ALTURA_BARRA
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

function enviarPestanas() {
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

    if (
        pestanaActiva.vista.webContents
            .isDestroyed()
    ) {
        throw new Error(
            "La pestaña activa ya no está disponible."
        );
    }

    const datosPagina =
        await pestanaActiva.vista.webContents
            .executeJavaScript(`
                (() => {
                    const copia =
                        document.documentElement
                            .cloneNode(true);

                    copia
                        .querySelectorAll(
                            "script, style, noscript, iframe, canvas, svg"
                        )
                        .forEach((elemento) => {
                            elemento.remove();
                        });

                    return {
                        titulo:
                            document.title || "",
                        url:
                            window.location.href,
                        html:
                            "<!doctype html>" +
                            copia.outerHTML
                    };
                })();
            `);

    const dom = new JSDOM(
        datosPagina.html,
        {
            url: datosPagina.url
        }
    );

    try {
        const articulo =
            new Readability(
                dom.window.document
            ).parse();
console.log("Readability encontró artículo:", !!articulo);

if (articulo) {
    console.log("Título:", articulo.title);
    const indiceTemas =
    articulo.textContent.indexOf(
        "Temas destacados"
    );

console.log(
    "Índice de Temas destacados:",
    indiceTemas
);

if (indiceTemas !== -1) {
    console.log(
        "Texto alrededor:",
        articulo.textContent.substring(
            Math.max(0, indiceTemas - 200),
            indiceTemas + 500
        )
    );
}
    console.log(
        "Texto:",
        articulo.textContent.substring(0, 500)
    );
}
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
    url = PAGINA_INICIO
) {
    const id = siguienteId++;

    const vista = new WebContentsView({
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true
        }
    });

    const pestana = {
        id,
        vista,
        titulo: "Nueva pestaña",
        url,
        favicon: "",
        cargando: false
    };

    pestanas.push(pestana);

    ventanaPrincipal.contentView
        .addChildView(vista);

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
            pestana.url = nuevaURL;

            if (
                pestana.id ===
                idPestanaActiva
            ) {
                enviarURLActual();
            }

            enviarPestanas();
        }
    );

    vista.webContents.on(
        "did-navigate-in-page",
        (_evento, nuevaURL) => {
            pestana.url = nuevaURL;

            if (
                pestana.id ===
                idPestanaActiva
            ) {
                enviarURLActual();
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

    vista.webContents.loadURL(url);

    activarPestana(id);
}

function activarPestana(id) {
    const pestana = pestanas.find(
        (elemento) =>
            elemento.id === id
    );

    if (!pestana) {
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

    ventanaPrincipal.contentView
        .addChildView(
            pestana.vista
        );

    ajustarVista();
    enviarURLActual();
    enviarPestanas();
}

function cerrarPestana(id) {
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

    ventanaPrincipal.contentView
        .removeChildView(
            pestanaCerrada.vista
        );

    if (
        !pestanaCerrada.vista
            .webContents.isDestroyed()
    ) {
        pestanaCerrada.vista
            .webContents.close();
    }

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

    ventanaPrincipal.webContents.once(
        "did-finish-load",
        () => {
            console.log(
                "Interfaz principal lista."
            );

            ventanaPrincipal.center();
            ventanaPrincipal.show();
            ventanaPrincipal.restore();
            ventanaPrincipal.focus();

            crearPestana();
            enviarEstadoBarraLateral();
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
        .loadFile("index.html")
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

    ventanaPrincipal.on(
        "closed",
        () => {
            pestanas.forEach(
                (pestana) => {
                    if (
                        !pestana.vista
                            .webContents
                            .isDestroyed()
                    ) {
                        pestana.vista
                            .webContents
                            .close();
                    }
                }
            );

            pestanas = [];
            idPestanaActiva = null;
            barraLateralAbierta = false;
            ventanaPrincipal = null;
        }
    );
}

ipcMain.on(
    "nueva-pestana",
    () => {
        crearPestana();
    }
);

ipcMain.on(
    "activar-pestana",
    (_evento, id) => {
        activarPestana(
            Number(id)
        );
    }
);

ipcMain.on(
    "cerrar-pestana",
    (_evento, id) => {
        cerrarPestana(
            Number(id)
        );
    }
);

ipcMain.on(
    "navegar",
    (_evento, direccion) => {
        navegar(
            obtenerPestanaActiva(),
            direccion
        );
    }
);

ipcMain.on(
    "atras",
    () => {
        atras(
            obtenerPestanaActiva()
        );
    }
);

ipcMain.on(
    "adelante",
    () => {
        adelante(
            obtenerPestanaActiva()
        );
    }
);

ipcMain.on(
    "recargar",
    () => {
        recargar(
            obtenerPestanaActiva()
        );
    }
);

ipcMain.on(
    "inicio",
    () => {
        irAInicio(
            obtenerPestanaActiva()
        );
    }
);

ipcMain.on(
    "alternar-barra-lateral",
    () => {
        barraLateralAbierta =
            !barraLateralAbierta;

        ajustarVista();
        enviarEstadoBarraLateral();
    }
);

ipcMain.handle(
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

ipcMain.handle(
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

app.whenReady()
    .then(() => {
        console.log("Electron listo.");
        crearVentana();
    })
    .catch((error) => {
        console.error(
            "Error al iniciar Electron:",
            error
        );
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
