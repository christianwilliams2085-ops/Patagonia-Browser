function registrarInstanciaUnica(app, obtenerVentana) {
    if (!app.requestSingleInstanceLock()) {
        app.quit();
        return false;
    }
    app.on("second-instance", () => {
        const ventana = obtenerVentana();
        if (!ventana || ventana.isDestroyed()) return;
        if (ventana.isMinimized()) ventana.restore();
        ventana.show();
        ventana.focus();
    });
    return true;
}

const cierresPendientes = new WeakMap();

function cerrarContenido({ contenido, ventana, dialog }) {
    if (!contenido || contenido.isDestroyed()) return Promise.resolve(true);
    if (cierresPendientes.has(contenido)) return cierresPendientes.get(contenido);
    if (!ventana || ventana.isDestroyed()) return Promise.resolve(false);
    let resolver;
    let terminada = false;
    let consultando = false;
    const controlador = new AbortController();
    const resultado = new Promise(resolve => { resolver = resolve; });
    const finalizar = valor => {
        if (terminada) return;
        terminada = true;
        contenido.removeListener("destroyed", alCerrar);
        contenido.removeListener("did-start-navigation", alNavegar);
        contenido.removeListener("will-prevent-unload", alPrevenir);
        ventana.removeListener("closed", alCerrarVentana);
        controlador.abort();
        cierresPendientes.delete(contenido);
        resolver(valor);
    };
    const alCerrar = () => finalizar(true);
    const alCerrarVentana = () => finalizar(false);
    const alNavegar = (_evento, _url, _mismaPagina, principal) => {
        if (principal) finalizar(false);
    };
    const alPrevenir = () => {
        if (consultando || terminada) return;
        consultando = true;
        const marco = contenido.mainFrame;
        const url = contenido.getURL();
        // Electron cancela inicialmente el cierre. Sólo se fuerza tras la
        // decisión explícita, y nunca sobre un documento que haya cambiado.
        Promise.resolve().then(() => dialog.showMessageBox(ventana, {
            type: "warning",
            title: "Cambios sin guardar",
            message: "Esta página indica que tiene cambios sin guardar.",
            detail: "Si la cerrás, esos cambios pueden perderse.",
            buttons: ["Volver a la página", "Cerrar sin guardar"],
            defaultId: 0, cancelId: 0, noLink: true,
            signal: controlador.signal
        })).then(respuesta => {
            if (terminada) return;
            if (respuesta?.response !== 1 || contenido.isDestroyed() || ventana.isDestroyed() ||
                contenido.mainFrame !== marco || contenido.getURL() !== url) {
                finalizar(false);
                return;
            }
            contenido.close({ waitForBeforeUnload: false });
        }).catch(() => finalizar(false));
    };
    cierresPendientes.set(contenido, resultado);
    contenido.once("destroyed", alCerrar);
    contenido.on("did-start-navigation", alNavegar);
    contenido.on("will-prevent-unload", alPrevenir);
    ventana.once("closed", alCerrarVentana);
    try { contenido.close({ waitForBeforeUnload: true }); }
    catch { finalizar(false); }
    return resultado;
}

function registrarCierre({ ventana, dialog, contarDescargas, guardarDatos = async () => {}, cerrarPestanas = async () => true }) {
    let esperando = false;
    let aprobado = false;
    ventana.on("close", evento => {
        if (aprobado) {
            aprobado = false;
            return;
        }
        evento.preventDefault();
        if (esperando) return;
        esperando = true;
        Promise.resolve().then(async () => {
            const cantidad = contarDescargas();
            if (cantidad) {
                const { response } = await dialog.showMessageBox(ventana, {
                    type: "question",
                    title: "Descargas en curso",
                    message: `Todavía hay ${cantidad} descarga(s) en curso.`,
                    detail: "Si cerrás Patagonia, las descargas pendientes se interrumpen.",
                    buttons: ["Seguir descargando", "Cerrar Patagonia"],
                    defaultId: 0,
                    cancelId: 0,
                    noLink: true
                });
                if (response !== 1) return;
            }
            while (!ventana.isDestroyed()) {
                try {
                    await guardarDatos();
                } catch {
                    if (ventana.isDestroyed()) return;
                    const { response } = await dialog.showMessageBox(ventana, {
                        type: "warning",
                        title: "No pudimos guardar los datos",
                        message: "No se pudieron guardar todos los cambios de Patagonia.",
                        detail: "Podés reintentar o volver a Patagonia. Si cerrás sin guardar, el próximo inicio puede recuperar una sesión anterior.",
                        buttons: ["Volver a Patagonia", "Reintentar", "Cerrar sin guardar"],
                        defaultId: 0,
                        cancelId: 0,
                        noLink: true
                    });
                    if (response === 1) continue;
                    if (response !== 2) return;
                }
                if (!ventana.isDestroyed() && await cerrarPestanas()) {
                    aprobado = true;
                    ventana.close();
                }
                return;
            }
        }).catch(() => {
            console.error("No se pudo completar el cierre. La ventana sigue abierta.");
        }).finally(() => { esperando = false; });
    });
}

module.exports = { registrarInstanciaUnica, registrarCierre, cerrarContenido };
