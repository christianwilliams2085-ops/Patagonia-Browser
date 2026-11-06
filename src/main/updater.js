// Actualización automática: busca la última versión de escritorio publicada en
// GitHub Releases y deja que Squirrel la descargue e instale.
const fs = require("node:fs");
const path = require("node:path");

const REPOSITORIO = "Roma-69/Patagonia-Browser";
const API_RELEASES = `https://api.github.com/repos/${REPOSITORIO}/releases?per_page=20`;
const INTERVALO = 6 * 60 * 60 * 1000;
const PRIMERA_BUSQUEDA = 30 * 1000;

function leerVersion(texto) {
    const partes = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(texto || "").trim());
    return partes ? partes.slice(1).map(Number) : null;
}

function compararVersiones(a, b) {
    const x = leerVersion(a);
    const y = leerVersion(b);
    if (!x || !y) return 0;
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
    return 0;
}

// Sólo releases de escritorio publicados (vX.Y.Z) que traen los paquetes de Squirrel.
function elegirRelease(releases, versionActual) {
    if (!Array.isArray(releases)) return null;
    let mejor = null;
    for (const release of releases) {
        if (!release || release.draft || release.prerelease) continue;
        if (!/^v\d+\.\d+\.\d+$/.test(release.tag_name || "")) continue;
        const nombres = (release.assets || []).map(asset => asset?.name || "");
        if (!nombres.includes("RELEASES") || !nombres.some(nombre => /-full\.nupkg$/i.test(nombre))) continue;
        if (compararVersiones(release.tag_name, versionActual) <= 0) continue;
        if (!mejor || compararVersiones(release.tag_name, mejor.tag_name) > 0) mejor = release;
    }
    return mejor ? { tag: mejor.tag_name, version: mejor.tag_name.slice(1) } : null;
}

function instaladoConSquirrel(execPath, existe = fs.existsSync) {
    return existe(path.join(path.dirname(path.dirname(execPath)), "Update.exe"));
}

function crearActualizador({
    autoUpdater, fetch, versionActual, habilitado, notificar,
    temporizador = setTimeout, intervalo = INTERVALO, primera = PRIMERA_BUSQUEDA
}) {
    let estado = { estado: "inactivo", version: "" };
    let ocupado = false;
    let siguiente = null;

    function cambiar(nuevo) {
        estado = { ...estado, ...nuevo };
        notificar({ ...estado });
    }

    autoUpdater.on("update-downloaded", () => cambiar({ estado: "lista" }));
    autoUpdater.on("update-not-available", () => { if (estado.estado !== "lista") cambiar({ estado: "al-dia" }); });
    autoUpdater.on("error", () => { if (estado.estado !== "lista") cambiar({ estado: "error" }); ocupado = false; });

    async function buscar() {
        if (ocupado || estado.estado === "lista" || !habilitado()) return estado;
        ocupado = true;
        try {
            cambiar({ estado: "buscando" });
            const respuesta = await fetch(API_RELEASES, {
                headers: { Accept: "application/vnd.github+json", "User-Agent": "Patagonia-Browser" },
                signal: AbortSignal.timeout(15000)
            });
            if (!respuesta.ok) throw new Error(`GitHub respondió ${respuesta.status}`);
            const release = elegirRelease(await respuesta.json(), versionActual);
            if (!release) {
                cambiar({ estado: "al-dia", version: "" });
                return estado;
            }
            cambiar({ estado: "descargando", version: release.version });
            autoUpdater.setFeedURL({ url: `https://github.com/${REPOSITORIO}/releases/download/${release.tag}` });
            autoUpdater.checkForUpdates();
        } catch {
            cambiar({ estado: "error" });
        } finally {
            ocupado = false;
        }
        return estado;
    }

    function programar(espera) {
        siguiente = temporizador(() => {
            void buscar().finally(() => programar(intervalo));
        }, espera);
        siguiente?.unref?.();
    }

    return {
        iniciar: () => programar(primera),
        buscar,
        estado: () => ({ ...estado }),
        reiniciar: () => {
            if (estado.estado !== "lista") return false;
            autoUpdater.quitAndInstall();
            return true;
        }
    };
}

module.exports = {
    REPOSITORIO, API_RELEASES, leerVersion, compararVersiones, elegirRelease,
    instaladoConSquirrel, crearActualizador
};
