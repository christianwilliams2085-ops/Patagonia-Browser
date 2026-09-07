const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { incluirEnPaquete } = require("./package-files.cjs");

async function existe(ruta) {
    try { await fs.access(ruta); return true; }
    catch (error) { if (error.code === "ENOENT") return false; throw error; }
}

async function construir({ raiz = path.resolve(__dirname, ".."), plataforma = process.platform, arquitectura = process.arch } = {}) {
    if (plataforma !== "win32" || arquitectura !== "x64") {
        throw new Error("La versión portátil Windows x64 se compila en Windows con Node.js x64.");
    }
    const destino = path.join(raiz, "dist", "Patagonia Browser-win32-x64");
    const electron = path.join(raiz, "node_modules", "electron", "dist");
    const recursos = ["main.js", "preload.js", "renderer.js", "index.html", "LICENSE", "assets", "services", "src", "ui"];
    const paquete = JSON.parse(await fs.readFile(path.join(raiz, "package.json"), "utf8"));
    const motor = JSON.parse(await fs.readFile(path.join(raiz, "node_modules", "electron", "package.json"), "utf8"));
    const lock = JSON.parse(await fs.readFile(path.join(raiz, "package-lock.json"), "utf8"));
    if (!lock.packages || lock.packages[""]?.version !== paquete.version) {
        throw new Error("package-lock.json no coincide con el proyecto. Ejecutá npm install antes de compilar.");
    }
    const paquetes = [];
    for (const [nombre, datos] of Object.entries(lock.packages)) {
        if (!nombre.startsWith("node_modules/") || datos.dev) continue;
        if (nombre.split("/").includes("..")) throw new Error("Ruta de dependencia inválida.");
        if (await existe(path.join(raiz, nombre))) paquetes.push(nombre);
        else if (!datos.optional) throw new Error(`Falta la dependencia ${nombre}. Ejecutá npm ci.`);
    }
    // La compilación anterior sigue intacta si falta un recurso o hay un error de copia.
    for (const recurso of [...recursos, "ui/new-tab.html", "assets/patagonia-oficial.ico", "assets/patagonia-adblock.bin",
        "node_modules/electron/dist/electron.exe", "node_modules/@ghostery/adblocker-electron/package.json"]) {
        if (!await existe(path.join(raiz, recurso))) throw new Error(`Falta el recurso requerido: ${recurso}`);
    }
    const id = crypto.randomUUID();
    const temporal = path.join(raiz, "dist", `.patagonia-portable-${id}`);
    const anterior = `${destino}.anterior-${id}`;
    let respaldo = false;
    try {
        await fs.mkdir(path.dirname(temporal), { recursive: true });
        await fs.cp(electron, temporal, { recursive: true });
        await fs.rm(path.join(temporal, "resources", "default_app.asar"), { force: true });
        await fs.rename(path.join(temporal, "electron.exe"), path.join(temporal, "Patagonia Browser.exe"));
        const aplicacion = path.join(temporal, "resources", "app");
        await fs.mkdir(aplicacion, { recursive: true });
        for (const recurso of [...recursos, ...paquetes.sort()]) {
            await fs.cp(path.join(raiz, recurso), path.join(aplicacion, recurso), {
                recursive: true, force: true,
                filter: origen => incluirEnPaquete(path.relative(raiz, origen))
            });
        }
        const { name, version, description, main, author, license, type, dependencies } = paquete;
        await fs.writeFile(path.join(aplicacion, "package.json"), JSON.stringify({ name, version, description, main, author, license, type, dependencies }, null, 2) + "\n");
        const hash = async ruta => crypto.createHash("sha256").update(await fs.readFile(ruta)).digest("hex");
        await fs.writeFile(path.join(temporal, "build-info.json"), JSON.stringify({
            producto: "Patagonia Browser", version, electron: motor.version,
            plataforma, arquitectura, fecha: new Date().toISOString(),
            sha256Ejecutable: await hash(path.join(temporal, "Patagonia Browser.exe")),
            sha256CodigoPrincipal: await hash(path.join(aplicacion, "main.js"))
        }, null, 2) + "\n");
        await fs.writeFile(path.join(temporal, "LEEME.txt"), [
            "PATAGONIA BROWSER", "", "Abrí Patagonia Browser.exe para navegar.",
            "La aplicación guarda tus datos en tu perfil de Windows.",
            "Para trasladarla, mové toda esta carpeta.", ""
        ].join("\r\n"));
        if (await existe(destino)) { await fs.rename(destino, anterior); respaldo = true; }
        try { await fs.rename(temporal, destino); }
        catch (error) {
            if (respaldo) { await fs.rename(anterior, destino); respaldo = false; }
            throw error;
        }
        if (respaldo) await fs.rm(anterior, { recursive: true, force: true }).catch(() => {});
        console.log(`Aplicación portátil creada en:\n${destino}`);
        return destino;
    } finally { await fs.rm(temporal, { recursive: true, force: true }); }
}

if (require.main === module) construir().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
module.exports = { construir };
