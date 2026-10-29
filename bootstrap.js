// Squirrel debe atender instalacion/desinstalacion antes de cargar servicios.
// Los paquetes MSIX son administrados por Windows, no por Squirrel.
if (!process.windowsStore && require("electron-squirrel-startup")) {
    require("electron").app.quit();
    return;
}

const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const { instalarCompatibilidadGhostery } = require("./src/main/siteCompatibility");

// Aplicar la compatibilidad antes de que main.js cree el motor de protección.
instalarCompatibilidadGhostery(ElectronBlocker);

require("./main.js");

