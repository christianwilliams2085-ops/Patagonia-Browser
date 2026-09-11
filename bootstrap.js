const { ElectronBlocker } = require("@ghostery/adblocker-electron");
const { instalarCompatibilidadGhostery } = require("./src/main/siteCompatibility");

// Aplicar la compatibilidad antes de que main.js cree el motor de protección.
instalarCompatibilidadGhostery(ElectronBlocker);

require("./main.js");
