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

    if (/^https?:\/\//i.test(texto)) {
        return texto;
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

function navegar(pestana, direccion) {
    if (!pestana) {
        return;
    }

    return pestana.vista.webContents.loadURL(
        prepararDireccion(direccion)
    ).catch(() => {
        // did-fail-load muestra el error en la interfaz de la pestaña.
    });
}

function atras(pestana) {
    const historial =
        pestana?.vista.webContents.navigationHistory;

    if (historial?.canGoBack()) {
        historial.goBack();
    }
}

function adelante(pestana) {
    const historial =
        pestana?.vista.webContents.navigationHistory;

    if (historial?.canGoForward()) {
        historial.goForward();
    }
}

function recargar(pestana) {
    if (pestana?.errorCarga) {
        return navegar(pestana, pestana.errorCarga.url);
    }
    pestana?.vista.webContents.reload();
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
    irAInicio
};
