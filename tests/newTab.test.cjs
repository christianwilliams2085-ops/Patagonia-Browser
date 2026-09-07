const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM } = require("jsdom");

test("new tab prepares searches, web addresses and safe custom shortcuts", () => {
    const html = fs.readFileSync(path.join(__dirname, "../ui/new-tab.html"), "utf8");
    const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://patagonia.local/inicio" });
    try {
        const { window } = dom;
        window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
        window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
        window.eval(fs.readFileSync(path.join(__dirname, "../ui/new-tab.js"), "utf8"));
        const api = window.PatagoniaNewTab;
        assert.equal(api.prepararDireccion("montañas de la patagonia"), "https://www.google.com/search?q=monta%C3%B1as%20de%20la%20patagonia");
        assert.equal(api.prepararDireccion("example.com"), "https://example.com");
        assert.equal(api.prepararDireccion("localhost:3000"), "http://localhost:3000");
        assert.deepEqual(
            { ...api.normalizarAcceso(" Ejemplo ", "example.com") },
            { nombre: "Ejemplo", url: "https://example.com/" }
        );
        assert.equal(api.normalizarAcceso("Clave", "https://user:secret@example.com"), null);
        assert.equal(window.document.querySelectorAll(".acceso-rapido").length, 5);
        window.document.getElementById("agregarAcceso").click();
        assert.equal(window.document.getElementById("dialogoAcceso").hasAttribute("open"), true);
    } finally {
        dom.window.close();
    }
});
