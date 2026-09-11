const DOMINIOS_SIN_SCRIPTLETS = new Set([
    "chatgpt.com",
    "chat.openai.com",
    "openai.com",
    "youtube.com",
    "youtu.be"
]);

function normalizarDominio(hostname) {
    return String(hostname || "")
        .toLowerCase()
        .replace(/^www\./, "")
        .replace(/\.$/, "");
}

function requiereCompatibilidad(hostname) {
    const dominio = normalizarDominio(hostname);
    if (!dominio) return false;
    return [...DOMINIOS_SIN_SCRIPTLETS].some(
        sitio => dominio === sitio || dominio.endsWith(`.${sitio}`)
    );
}

function instalarCompatibilidadGhostery(ElectronBlocker) {
    const prototipo = ElectronBlocker?.prototype;
    if (!prototipo || typeof prototipo.getCosmeticsFilters !== "function") return;
    if (prototipo.__patagoniaCompatibilidadInstalada) return;

    const original = prototipo.getCosmeticsFilters;
    prototipo.getCosmeticsFilters = function (opciones = {}) {
        const resultado = original.call(this, opciones);
        if (!requiereCompatibilidad(opciones.hostname)) return resultado;

        // Los filtros de red siguen activos. Sólo evitamos scriptlets de uBO/
        // EasyList en aplicaciones que dependen fuertemente de sus propios
        // proxies de JavaScript (ChatGPT y YouTube).
        return { ...resultado, scripts: [] };
    };

    Object.defineProperty(prototipo, "__patagoniaCompatibilidadInstalada", {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
    });
}

module.exports = {
    DOMINIOS_SIN_SCRIPTLETS,
    normalizarDominio,
    requiereCompatibilidad,
    instalarCompatibilidadGhostery
};
