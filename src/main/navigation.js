const {
    PAGINA_INICIO
} = require("../shared/constants");

function prepararDireccion(direccion) {
    const texto = String(
        direccion || ""
    ).trim();

    if (!texto) {
        return PAGINA_INICIO;
    }

    if (texto.toLowerCase() === "about:blank") return "about:blank";

    if (/^https?:\/\//i.test(texto)) {
        return texto;
    }

    // Los servidores de desarrollo locales suelen usar HTTP y un puerto.
    if (/^(?:localhost|(?:[a-z0-9-]+\.)+localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(texto)) {
        return `http://${texto}`;
    }

    if (
        texto.includes(" ") ||
        !texto.includes(".")
    ) {
        return (
            "https://www.google.com/search?q=" +
            encodeURIComponent(texto)
        );
    }

    return `https://${texto}`;
}

function obtenerContenido(pestana) {
    // La vista puede perder webContents al destruirse la página, incluso
    // mientras la pestaña aún forma parte de la sesión que se está cerrando.
    const contenido = pestana?.vista?.webContents;
    return contenido && !contenido.isDestroyed() ? contenido : null;
}

function estadoNavegacion(pestana) {
    const historial = obtenerContenido(pestana)?.navigationHistory;
    return {
        puedeRetroceder: Boolean(historial?.canGoBack()),
        puedeAvanzar: Boolean(historial?.canGoForward())
    };
}

function navegar(pestana, direccion) {
    const contenido = obtenerContenido(pestana);
    if (!contenido) return;

    return contenido.loadURL(
        prepararDireccion(direccion)
    ).catch(() => {
        // did-fail-load muestra el error en la interfaz de la pestaña.
    });
}

function atras(pestana) {
    const historial =
        obtenerContenido(pestana)?.navigationHistory;

    if (historial?.canGoBack()) {
        historial.goBack();
    }
}

function adelante(pestana) {
    const historial =
        obtenerContenido(pestana)?.navigationHistory;

    if (historial?.canGoForward()) {
        historial.goForward();
    }
}

function recargar(pestana) {
    if (pestana?.errorCarga) {
        return navegar(pestana, pestana.errorCarga.url);
    }
    obtenerContenido(pestana)?.reload();
}

function detener(pestana) {
    const contenido = obtenerContenido(pestana);
    if (!contenido || !contenido.isLoading()) return false;
    contenido.stop();
    pestana.cargando = false;
    // Una navegación cancelada puede dejar visible la página anterior.
    if (!pestana.errorCarga) pestana.url = contenido.getURL() || "about:blank";
    return true;
}

function irAInicio(pestana) {
    return navegar(pestana, PAGINA_INICIO);
}

module.exports = {
    prepararDireccion,
    navegar,
    atras,
    adelante,
    recargar,
    detener,
    obtenerContenido,
    estadoNavegacion,
    irAInicio
};
