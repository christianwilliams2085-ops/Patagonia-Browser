const Module = require("node:module");
const path = require("node:path");

function prepararIntegracion(original) {
    const salto = original.includes("\r\n") ? "\r\n" : "\n";
    const argumentos = `                        '-NoDefaultExcludes'${salto}                    ];`;
    const ejecutable = "                    cmd = path.join(vendorPath, 'nuget.exe');";
    if (!original.includes(argumentos) || !original.includes(ejecutable)) {
        throw new Error("La versión de electron-winstaller no coincide con la integración NuGet esperada.");
    }
    return original.replace(argumentos,
        `                        '-NoDefaultExcludes',${salto}                        '-ConfigFile', process.env.PATAGONIA_NUGET_CONFIG${salto}                    ];`)
        .replace(ejecutable, "                    cmd = process.env.PATAGONIA_NUGET_EXE;");
}

function instalarIntegracion() {
    const destino = path.resolve(__dirname, "../node_modules/electron-winstaller/lib/index.js");
    const compilar = Module.prototype._compile;
    Module.prototype._compile = function (contenido, archivo) {
        if (path.resolve(archivo) === destino) {
            // La adaptación vive solamente en el proceso de compilación.
            // Interrumpirlo nunca deja node_modules modificado.
            Module.prototype._compile = compilar;
            return compilar.call(this, prepararIntegracion(contenido), archivo);
        }
        return compilar.call(this, contenido, archivo);
    };
}

if (process.env.PATAGONIA_NUGET_EXE && process.env.PATAGONIA_NUGET_CONFIG) instalarIntegracion();
module.exports = { prepararIntegracion };
