function esInterfazPropia(evento, ventana) {
    return Boolean(ventana && !ventana.isDestroyed() &&
        evento.sender === ventana.webContents &&
        evento.senderFrame === ventana.webContents.mainFrame);
}

function crearIPCInterfaz(ipcMain, obtenerVentana) {
    return {
        on(canal, accion) {
            ipcMain.on(canal, (evento, ...args) => {
                if (esInterfazPropia(evento, obtenerVentana())) accion(evento, ...args);
            });
        },
        handle(canal, accion) {
            ipcMain.handle(canal, (evento, ...args) => {
                if (!esInterfazPropia(evento, obtenerVentana())) {
                    return { correcto: false, error: "Acceso no permitido." };
                }
                return accion(evento, ...args);
            });
        }
    };
}

function protegerInterfaz(contenido) {
    // Las páginas se cargan en las pestañas; la interfaz privilegiada permanece local.
    contenido.on("will-navigate", evento => evento.preventDefault());
    contenido.setWindowOpenHandler(() => ({ action: "deny" }));
}

module.exports = { esInterfazPropia, crearIPCInterfaz, protegerInterfaz };
