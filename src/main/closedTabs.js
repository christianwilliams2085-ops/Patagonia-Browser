function urlRecuperable(valor) {
    try {
        const url = new URL(valor);
        if (url.href === "about:blank") return url.href;
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
        return url.href;
    } catch { return null; }
}

function crearPestanasCerradas(limite = 10) {
    if (!Number.isInteger(limite) || limite < 1) throw new Error("Límite inválido.");
    const cerradas = [];
    return {
        guardar(pestana) {
            const url = urlRecuperable(pestana?.url);
            if (!url) return false;
            cerradas.push({
                url,
                titulo: String(pestana.titulo || new URL(url).hostname || "Pestaña cerrada").slice(0, 300)
            });
            if (cerradas.length > limite) cerradas.splice(0, cerradas.length - limite);
            return true;
        },
        recuperar() { return cerradas.pop() || null; },
        cantidad() { return cerradas.length; }
    };
}

module.exports = { crearPestanasCerradas, urlRecuperable };
