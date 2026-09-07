const ETIQUETAS = Object.freeze({
    "clipboard-read": "leer el portapapeles",
    "clipboard-sanitized-write": "escribir en el portapapeles",
    "display-capture": "capturar la pantalla",
    fullscreen: "usar la pantalla completa",
    geolocation: "conocer tu ubicación",
    "idle-detection": "detectar si estás usando el equipo",
    keyboardLock: "capturar teclas especiales",
    mediaKeySystem: "reproducir contenido protegido",
    midi: "usar dispositivos MIDI",
    midiSysex: "usar dispositivos MIDI con acceso avanzado",
    notifications: "mostrar notificaciones",
    pointerLock: "capturar el puntero del mouse",
    "speaker-selection": "elegir un dispositivo de audio",
    "storage-access": "usar almacenamiento entre sitios",
    "top-level-storage-access": "usar almacenamiento relacionado entre sitios",
    "window-management": "administrar ventanas en otras pantallas"
});

function origenSeguro(valor) {
    try {
        const url = new URL(valor);
        if (url.username || url.password) return null;
        const local = url.protocol === "http:" && (url.hostname === "localhost" ||
            url.hostname.endsWith(".localhost") || /^127(?:\.\d{1,3}){3}$/.test(url.hostname) || url.hostname === "[::1]");
        return url.protocol === "https:" || local ? url.origin : null;
    } catch { return null; }
}

function tiposDeMedia(detalles = {}) {
    const tipos = Array.isArray(detalles.mediaTypes) ? detalles.mediaTypes : [detalles.mediaType];
    if (!tipos.length || tipos.some(tipo => tipo !== "audio" && tipo !== "video")) return [];
    return [...new Set(tipos)].sort();
}

function descripcionPermiso(permiso, detalles = {}) {
    if (permiso !== "media") return Object.hasOwn(ETIQUETAS, permiso) ? ETIQUETAS[permiso] : null;
    const tipos = tiposDeMedia(detalles);
    if (tipos.length === 2) return "usar la cámara y el micrófono";
    if (tipos[0] === "video") return "usar la cámara";
    if (tipos[0] === "audio") return "usar el micrófono";
    return null;
}

function clavesPermiso(origen, permiso, detalles = {}) {
    if (permiso !== "media") return [`${origen}|${permiso}`];
    const tipos = tiposDeMedia(detalles);
    return tipos.map(tipo => `${origen}|media|${tipo}`);
}

const MAX_SOLICITUDES = 8;
const MAX_RESPUESTAS = 16;

