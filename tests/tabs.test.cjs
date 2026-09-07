const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

function interfaz(t) {
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    t.after(() => dom.window.close());
    const { window } = dom;
    let recibir;
    const acciones = [];
    const desplazamientos = [];
    window.HTMLElement.prototype.scrollIntoView = function () { desplazamientos.push(this.dataset.id); };
    window.patagonia = {
        recibirURL() {}, recibirEstadoBarraLateral() {},
        recibirPestanas: fn => { recibir = fn; },
        activarPestana: id => acciones.push(["activar", id]),
        cerrarPestana: id => acciones.push(["cerrar", id]),
        atras: () => acciones.push(["atrás"]),
        adelante: () => acciones.push(["adelante"]),
        recargar: () => acciones.push(["recargar"]),
        detener: () => acciones.push(["detener"])
    };
    window.PatagoniaFavorites = { actualizarPagina() {} };
    window.PatagoniaAssistant = { iniciar: () => true };
    window.eval(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"));
    const tab = id => window.document.querySelector(`.tab[data-id="${id}"]`);
    return { window, document: window.document, recibir, tab, acciones, desplazamientos };
}

const paginas = [
    { id: 1, titulo: "Una", url: "https://one.example/", activa: true, favicon: "https://one.example/icon.png" },
    { id: 2, titulo: "Otra", url: "https://two.example/", activa: false, favicon: "https://two.example/icon.png" }
];

test("title and loading updates preserve existing tabs, focus and unchanged favicon elements", t => {
    const f = interfaz(t);
    f.recibir(paginas);
    const primera = f.tab(1);
    const segunda = f.tab(2);
    const icono = primera.querySelector("img");
    const cerrar = primera.querySelector(".cerrar-pestana");
    cerrar.focus();
    f.recibir([{ ...paginas[0], titulo: "Título actualizado" }, { ...paginas[1], cargando: true }]);
    assert.equal(f.tab(1), primera);
    assert.equal(f.tab(2), segunda);
    assert.equal(primera.querySelector("img"), icono);
    assert.equal(f.document.activeElement, cerrar);
    assert.equal(primera.querySelector(".titulo-pestana").textContent, "Título actualizado");
    assert.ok(segunda.querySelector(".cargando-pestana"));
    assert.deepEqual(f.desplazamientos, ["1"]);
    const peligroso = '<img src=x onerror="alert(1)">';
    f.recibir([{ ...paginas[0], titulo: peligroso }, paginas[1]]);
    assert.equal(primera.querySelector(".titulo-pestana").textContent, peligroso);
    assert.equal(primera.querySelectorAll("img").length, 1);
    assert.equal(cerrar.getAttribute("aria-label"), `Cerrar pestaña: ${peligroso}`);
    cerrar.click();
    assert.deepEqual(f.acciones, [["cerrar", 1]]);
});

test("tab order remains correct and closing the focused tab transfers focus to the active tab", t => {
    const f = interfaz(t);
    f.recibir(paginas);
    const segunda = f.tab(2);
    const boton = segunda.querySelector(".seleccionar-pestana");
    boton.focus();
    const invertidas = [{ ...paginas[1], activa: true }, { ...paginas[0], activa: false }];
    f.recibir(invertidas);
    assert.deepEqual([...f.document.querySelectorAll(".tab")].map(tab => tab.dataset.id), ["2", "1"]);
    assert.equal(f.document.activeElement, boton);
    assert.equal(boton.getAttribute("aria-pressed"), "true");
    boton.click();
    assert.deepEqual(f.acciones, [["activar", 2]]);
    segunda.querySelector(".cerrar-pestana").focus();
    f.recibir([paginas[0]]);
    assert.equal(f.tab(2), null);
    assert.equal(f.document.activeElement, f.tab(1).querySelector(".seleccionar-pestana"));
    assert.deepEqual(f.desplazamientos, ["1", "2", "1"]);
    assert.equal(f.document.querySelector(".tabs").lastElementChild.id, "nuevaPestana");
});

test("navigation buttons follow the active tab and loading switches reload to stop", t => {
    const f = interfaz(t);
    const atras = f.document.getElementById("atras");
    const adelante = f.document.getElementById("adelante");
    const recargar = f.document.getElementById("recargar");
    f.recibir([{ ...paginas[0], cargando: true, puedeRetroceder: true, puedeAvanzar: false }, paginas[1]]);
    assert.equal(atras.disabled, false);
    assert.equal(adelante.disabled, true);
    assert.equal(recargar.getAttribute("aria-label"), "Detener carga");
    atras.click();
    adelante.click();
    recargar.click();
    assert.deepEqual(f.acciones, [["atrás"], ["detener"]]);
    f.recibir([{ ...paginas[0], activa: false, cargando: true }, { ...paginas[1], activa: true, puedeAvanzar: true }]);
    assert.equal(atras.disabled, true);
    assert.equal(adelante.disabled, false);
    assert.equal(recargar.getAttribute("aria-label"), "Recargar");
    recargar.click();
    assert.deepEqual(f.acciones.at(-1), ["recargar"]);
    f.recibir([{ ...paginas[0], cargando: true, errorCarga: { url: paginas[0].url, mensaje: "Fallo de carga" } }]);
    recargar.click();
    assert.deepEqual(f.acciones.at(-1), ["recargar"]);
    assert.equal(f.document.getElementById("errorCarga").hidden, false);
});
