const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const raiz = path.resolve(__dirname, "..");
const perfil = path.join(raiz, ".installer-profile");
const configuracionNuGet = path.join(__dirname, "NuGet.Config");
const moduloInstalador = path.join(raiz, "node_modules", "electron-winstaller", "lib", "index.js");
const herramientaNuGet = path.join(raiz, ".installer-tools", "nuget-7.9.0.exe");
const urlNuGet = "https://dist.nuget.org/win-x86-commandline/v7.9.0/nuget.exe";
const hashNuGet = "992d70cac5b06c38efec91806caba64cdcc07e6d963a0959dbbbaf264d33b800";

function calcularHash(ruta) {
    return crypto.createHash("sha256").update(fs.readFileSync(ruta)).digest("hex");
}

async function asegurarNuGet() {
    if (fs.existsSync(herramientaNuGet) && calcularHash(herramientaNuGet) === hashNuGet) return;
    const respuesta = await fetch(urlNuGet, { signal: AbortSignal.timeout(30000) });
    if (!respuesta.ok) throw new Error(`No se pudo descargar NuGet: HTTP ${respuesta.status}`);
    const datos = Buffer.from(await respuesta.arrayBuffer());
    if (crypto.createHash("sha256").update(datos).digest("hex") !== hashNuGet) {
        throw new Error("La herramienta NuGet descargada no superó la comprobación de integridad.");
    }
    fs.mkdirSync(path.dirname(herramientaNuGet), { recursive: true });
    const temporal = `${herramientaNuGet}.${crypto.randomUUID()}.tmp`;
    try { fs.writeFileSync(temporal, datos); fs.renameSync(temporal, herramientaNuGet); }
    finally { fs.rmSync(temporal, { force: true }); }
}

for (const carpeta of ["NuGet", "packages", "http-cache", "plugins-cache"]) {
    fs.mkdirSync(path.join(perfil, carpeta), { recursive: true });
}

async function construir() {
    if (process.platform !== "win32") throw new Error("El instalador se compila en Windows.");
    await asegurarNuGet();

    const { prepararIntegracion } = require("./winstaller-hook.cjs");
    prepararIntegracion(fs.readFileSync(moduloInstalador, "utf8"));
    const resultado = spawnSync(process.execPath, [
            "--require", path.join(__dirname, "winstaller-hook.cjs"),
            path.join(raiz, "node_modules", "@electron-forge", "cli", "dist", "electron-forge.js"),
            "make",
            "--platform=win32",
            "--arch=x64"
        ], {
            cwd: raiz,
            env: {
                ...process.env,
                APPDATA: perfil,
                NUGET_PACKAGES: path.join(perfil, "packages"),
                NUGET_HTTP_CACHE_PATH: path.join(perfil, "http-cache"),
                NUGET_PLUGINS_CACHE_PATH: path.join(perfil, "plugins-cache"),
                SQUIRREL_TEMP: path.join(perfil, "SquirrelTemp"),
                PATAGONIA_NUGET_CONFIG: configuracionNuGet,
                PATAGONIA_NUGET_EXE: herramientaNuGet
            },
            stdio: "inherit"
        });

    if (resultado.error) throw resultado.error;
    process.exitCode = resultado.status ?? 1;
}

construir().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
