const path = require("node:path");
const { incluirEnPaquete } = require("./scripts/package-files.cjs");

module.exports = {
    outDir: "out-oficial",
    packagerConfig: {
        asar: true,
        executableName: "Patagonia Browser",
        icon: path.join(__dirname, "assets", "patagonia-oficial.ico"),
        download: {
            cacheRoot: path.join(__dirname, ".electron-cache")
        },
        ignore: ruta => !incluirEnPaquete(ruta)
    },
    makers: [
        {
            name: "@electron-forge/maker-squirrel",
            config: {
                name: "PatagoniaBrowser",
                authors: "Patagonia Browser Project",
                description: "Navegador de escritorio rápido, privado y sencillo.",
                setupExe: "Patagonia-Browser-Setup.exe",
                setupIcon: path.join(__dirname, "assets", "patagonia-oficial.ico")
            }
        }
    ]
};
