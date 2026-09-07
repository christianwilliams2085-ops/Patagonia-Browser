const PREFERENCIAS_WEB = Object.freeze({
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true
});

function destinoPermitido(valor) {
    try {
        const url = new URL(valor);
        return ["http:", "https:"].includes(url.protocol) ||
            url.href === "about:blank" ||
            (url.protocol === "blob:" && /^https?:\/\//.test(url.origin));
    } catch { return false; }
}

function opcionesDeCarga(detalle) {
    const opciones = { httpReferrer: detalle.referrer };
    if (detalle.postBody) {
        const { data, contentType, boundary } = detalle.postBody;
        opciones.postData = data;
        opciones.extraHeaders = `Content-Type: ${contentType}${boundary ? `; boundary=${boundary}` : ""}`;
    }
    return opciones;
}

function registrarAperturas({ contenido, crearVista, agregarPestana, puedeAbrir }) {
    contenido.setWindowOpenHandler(detalle => {
        if (!puedeAbrir() || !destinoPermitido(detalle.url)) return { action: "deny" };
        return {
            action: "allow",
            outlivesOpener: true,
            overrideBrowserWindowOptions: { webPreferences: PREFERENCIAS_WEB },
            createWindow(opciones) {
                // Conservamos el WebContents nativo para no repetir cargas ni perder POST/opener.
                const vista = crearVista({
                    webContents: opciones.webContents,
                    webPreferences: { ...opciones.webPreferences, ...PREFERENCIAS_WEB }
                });
                agregarPestana(detalle.url, {
                    vista,
                    activar: detalle.disposition !== "background-tab",
                    cargar: !opciones.webContents,
                    opcionesCarga: opcionesDeCarga(detalle)
                });
                return vista.webContents;
            }
        };
    });
}

module.exports = { registrarAperturas, destinoPermitido, PREFERENCIAS_WEB };
