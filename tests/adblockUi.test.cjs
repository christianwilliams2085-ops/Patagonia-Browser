const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

test("el Centro de privacidad muestra conteos reales y permite cambiar la protección del sitio", async t => {
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    t.after(() => dom.window.close());
    const { window } = dom;
    let recibirProteccion;
    let cambios = 0;
    let estado = {
        disponible: true, sitio: "example.com", activa: true, permitida: false,
        anuncios: 12, rastreadores: 6, total: 18
    };
    window.patagonia = {
        recibirURL() {}, recibirPestanas() {}, recibirEstadoBarraLateral() {},
        recibirProteccion: fn => { recibirProteccion = fn; },
        obtenerProteccion: async () => ({ correcto: true, proteccion: estado }),
        alternarProteccionSitio: async () => {
            cambios++;
            estado = { ...estado, activa: false, permitida: true, anuncios: 0, rastreadores: 0, total: 0 };
            return { correcto: true, proteccion: estado };
        }
    };
    window.PatagoniaFavorites = { actualizarPagina() {} };
    window.PatagoniaAssistant = { iniciar: () => true };
    window.eval(fs.readFileSync(path.join(__dirname, "../renderer.js"), "utf8"));
    await new Promise(resolve => setImmediate(resolve));

    recibirProteccion(estado);
    assert.equal(window.document.getElementById("totalBloqueado").textContent, "18");
    assert.equal(window.document.getElementById("anunciosBloqueados").textContent, "12");
    assert.equal(window.document.getElementById("rastreadoresBloqueados").textContent, "6");
    assert.match(window.document.getElementById("alternarProteccionSitio").textContent, /Desactivar/);

    window.document.getElementById("alternarProteccionSitio").click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(cambios, 1);
    assert.equal(window.document.getElementById("estadoProteccion").textContent, "Desactivada");
    assert.match(window.document.getElementById("alternarProteccionSitio").textContent, /Activar/);
    assert.equal(window.document.querySelector(".tarjeta-privacidad").classList.contains("desactivada"), true);
});
