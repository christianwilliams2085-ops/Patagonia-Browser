const { test } = require("node:test");
const assert = require("node:assert/strict");
const { crearPestanasCerradas, urlRecuperable } = require("../src/main/closedTabs");

test("closed tabs are recovered newest first and duplicate URLs remain independent", () => {
    const cerradas = crearPestanasCerradas();
    cerradas.guardar({ url: "https://example.com", titulo: "Primera" });
    cerradas.guardar({ url: "https://example.com/", titulo: "Segunda" });
    assert.equal(cerradas.cantidad(), 2);
    assert.deepEqual(cerradas.recuperar(), { url: "https://example.com/", titulo: "Segunda" });
    assert.deepEqual(cerradas.recuperar(), { url: "https://example.com/", titulo: "Primera" });
    assert.equal(cerradas.recuperar(), null);
});

test("only reloadable web addresses are retained", () => {
    const cerradas = crearPestanasCerradas();
    for (const url of ["file:///private", "javascript:alert(1)", "data:text/html,x",
        "https://user:pass@example.com", "blob:https://example.com/id", "not a url"]) {
        assert.equal(cerradas.guardar({ url }), false);
    }
    assert.equal(cerradas.guardar({ url: "about:blank" }), true);
    assert.equal(cerradas.recuperar().url, "about:blank");
    assert.equal(urlRecuperable("http://localhost:3000"), "http://localhost:3000/");
});

test("the closed tab stack is bounded and validates its limit", () => {
    assert.throws(() => crearPestanasCerradas(0), /Límite/);
    const cerradas = crearPestanasCerradas(2);
    for (let numero = 1; numero <= 3; numero++) cerradas.guardar({ url: `https://example.com/${numero}` });
    assert.equal(cerradas.cantidad(), 2);
    assert.match(cerradas.recuperar().url, /\/3$/);
    assert.match(cerradas.recuperar().url, /\/2$/);
});