function registrarPermisos({ sesion, dialog, obtenerVentana, esPestanaPropia, esPestanaActiva }) {
    const decisiones = new Map();
    const pendientes = new Set();
    const vigiladas = new Map();
    const ventanasVigiladas = new WeakSet();
    const cola = [];
    let procesando = false;

    function contextoValido(contenido, permiso, detalles = {}, origenDeclarado) {
        if (!detalles || typeof detalles !== "object") return null;
        const fuentes = [detalles.securityOrigin, detalles.requestingUrl, origenDeclarado].filter(valor => valor !== undefined);
        const origenes = fuentes.map(origenSeguro);
        const origen = origenes[0];
        const descripcion = descripcionPermiso(permiso, detalles);
        if (!origen || origenes.some(valor => valor !== origen) || !descripcion) return null;
        if (detalles.embeddingOrigin !== undefined && origenSeguro(detalles.embeddingOrigin) !== origen) return null;
        if (contenido) {
            if (contenido.isDestroyed() || !esPestanaPropia(contenido) ||
                detalles.isMainFrame === false || origenSeguro(contenido.getURL()) !== origen) return null;
        } else if (permiso !== "notifications") return null;
        return { origen, descripcion, claves: clavesPermiso(origen, permiso, detalles) };
    }

    function decisionGuardada(contexto) {
        const valores = contexto.claves.map(clave => decisiones.get(clave));
        if (valores.every(valor => valor === true)) return true;
        if (valores.some(valor => valor === false)) return false;
        return undefined;
    }

    function responder(callback, valor) {
        try { callback(valor); }
        catch { console.error("No se pudo devolver una respuesta de permiso a la página."); }
    }

    function vigente(solicitud) {
        return !solicitud.finalizada && !solicitud.ventana.isDestroyed() &&
            Boolean(contextoValido(solicitud.contenido, solicitud.permiso, solicitud.detalles));
    }

    function finalizar(solicitud, valor, recordar = false) {
        if (solicitud.finalizada) return;
        solicitud.finalizada = true;
        if (recordar) {
            // Una decisión nueva no revoca otra capacidad aprobada previamente.
            solicitud.contexto.claves.forEach(clave => {
                if (!decisiones.has(clave)) decisiones.set(clave, valor);
            });
        }
        pendientes.delete(solicitud);
        const grupo = vigiladas.get(solicitud.contenido);
        grupo.solicitudes.delete(solicitud);
        if (!grupo.solicitudes.size) {
            for (const [evento, funcion] of grupo.eventos) solicitud.contenido.removeListener(evento, funcion);
            vigiladas.delete(solicitud.contenido);
        }
        solicitud.controlador?.abort();
        solicitud.callbacks.forEach(callback => responder(callback, valor));
    }

    function vigilar(solicitud) {
        const { contenido, ventana } = solicitud;
        let grupo = vigiladas.get(contenido);
        if (!grupo) {
            grupo = { solicitudes: new Set() };
            const cancelar = () => {
                for (const pendiente of [...grupo.solicitudes]) finalizar(pendiente, false);
            };
            const navegar = (evento, _url, mismaPagina, principal) => {
                if ((principal ?? evento.isMainFrame) && !(mismaPagina ?? evento.isSameDocument)) cancelar();
            };
            grupo.eventos = [["did-start-navigation", navegar], ["render-process-gone", cancelar], ["destroyed", cancelar]];
            grupo.eventos.forEach(([evento, funcion]) => contenido.on(evento, funcion));
            vigiladas.set(contenido, grupo);
        }
        grupo.solicitudes.add(solicitud);
        if (!ventanasVigiladas.has(ventana)) {
            ventanasVigiladas.add(ventana);
            ventana.once("closed", () => {
                for (const pendiente of [...pendientes]) {
                    if (pendiente.ventana === ventana) finalizar(pendiente, false);
                }
            });
        }
    }

    async function procesarCola() {
        if (procesando) return;
        procesando = true;
        try {
            while (cola.length) {
                const solicitud = cola.shift();
                if (solicitud.finalizada) continue;
                if (!vigente(solicitud) || !esPestanaActiva(solicitud.contenido)) {
                    finalizar(solicitud, false);
                    continue;
                }
                const guardada = decisionGuardada(solicitud.contexto);
                if (guardada !== undefined) { finalizar(solicitud, guardada); continue; }
                const faltantes = solicitud.contexto.claves.filter(clave => !decisiones.has(clave));
                const descripcion = solicitud.permiso === "media"
                    ? descripcionPermiso("media", { mediaTypes: faltantes.map(clave => clave.split("|").at(-1)) })
                    : solicitud.contexto.descripcion;
                solicitud.controlador = new AbortController();
                try {
                    const respuesta = await dialog.showMessageBox(solicitud.ventana, {
                        type: "question",
                        title: "Permiso del sitio",
                        message: `${solicitud.contexto.origen} quiere ${descripcion}.`,
                        detail: "La decisión se recordará para este sitio hasta que cierres Patagonia.",
                        buttons: ["Bloquear", "Permitir durante esta sesión"],
                        defaultId: 0,
                        cancelId: 0,
                        noLink: true,
                        signal: solicitud.controlador.signal
                    });
                    const valida = vigente(solicitud) && esPestanaActiva(solicitud.contenido);
                    finalizar(solicitud, valida && respuesta?.response === 1, valida && [0, 1].includes(respuesta?.response));
                } catch { finalizar(solicitud, false); }
            }
        } finally { procesando = false; }
    }

    sesion.setPermissionCheckHandler((contenido, permiso, origen, detalles) => {
        const contexto = contextoValido(contenido, permiso, detalles, origen);
        return contexto ? decisionGuardada(contexto) === true : false;
    });

    sesion.setPermissionRequestHandler((contenido, permiso, callback, detalles = {}) => {
        if (!contenido || detalles?.isMainFrame !== true) { responder(callback, false); return; }
        const contexto = contextoValido(contenido, permiso, detalles);
        if (!contexto) { responder(callback, false); return; }
        const guardada = decisionGuardada(contexto);
        if (guardada !== undefined) { responder(callback, guardada); return; }
        if (!esPestanaActiva(contenido)) { responder(callback, false); return; }
        const clave = contexto.claves.join(",");
        const existente = [...pendientes].find(solicitud => solicitud.contenido === contenido && solicitud.clave === clave);
        if (existente) {
            if (existente.callbacks.length < MAX_RESPUESTAS) existente.callbacks.push(callback);
            else responder(callback, false);
            return;
        }
        const ventana = obtenerVentana();
        if (!ventana || ventana.isDestroyed() || pendientes.size >= MAX_SOLICITUDES) { responder(callback, false); return; }
        const solicitud = { contenido, permiso, detalles: { ...detalles }, contexto, clave, ventana, callbacks: [callback], finalizada: false };
        pendientes.add(solicitud);
        vigilar(solicitud);
        cola.push(solicitud);
        void procesarCola();
    });

    function cambiarPestana() {
        for (const solicitud of [...pendientes]) {
            if (!esPestanaActiva(solicitud.contenido)) finalizar(solicitud, false);
        }
    }
    return { cantidadDecisiones: () => decisiones.size, cambiarPestana };
}

module.exports = { registrarPermisos, origenSeguro, descripcionPermiso };
