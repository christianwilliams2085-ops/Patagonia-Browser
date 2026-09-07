// Comprueba Electron sin cargar Patagonia ni acceder a su perfil habitual.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

if (!process.versions.electron) {
    const { spawn } = require("node:child_process");
    const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "patagonia-diagnostico-"));
    const hijo = spawn(require("electron"), [__filename, perfil], {
        windowsHide: true,
        stdio: "inherit"
    });
    console.log("Comprobando el motor con una página local y un perfil temporal.");
    let agotado = false;
    const limite = setTimeout(() => {
        agotado = true;
        console.error("El diagnóstico superó el límite de 15 segundos.");
        hijo.kill();
    }, 15000);
    hijo.on("error", error => {
        clearTimeout(limite);
        console.error("No se pudo iniciar Electron:", error.message);
        process.exitCode = 1;
    });
    hijo.on("exit", codigo => {
        clearTimeout(limite);
        process.exitCode = codigo === 0 && !agotado ? 0 : 1;
        console.log(process.exitCode === 0
            ? "Electron cargó correctamente. El siguiente paso es probar Patagonia con npm start."
            : "Electron no pudo completar la carga mínima. El fallo ocurre sin ejecutar Patagonia.");
        console.log("Perfil temporal conservado para diagnóstico:", perfil);
    });
} else {
    const { app, BrowserWindow } = require("electron");
    app.setPath("userData", process.argv[2]);
    app.on("child-process-gone", (_evento, detalle) => {
        console.error("Proceso auxiliar:", JSON.stringify({
            tipo: detalle.type, motivo: detalle.reason, codigo: detalle.exitCode
        }));
    });
    app.whenReady().then(async () => {
        const ventana = new BrowserWindow({
            show: false,
            webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false }
        });
        ventana.webContents.on("render-process-gone", (_evento, detalle) => {
            console.error("Proceso de página:", JSON.stringify(detalle));
        });
        try {
            await ventana.loadURL("data:text/html,<title>Diagnostico Patagonia</title><h1>OK</h1>");
            const titulo = await ventana.webContents.executeJavaScript("document.title");
            if (titulo !== "Diagnostico Patagonia") throw new Error("Contenido inesperado.");
            console.log("Página mínima cargada y JavaScript verificado.");
            app.exit(0);
        } catch (error) {
            console.error("Falló la página mínima:", error.code || error.message);
            app.exit(1);
        }
    }).catch(error => {
        console.error("Falló la inicialización:", error.message);
        app.exit(1);
    });
}
