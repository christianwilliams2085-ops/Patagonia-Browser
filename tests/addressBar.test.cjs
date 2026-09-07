const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

function interfaz(t) {
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    t.after(() => dom.window.close());
    const { window } = dom;
    const eventos = {};
    const destinos = [];
    window.patagonia = {
        recibirURL: fn => { eventos.url = fn; },
        recibirPestanas: fn => { eventos.pestanas = fn; },
        recibirEstadoBarraLateral() {},
        navegar: url => destinos.push(url)
    };
    window.PatagoniaFavorites = { actualizarPagina() {} };
    window.PatagoniaAssistant = { iniciar: () => true };
    window.eval(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"));
    const entrada = window.document.getElementById("direccion");
    function activar(id, url) {
        eventos.url(url);
        eventos.pestanas([{ id, url, activa: true, titulo: "Página" }]);
    }
    function editar(texto) {
        entrada.focus();
        entrada.value = texto;
        entrada.dispatchEvent(new window.Event("input"));
    }
    activar(1, "https://example.com/original");
    return { window, entrada, eventos, destinos, activar, editar };
}

test("switching tabs discards the previous tab draft even for matching URLs or focused input", t => {
    const f = interfaz(t);
    f.editar("borrador.example");
    f.entrada.blur();
    f.activar(2, "https://example.org/otra");
    assert.equal(f.entrada.value, "example.org");
    f.editar("otro borrador");
    f.activar(3, "https://example.org/otra");
    assert.equal(f.entrada.value, "https://example.org/otra");
});

test("background URL updates preserve typing; navigation after blur displays the actual destination", t => {
    const f = interfaz(t);
    f.editar("mi búsqueda");
    f.eventos.url("https://example.com/actualizada");
    assert.equal(f.entrada.value, "mi búsqueda");
    f.entrada.blur();
    f.eventos.url("https://example.net/destino");
    assert.equal(f.entrada.value, "example.net");
});

test("Go still submits the draft after blur and Escape restores the current page", t => {
    const f = interfaz(t);
    f.editar("localhost:3000");
    f.entrada.blur();
    f.window.document.getElementById("ir").click();
    assert.deepEqual(f.destinos, ["localhost:3000"]);
    f.editar("descartar");
    f.entrada.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "Escape" }));
    assert.equal(f.entrada.value, "example.com");
});

test("composing characters cannot submit or discard the address draft", t => {
    const f = interfaz(t);
    f.editar("búsqueda en curso");
    for (const key of ["Enter", "Escape"]) {
        f.entrada.dispatchEvent(new f.window.KeyboardEvent("keydown", { key, isComposing: true }));
    }
    assert.deepEqual(f.destinos, []);
    assert.equal(f.entrada.value, "búsqueda en curso");
    assert.equal(f.window.document.activeElement, f.entrada);
    f.entrada.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "Enter" }));
    assert.deepEqual(f.destinos, ["búsqueda en curso"]);
});
