const archivos = new Set(["bootstrap.js", "main.js", "preload.js", "renderer.js", "index.html", "package.json", "LICENSE"]);
const carpetas = new Set(["assets", "services", "src", "ui", "node_modules"]);

function incluirEnPaquete(ruta) {
    const relativa = ruta.replace(/\\/g, "/").replace(/^\/+/, "");
    if (!relativa) return true;
    const partes = relativa.split("/");
    if (partes.includes("..")) return false;
    if (partes.length === 1 && archivos.has(relativa)) return true;
    if (!carpetas.has(partes[0])) return false;
    if (partes[0] === "node_modules") return true; // Forge elimina las dependencias de desarrollo.
    return !partes.some(parte => parte.startsWith(".")) && !/\.(?:zip|bak|tmp|log)$/i.test(relativa);
}

module.exports = { incluirEnPaquete };
