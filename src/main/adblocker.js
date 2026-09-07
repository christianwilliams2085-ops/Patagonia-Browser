const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { ElectronBlocker, Request } = require("@ghostery/adblocker-electron");

const TIPOS_RASTREADOR = new Set(["script", "xhr", "ping", "webSocket", "cspReport"]);
const INTERVALO_ACTUALIZACION = 7 * 24 * 60 * 60 * 1000;
const LIMITE_DESCARGA_MS = 15000;

function crearLoteScriptlets(scripts) {
    // Ghostery 2.18.2 entrega helpers con nombres repetidos (proxyApplyFn,
    // safeSelf...). Cada script necesita su propio ámbito léxico: si se
    // declaran globalmente, los proxies anteriores usan el helper siguiente
    // y Function.prototype.toString acaba llamándose recursivamente.
    const bloques = scripts.map((script, indice) => `
        try {
            (function () {
                ${script}
            }).call(globalThis);
        } catch (error) {
            fallos.push({ indice: ${indice}, mensaje: String(error?.message || error) });
        }
    `);
    return `(() => {
        const fallos = [];
        ${bloques.join("\n")}
        return fallos;
    })();`;
}

function dominioWeb(valor) {
    try {
        const url = new URL(valor);
        if (!["http:", "https:"].includes(url.protocol)) return "";
        return url.hostname.toLowerCase().replace(/^www\./, "");
    } catch {
        return "";
    }
}

function encontrarSitioPermitido(sitios, dominio) {
    if (!dominio) return "";
    return [...sitios].find(sitio => dominio === sitio || dominio.endsWith(`.${sitio}`)) || "";
}

function sitioEstaPermitido(sitios, dominio) {
    return Boolean(encontrarSitioPermitido(sitios, dominio));
}

function clasificarBloqueo(solicitud) {
    return solicitud?.isThirdParty && TIPOS_RASTREADOR.has(solicitud.type)
        ? "rastreadores"
        : "anuncios";
}

async function leerSitios(archivo) {
    try {
        const datos = JSON.parse(await fs.readFile(archivo, "utf8"));
        if (!Array.isArray(datos) || datos.some(valor => typeof valor !== "string" || !dominioWeb(`https://${valor}`))) {
            throw new Error("Formato inválido");
        }
        return new Set(datos.map(valor => valor.toLowerCase()));
    } catch (error) {
        if (error.code === "ENOENT") return new Set();
        console.error("No se pudieron leer las excepciones del bloqueador:", error.message);
        return new Set();
    }
}

async function guardarSitios(archivo, sitios) {
    const temporal = `${archivo}.${randomUUID()}.tmp`;
    try {
        await fs.mkdir(path.dirname(archivo), { recursive: true });
        await fs.writeFile(temporal, `${JSON.stringify([...sitios].sort(), null, 2)}\n`, "utf8");
        await fs.rename(temporal, archivo);
    } finally {
        await fs.rm(temporal, { force: true }).catch(() => {});
    }
}

async function cargarMotor(rutas) {
    const candidatas = [];
    for (const ruta of rutas) {
        try {
            candidatas.push({ ruta, fecha: (await fs.stat(ruta)).mtimeMs });
        } catch (error) {
            if (error.code !== "ENOENT") console.error("No se pudo revisar el motor de protección:", error.message);
        }
    }
    candidatas.sort((a, b) => b.fecha - a.fecha);
    for (const candidata of candidatas) {
        try {
            return ElectronBlocker.deserialize(new Uint8Array(await fs.readFile(candidata.ruta)));
        } catch (error) {
            console.error("No se pudo abrir un motor de protección guardado:", error.message);
        }
    }
    return null;
}

async function guardarMotor(archivo, motor) {
    const temporal = `${archivo}.${randomUUID()}.tmp`;
    try {
        await fs.mkdir(path.dirname(archivo), { recursive: true });
        await fs.writeFile(temporal, motor.serialize());
        await fs.rename(temporal, archivo);
    } finally {
        await fs.rm(temporal, { force: true }).catch(() => {});
    }
}

