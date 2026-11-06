const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");
const { siguienteNivel, porcentaje, cambiarZoom, accionTeclado, imprimir } = require("../src/main/zoom");
const { compararVersiones, elegirRelease, instaladoConSquirrel, crearActualizador } = require("../src/main/updater");
const { crearPlantillaMenu } = require("../src/main/contextMenu");

test("zoom steps like Chrome and stays within limits", () => {
    assert.equal(siguienteNivel(1, 1), 1.1);
    assert.equal(siguienteNivel(1, -1), 0.9);
    assert.equal(siguienteNivel(1.05, 1), 1.1);
    assert.equal(siguienteNivel(5, 1), 5);
    assert.equal(siguienteNivel(0.25, -1), 0.25);
    assert.equal(porcentaje(1.25), 125);
    assert.equal(porcentaje(undefined), 100);
    let factor = 1;
    const contenido = { isDestroyed: () => false, getZoomFactor: () => factor, setZoomFactor: f => { factor = f; } };
    assert.equal(cambiarZoom(contenido, 1), 110);
    assert.equal(cambiarZoom(contenido, 1), 125);
    assert.equal(cambiarZoom(contenido, 0), 100);
    assert.equal(cambiarZoom({ isDestroyed: () => true }, 1), null);
});

test("Ctrl +, Ctrl -, Ctrl 0 and Ctrl P are recognized, other keys are not", () => {
    const tecla = (key, extra = {}) => accionTeclado({ type: "keyDown", key, control: true, ...extra });
    assert.equal(tecla("+"), "zoomMas");
    assert.equal(tecla("="), "zoomMas");
    assert.equal(tecla("+", { shift: true }), "zoomMas");
    assert.equal(tecla("-"), "zoomMenos");
    assert.equal(tecla("0"), "zoomNormal");
    assert.equal(tecla("p"), "imprimir");
    assert.equal(tecla("P", { shift: true }), null);
    assert.equal(tecla("+", { alt: true }), null);
    assert.equal(accionTeclado({ type: "keyDown", key: "+" }), null);
    assert.equal(accionTeclado({ type: "keyUp", key: "p", control: true }), null);
    let impreso = false;
    imprimir({ isDestroyed: () => false, print: (opciones, listo) => { impreso = true; assert.deepEqual(opciones, {}); listo(); } });
    assert.equal(impreso, true);
});

test("the page menu offers zoom and printing when available", () => {
    const llamadas = [];
    const plantilla = crearPlantillaMenu({}, {
        contenido: { navigationHistory: { canGoBack: () => false, canGoForward: () => false } },
        clipboard: {}, abrirEnPestana() {},
        zoom: d => llamadas.push(d), imprimir: () => llamadas.push("imprimir")
    });
    const etiquetas = plantilla.filter(i => i.label).map(i => i.label);
    assert.deepEqual(etiquetas.slice(-4), ["Acercar", "Alejar", "Tamaño normal", "Imprimir…"]);
    for (const item of plantilla.filter(i => ["Acercar", "Alejar", "Tamaño normal", "Imprimir…"].includes(i.label))) item.click();
    assert.deepEqual(llamadas, [1, -1, 0, "imprimir"]);
});

const release = (tag, extra = {}) => ({
    tag_name: tag, draft: false, prerelease: false,
    assets: [{ name: "Patagonia-Browser-Setup.exe" }, { name: "RELEASES" }, { name: `PatagoniaBrowser-${tag.slice(1)}-full.nupkg` }],
    ...extra
});

test("only newer published desktop releases with Squirrel packages are chosen", () => {
    assert.equal(compararVersiones("v1.0.10", "1.0.9"), 1);
    assert.equal(compararVersiones("1.0.6", "1.0.6"), 0);
    assert.equal(compararVersiones("1.0.5", "1.1.0"), -1);
    const releases = [
        release("v1.0.9", { draft: true }),
        release("v1.0.8", { prerelease: true }),
        { tag_name: "movil-v2.0.0", assets: [{ name: "RELEASES" }, { name: "x-full.nupkg" }] },
        release("v1.0.7", { assets: [{ name: "Patagonia-Browser-Setup.exe" }] }),
        release("v1.0.6"),
        release("v1.0.10")
    ];
    assert.deepEqual(elegirRelease(releases, "1.0.6"), { tag: "v1.0.10", version: "1.0.10" });
    assert.equal(elegirRelease([release("v1.0.6"), release("v1.0.5")], "1.0.6"), null);
    assert.equal(elegirRelease(null, "1.0.6"), null);
});

