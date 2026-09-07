const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { ElectronBlocker } = require("@ghostery/adblocker-electron");

async function construir({ destino = path.join(__dirname, "../assets/patagonia-adblock.bin"), fetchImpl = globalThis.fetch } = {}) {
    console.log("Actualizando las listas de anuncios y rastreadores...");
    const signal = AbortSignal.timeout(30000);
    const fetchValidado = async url => {
        signal.throwIfAborted();
        const respuesta = await fetchImpl(url, { signal });
        if (!respuesta.ok) throw new Error(`No se pudieron descargar las listas: HTTP ${respuesta.status}`);
        const texto = await respuesta.text();
        if (!texto.trim() || /^\s*(?:<!doctype|<html)/i.test(texto)) throw new Error("La descarga no contiene listas de protección válidas.");
        return { text: async () => texto };
    };
    const bloqueador = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetchValidado);
    const temporal = `${destino}.${randomUUID()}.tmp`;
    await fs.mkdir(path.dirname(destino), { recursive: true });
    try { await fs.writeFile(temporal, bloqueador.serialize()); await fs.rename(temporal, destino); }
    finally { await fs.rm(temporal, { force: true }); }
    console.log(`Motor de protección creado (${Math.ceil((await fs.stat(destino)).size / 1024)} KB).`);
}
if (require.main === module) construir().catch(error => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
});
module.exports = { construir };