function crearProteccion({
    sesion,
    directorioDatos,
    rutaMotorIncluido,
    obtenerURLPrincipal,
    notificar,
    fetchImpl = globalThis.fetch,
    ahora = () => Date.now(),
    limiteDescargaMs = LIMITE_DESCARGA_MS
}) {
    const archivoMotor = path.join(directorioDatos, "patagonia-adblock.bin");
    const archivoSitios = path.join(directorioDatos, "proteccion-sitios.json");
    const contadores = new Map();
    let sitiosPermitidos = new Set();
    let bloqueador = null;
    let disponible = false;
    let actualizando = false;
    let avisoPendiente = null;
    let cerrada = false;
    let inicioPendiente = null;
    let colaSitios = Promise.resolve();
    let descargaActiva = null;

    function programarAviso() {
        if (cerrada || avisoPendiente) return;
        avisoPendiente = setTimeout(() => {
            avisoPendiente = null;
            notificar?.();
        }, 80);
    }

    function urlPrincipal(idContenido, alternativa = "") {
        return obtenerURLPrincipal?.(idContenido) || alternativa || "";
    }

    function permitidoPara(idContenido, alternativa = "") {
        return sitioEstaPermitido(sitiosPermitidos, dominioWeb(urlPrincipal(idContenido, alternativa)));
    }

    function permitidoParaDetalle(detalles) {
        const url = detalles.resourceType === "mainFrame"
            ? detalles.url
            : urlPrincipal(detalles.webContentsId, detalles.referrer);
        return sitioEstaPermitido(sitiosPermitidos, dominioWeb(url));
    }

    function registrar(solicitud) {
        if (!Number.isInteger(solicitud?.tabId) || solicitud.tabId <= 0 ||
            permitidoPara(solicitud.tabId, solicitud._originalRequestDetails?.referrer)) return;
        const datos = contadores.get(solicitud.tabId) || { anuncios: 0, rastreadores: 0 };
        datos[clasificarBloqueo(solicitud)]++;
        contadores.set(solicitud.tabId, datos);
        programarAviso();
    }

    function conectarMotor(nuevoBloqueador) {
        if (cerrada) return;
        const antesDeSolicitud = nuevoBloqueador.onBeforeRequest.bind(nuevoBloqueador);
        const alRecibirCabeceras = nuevoBloqueador.onHeadersReceived.bind(nuevoBloqueador);

        nuevoBloqueador.onBeforeRequest = (detalles, responder) => {
            if (permitidoParaDetalle(detalles)) responder({});
            else antesDeSolicitud(detalles, responder);
        };
        nuevoBloqueador.onHeadersReceived = (detalles, responder) => {
            if (permitidoParaDetalle(detalles)) responder({});
            else alRecibirCabeceras(detalles, responder);
        };
        nuevoBloqueador.onInjectCosmeticFilters = async (evento, _url, mensaje) => {
            try {
                const contenido = evento.sender;
                const marco = evento.senderFrame;
                if (!contenido || contenido.isDestroyed() || contenido.session !== sesion ||
                    !marco || marco.isDestroyed() || marco.detached || marco !== contenido.mainFrame) return;

                // La URL del marco es autoritativa. Nunca aplicar filtros de un
                // iframe, de una página interna o de otra sesión al documento principal.
                const url = marco.url;
                if (!dominioWeb(url) || permitidoPara(contenido.id, url)) return;
                const { hostname, domain } = Request.fromRawDetails({ url });
                const inicial = mensaje === undefined;
                const { active, styles, scripts } = nuevoBloqueador.getCosmeticsFilters({
                    domain, hostname, url,
                    classes: mensaje?.classes,
                    hrefs: mensaje?.hrefs,
                    ids: mensaje?.ids,
                    getBaseRules: inicial,
                    getInjectionRules: inicial,
                    getExtendedRules: false,
                    getRulesFromHostname: inicial,
                    getRulesFromDOM: !inicial,
                    callerContext: {
                        frameId: evento.frameId,
                        processId: evento.processId,
                        lifecycle: mensaje?.lifecycle
                    }
                });
                if (active === false) return;

                // Un único envío al marco que pidió los filtros. A diferencia
                // de webContents.executeJavaScript, no espera did-stop-loading
                // por cada script ni termina ejecutándolo en una página posterior.
                const trabajos = [];
                if (scripts.length) trabajos.push(async () => {
                    const fallos = await marco.executeJavaScript(crearLoteScriptlets(scripts));
                    if (Array.isArray(fallos) && fallos.length) {
                        console.error(`Protección: fallaron ${fallos.length} scriptlets en ${hostname}.`, fallos);
                    }
                });
                if (styles.length) trabajos.push(() => contenido.insertCSS(styles, { cssOrigin: "user" }));
                const resultados = await Promise.allSettled(trabajos.map(trabajo => Promise.resolve().then(trabajo)));
                for (const resultado of resultados) {
                    if (resultado.status === "rejected" && !contenido.isDestroyed() &&
                        !marco.isDestroyed() && !marco.detached) {
                        console.error("No se pudo aplicar un filtro de protección:", resultado.reason?.message);
                    }
                }
            } catch (error) {
                // El documento puede desaparecer mientras se atiende el IPC.
                // Resolver siempre el mensaje para no rechazar la promesa del preload.
                console.error("No se pudieron aplicar los filtros de protección:", error.message);
            }
        };
        nuevoBloqueador.on("request-blocked", registrar);
        nuevoBloqueador.on("request-redirected", registrar);
        nuevoBloqueador.enableBlockingInSession(sesion);
        bloqueador = nuevoBloqueador;
        disponible = true;
    }

    async function descargarMotor() {
        if (cerrada) throw new Error("La protección está cerrada.");
        const controlador = new AbortController();
        descargaActiva = controlador;
        let temporizador;
        let alAbortar;
        const cancelada = new Promise((_, rechazar) => {
            alAbortar = () => rechazar(controlador.signal.reason);
            controlador.signal.addEventListener("abort", alAbortar, { once: true });
            temporizador = setTimeout(() => controlador.abort(new Error("Se agotó el tiempo para descargar las listas de protección.")), limiteDescargaMs);
        });
        const fetchValidado = async url => {
            controlador.signal.throwIfAborted();
            const respuesta = await fetchImpl(url, { signal: controlador.signal });
            if (respuesta.ok === false) throw new Error(`La descarga de listas respondió HTTP ${respuesta.status}.`);
            const texto = await respuesta.text();
            controlador.signal.throwIfAborted();
            if (!texto.trim() || /^\s*(?:<!doctype|<html)/i.test(texto)) {
                throw new Error("La descarga no contiene una lista de protección válida.");
            }
            return { text: async () => texto };
        };
        try {
            return await Promise.race([ElectronBlocker.fromPrebuiltAdsAndTracking(fetchValidado), cancelada]);
        } finally {
            clearTimeout(temporizador);
            controlador.signal.removeEventListener("abort", alAbortar);
            controlador.abort();
            if (descargaActiva === controlador) descargaActiva = null;
        }
    }

    async function iniciarMotor() {
        sitiosPermitidos = await leerSitios(archivoSitios);
        let motor = await cargarMotor([archivoMotor, rutaMotorIncluido]);
        if (!motor && typeof fetchImpl === "function") {
            motor = await descargarMotor();
            if (cerrada) throw new Error("La protección está cerrada.");
            await guardarMotor(archivoMotor, motor).catch(error => {
                console.error("No se pudo guardar la copia de las listas de protección:", error.message);
            });
        }
        if (!motor) throw new Error("No hay listas de protección disponibles.");
        if (cerrada) throw new Error("La protección está cerrada.");
        conectarMotor(motor);
        notificar?.();
        return estado(0, "");
    }

    function iniciar() {
        if (cerrada) return Promise.reject(new Error("La protección está cerrada."));
        if (!inicioPendiente) {
            inicioPendiente = iniciarMotor().catch(error => {
                inicioPendiente = null;
                throw error;
            });
        }
        return inicioPendiente;
    }

    function estado(idContenido, url) {
        const dominio = dominioWeb(url);
        const permitido = sitioEstaPermitido(sitiosPermitidos, dominio);
        const datos = contadores.get(idContenido) || { anuncios: 0, rastreadores: 0 };
        return {
            disponible,
            sitio: dominio,
            activa: disponible && Boolean(dominio) && !permitido,
            permitida: permitido,
            anuncios: datos.anuncios,
            rastreadores: datos.rastreadores,
            total: datos.anuncios + datos.rastreadores
        };
    }

    function reiniciarPestana(idContenido) {
        if (idContenido) contadores.set(idContenido, { anuncios: 0, rastreadores: 0 });
        notificar?.();
    }

    function olvidarPestana(idContenido) {
        contadores.delete(idContenido);
    }

    function alternarSitio(idContenido, url) {
        const dominio = dominioWeb(url);
        if (!dominio) return Promise.reject(new Error("Abrí una página web para cambiar esta protección."));
        const tarea = colaSitios.then(async () => {
            if (cerrada || !disponible) throw new Error("La protección todavía no está disponible.");
            const nuevos = new Set(sitiosPermitidos);
            const coincidencia = encontrarSitioPermitido(nuevos, dominio);
            if (coincidencia) nuevos.delete(coincidencia);
            else nuevos.add(dominio);
            await guardarSitios(archivoSitios, nuevos);
            // Confirmar el cambio sólo después de guardar. Un error de disco
            // no debe desactivar la protección mientras la UI informa un fallo.
            sitiosPermitidos = nuevos;
            reiniciarPestana(idContenido);
            return estado(idContenido, url);
        });
        colaSitios = tarea.catch(() => {});
        return tarea;
    }

    async function esperar() {
        let pendiente;
        do { pendiente = colaSitios; await pendiente; } while (pendiente !== colaSitios);
    }

    async function actualizarSiHaceFalta() {
        if (cerrada || actualizando || typeof fetchImpl !== "function") return false;
        actualizando = true;
        try {
            try {
                const fecha = (await fs.stat(archivoMotor)).mtimeMs;
                if (ahora() - fecha < INTERVALO_ACTUALIZACION) return false;
            } catch (error) {
                if (error.code !== "ENOENT") return false;
            }
            const actualizado = await descargarMotor();
            if (cerrada) return false;
            await guardarMotor(archivoMotor, actualizado);
            if (!cerrada && !disponible) {
                conectarMotor(actualizado);
                notificar?.();
            }
            return true;
        } catch (error) {
            if (!cerrada) console.error("No se pudieron actualizar las listas de protección:", error.message);
            return false;
        } finally {
            actualizando = false;
        }
    }

    function cerrar() {
        cerrada = true;
        descargaActiva?.abort(new Error("La protección está cerrada."));
        if (avisoPendiente) clearTimeout(avisoPendiente);
        avisoPendiente = null;
        if (bloqueador?.isBlockingEnabled(sesion)) bloqueador.disableBlockingInSession(sesion);
        bloqueador = null;
        disponible = false;
    }

    return { iniciar, estado, reiniciarPestana, olvidarPestana, alternarSitio, actualizarSiHaceFalta, esperar, cerrar };
}

module.exports = { crearProteccion, crearLoteScriptlets, dominioWeb, encontrarSitioPermitido, sitioEstaPermitido, clasificarBloqueo };
