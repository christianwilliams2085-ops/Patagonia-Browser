function mensajeError(codigo) {
    if (codigo === -106) return "No hay conexión a Internet. Revisá tu conexión y volvé a intentar.";
    if (codigo === -105) return "No encontramos este sitio. Revisá que la dirección esté bien escrita.";
    if (codigo === -7 || codigo === -118) return "El sitio tardó demasiado en responder. Podés volver a intentarlo.";
    if (codigo <= -200 && codigo > -300) return "No se pudo establecer una conexión segura con este sitio. Probá más tarde.";
    return "No pudimos cargar esta página. Revisá la dirección o intentá nuevamente.";
}

function registrarErroresCarga(pestana, actualizar) {
    const contenido = pestana.vista.webContents;
    function iniciar(_evento, url, _mismaPagina, principal) {
        if (!principal) return;
        pestana.url = url;
        pestana.errorCarga = null;
        pestana.vista.setVisible(true);
        actualizar();
    }
    contenido.on("did-start-navigation", iniciar);
    contenido.on("did-redirect-navigation", iniciar);
    contenido.on("did-fail-load", (_evento, codigo, _descripcion, url, principal) => {
        // Las cancelaciones y los fallos de marcos secundarios no son errores de página.
        if (!principal || codigo === -3 || contenido.isDestroyed()) return;
        if (url && pestana.url !== url) return;
        pestana.errorCarga = { url: url || pestana.url, mensaje: mensajeError(codigo) };
        pestana.cargando = false;
        pestana.titulo = "No se pudo cargar la página";
        pestana.favicon = "";
        pestana.vista.setVisible(false);
        actualizar();
    });
}

module.exports = { registrarErroresCarga, mensajeError };