test("updates are only attempted from a Squirrel installation", () => {
    const raiz = path.join("C:", "PatagoniaBrowser");
    const exe = path.join(raiz, "app-1.0.6", "Patagonia Browser.exe");
    assert.equal(instaladoConSquirrel(exe, ruta => ruta === path.join(raiz, "Update.exe")), true);
    assert.equal(instaladoConSquirrel(exe, () => false), false);
});

function actualizadorDePrueba({ releases = [release("v1.0.7")], habilitado = true, ok = true } = {}) {
    const autoUpdater = new EventEmitter();
    autoUpdater.feeds = [];
    autoUpdater.chequeos = 0;
    autoUpdater.instalado = false;
    autoUpdater.setFeedURL = opciones => autoUpdater.feeds.push(opciones.url);
    autoUpdater.checkForUpdates = () => { autoUpdater.chequeos++; };
    autoUpdater.quitAndInstall = () => { autoUpdater.instalado = true; };
    const avisos = [];
    const consultas = [];
    const actualizador = crearActualizador({
        autoUpdater,
        versionActual: "1.0.6",
        habilitado: () => habilitado,
        notificar: estado => avisos.push(estado),
        fetch: async (url, opciones) => { consultas.push({ url, opciones }); return { ok, status: ok ? 200 : 403, json: async () => releases }; }
    });
    return { autoUpdater, avisos, consultas, actualizador };
}

test("a newer release is downloaded through Squirrel and offered to restart", async () => {
    const { autoUpdater, avisos, consultas, actualizador } = actualizadorDePrueba();
    assert.equal(actualizador.reiniciar(), false);
    await actualizador.buscar();
    assert.match(consultas[0].url, /api\.github\.com\/repos\/Roma-69\/Patagonia-Browser\/releases/);
    assert.deepEqual(autoUpdater.feeds, ["https://github.com/Roma-69/Patagonia-Browser/releases/download/v1.0.7"]);
    assert.equal(autoUpdater.chequeos, 1);
    assert.equal(actualizador.estado().estado, "descargando");
    autoUpdater.emit("update-downloaded");
    assert.deepEqual(avisos.at(-1), { estado: "lista", version: "1.0.7" });
    autoUpdater.emit("error", new Error("tarde"));
    assert.equal(actualizador.estado().estado, "lista");
    await actualizador.buscar();
    assert.equal(consultas.length, 1);
    assert.equal(actualizador.reiniciar(), true);
    assert.equal(autoUpdater.instalado, true);
});

test("disabled updates, no news and network errors never download anything", async () => {
    const apagado = actualizadorDePrueba({ habilitado: false });
    await apagado.actualizador.buscar();
    assert.equal(apagado.consultas.length, 0);
    const alDia = actualizadorDePrueba({ releases: [release("v1.0.6")] });
    await alDia.actualizador.buscar();
    assert.equal(alDia.actualizador.estado().estado, "al-dia");
    assert.equal(alDia.autoUpdater.chequeos, 0);
    const caido = actualizadorDePrueba({ ok: false });
    await caido.actualizador.buscar();
    assert.equal(caido.actualizador.estado().estado, "error");
    assert.equal(caido.autoUpdater.chequeos, 0);
});

test("checks are scheduled in the background and repeat", async () => {
    const programadas = [];
    const autoUpdater = Object.assign(new EventEmitter(), { setFeedURL() {}, checkForUpdates() {}, quitAndInstall() {} });
    const actualizador = crearActualizador({
        autoUpdater, versionActual: "1.0.6", habilitado: () => true, notificar() {},
        fetch: async () => ({ ok: true, json: async () => [] }),
        temporizador: (fn, espera) => { programadas.push({ fn, espera }); return {}; },
        primera: 1, intervalo: 2
    });
    actualizador.iniciar();
    assert.equal(programadas[0].espera, 1);
    programadas[0].fn();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(programadas[1].espera, 2);
});
