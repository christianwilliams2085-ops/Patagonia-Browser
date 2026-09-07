const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { crearBusqueda } = require("../src/main/find");

function fixture() {
    function pagina() {
        const wc = new EventEmitter();
        wc.destruida = false;
        wc.solicitudes = [];
        wc.limpiezas = 0;
        wc.isDestroyed = () => wc.destruida;
        wc.stopFindInPage = () => { wc.limpiezas++; };
        wc.findInPage = (texto, opciones) => { wc.solicitudes.push({ texto, opciones }); return wc.solicitudes.length; };
        return wc;
    }
    const una = pagina();
    const otra = pagina();
    let activa = una;
    const estados = [];
    const gestor = crearBusqueda({ obtenerContenido: () => activa, notificar: (datos, enfocar) => estados.push({ ...datos, enfocar }) });
    gestor.observar(una);
    gestor.observar(otra);
    return { una, otra, gestor, estados, activarOtra: () => { activa = otra; gestor.cambiarPestana(); } };
}

test("find starts a new search, ignores stale results and steps through matches", () => {
    const { una, otra, gestor, estados } = fixture();
    gestor.abrir();
    assert.equal(estados.at(-1).enfocar, true);
    gestor.buscar("bosque");
    gestor.buscar("montaña");
    una.emit("found-in-page", {}, { requestId: 1, matches: 99, activeMatchOrdinal: 99, finalUpdate: true });
    otra.emit("found-in-page", {}, { requestId: 2, matches: 70, activeMatchOrdinal: 70, finalUpdate: true });
    assert.equal(gestor.estado().coincidencias, 0);
    una.emit("found-in-page", {}, { requestId: 2, matches: 4, activeMatchOrdinal: 1, finalUpdate: true });
    assert.equal(gestor.estado().coincidencias, 4);
    assert.equal(gestor.estado().buscando, false);
    assert.equal(una.solicitudes[0].opciones.findNext, true);
    gestor.siguiente(false);
    assert.deepEqual(una.solicitudes.at(-1), { texto: "montaña", opciones: { forward: false, findNext: false } });
});

test("tab switches and main-frame navigation clear the old search without accepting late matches", () => {
    const f = fixture();
    f.gestor.abrir();
    f.gestor.buscar("texto");
    f.una.emit("did-start-navigation", {}, "https://frame.example", false, false);
    assert.equal(f.gestor.estado().abierta, true);
    f.activarOtra();
    assert.equal(f.gestor.estado().abierta, false);
    f.una.emit("found-in-page", {}, { requestId: 1, matches: 8, activeMatchOrdinal: 1, finalUpdate: true });
    assert.equal(f.gestor.estado().coincidencias, 0);
    f.gestor.abrir();
    f.gestor.buscar("otro");
    f.otra.emit("did-start-navigation", {}, "https://new.example", false, true);
    assert.equal(f.gestor.estado().abierta, false);
    assert.ok(f.otra.limpiezas > 0);
});

test("empty text clears highlights, invalid input is ignored, and failed searches report an error", () => {
    const { gestor, una } = fixture();
    gestor.abrir();
    gestor.buscar("texto");
    gestor.buscar(123);
    gestor.buscar("x".repeat(1001));
    assert.equal(una.solicitudes.length, 1);
    gestor.buscar("");
    assert.equal(gestor.estado().actual, 0);
    assert.equal(gestor.estado().buscando, false);
    una.findInPage = () => { throw new Error("crashed"); };
    gestor.buscar("otro");
    assert.match(gestor.estado().error, /No se pudo buscar/);
    una.destruida = true;
    una.emit("destroyed");
    assert.equal(gestor.estado().abierta, false);
});

test("find bar shows counts, navigates backward and cancels pending input when closed", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const { window } = dom;
        let recibir;
        let cerradas = 0;
        const consultas = [];
        window.patagonia = {
            recibirBusqueda: fn => { recibir = fn; },
            buscarEnPagina: datos => consultas.push(datos),
            cerrarBusqueda: () => { cerradas++; recibir({ abierta: false }); }
        };
        window.eval(fs.readFileSync(path.join(__dirname, "../ui/modules/find.js"), "utf8"));
        recibir({ abierta: true, texto: "", coincidencias: 0, actual: 0, buscando: false, enfocar: true });
        const entrada = window.document.getElementById("textoBusqueda");
        assert.equal(window.document.activeElement, entrada);
        assert.equal(window.document.documentElement.style.getPropertyValue("--alto-busqueda"), "44px");
        entrada.value = "bosque";
        entrada.dispatchEvent(new window.Event("input"));
        entrada.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true }));
        entrada.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true }));
        assert.equal(cerradas, 0);
        assert.equal(consultas.length, 0);
        entrada.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true }));
        assert.equal(consultas[0].texto, "bosque");
        assert.equal(consultas[0].adelante, false);
        recibir({ abierta: true, texto: "bosque", coincidencias: 3, actual: 2, buscando: false });
        assert.equal(window.document.getElementById("resultadoBusqueda").textContent, "2 de 3");
        entrada.value = "montaña";
        entrada.dispatchEvent(new window.Event("input"));
        recibir({ abierta: true, texto: "bosque", coincidencias: 3, actual: 3, buscando: false });
        assert.equal(entrada.value, "montaña");
        assert.equal(window.document.getElementById("resultadoBusqueda").textContent, "Buscando…");
        entrada.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await new Promise(resolve => setTimeout(resolve, 160));
        assert.equal(cerradas, 1);
        assert.equal(consultas.length, 1);
        assert.equal(window.document.getElementById("barraBusqueda").hidden, true);
        assert.equal(window.document.documentElement.style.getPropertyValue("--alto-busqueda"), "0px");
    } finally { dom.window.close(); }
});
