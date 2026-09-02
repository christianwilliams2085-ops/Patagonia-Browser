const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const { crearHistorial, observarHistorial, registrarHistorial } = require("../src/main/history");

async function fixture(t, limite) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-history-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const archivo = path.join(dir, "historial.json");
    return { dir, archivo, almacen: crearHistorial(archivo, limite) };
}

test("history persists with timestamps, newest first, and bounded retention", async t => {
    const { archivo, almacen } = await fixture(t, 2);
    await Promise.all([1, 2, 3].map(i => almacen.agregar({ url: `https://example.com/${i}`, titulo: `Page ${i}` })));
    const datos = await crearHistorial(archivo).listar();
    assert.deepEqual(datos.map(item => item.titulo), ["Page 3", "Page 2"]);
    assert.ok(Number.isFinite(Date.parse(datos[0].fecha)));
    assert.notEqual(datos[0].id, datos[1].id);
    await almacen.eliminar(datos[0].id);
    assert.equal((await crearHistorial(archivo).listar()).length, 1);
});

test("deletion is durable; late title updates cannot restore removed visits", async t => {
    const { archivo, almacen, dir } = await fixture(t);
    const favoritos = path.join(dir, "favoritos.json");
    await fs.writeFile(favoritos, "keep bookmarks");
    await almacen.agregar({ id: "one", url: "https://example.com" });
    await almacen.vaciar();
    await almacen.titular("one", "Late title");
    assert.deepEqual(await crearHistorial(archivo).listar(), []);
    assert.equal(await fs.readFile(favoritos, "utf8"), "keep bookmarks");
});

test("corrupt history remains intact until an explicit clear", async t => {
    const { archivo, almacen } = await fixture(t);
    await fs.writeFile(archivo, "invalid-json");
    await assert.rejects(almacen.agregar({ url: "https://example.com" }));
    assert.equal(await fs.readFile(archivo, "utf8"), "invalid-json");
    await almacen.vaciar();
    assert.deepEqual(await almacen.listar(), []);
});

test("unsafe and credential-bearing URLs are not recorded", async t => {
    const { almacen } = await fixture(t);
    for (const url of ["file:///private", "data:text/html,hi", "javascript:alert(1)", "https://user:pass@example.com"]) {
        await almacen.agregar({ url });
    }
    assert.deepEqual(await almacen.listar(), []);
});

test("records committed pages, reloads and SPA routes; excludes failures and subframes", async t => {
    const { almacen } = await fixture(t);
    const wc = new EventEmitter();
    let url = "https://example.com/";
    wc.getURL = () => url;
    wc.getTitle = () => "Example";
    observarHistorial(wc, almacen, () => {});
    wc.emit("did-fail-load", {}, -105, "DNS", "https://bad.invalid", true);
    wc.emit("did-navigate-in-page", {}, "https://ad.example/", false);
    assert.deepEqual(await almacen.listar(), []);
    wc.emit("did-navigate", {}, url, 200);
    wc.emit("page-title-updated", {}, "Example title");
    wc.emit("did-finish-load");
    let datos = await almacen.listar();
    assert.equal(datos.length, 1);
    assert.equal(datos[0].titulo, "Example");
    wc.emit("did-start-navigation", {}, url, false, true);
    wc.emit("did-navigate", {}, url, 200);
    assert.equal((await almacen.listar()).length, 2);
    url = "https://example.com/new";
    wc.emit("did-navigate-in-page", {}, url, true);
    datos = await almacen.listar();
    assert.equal(datos.length, 3);
    assert.equal(datos[0].url, url);
});

test("IPC rejects untrusted frames and opens only a stored visit", async t => {
    const { archivo } = await fixture(t);
    const handlers = {};
    const content = { mainFrame: {}, send() {} };
    const evento = { sender: content, senderFrame: content.mainFrame };
    let opened;
    registrarHistorial({ archivo, ipcMain: { handle: (name, cb) => handlers[name] = cb },
        obtenerVentana: () => ({ webContents: content, isDestroyed: () => false }),
        obtenerPestana: () => ({}), navegar: (_tab, url) => opened = url });
    assert.equal((await handlers["vaciar-historial"]({ sender: {} })).correcto, false);
    assert.equal((await handlers["listar-historial"]({ sender: content, senderFrame: {} })).correcto, false);
    const [visita] = await crearHistorial(archivo).agregar({ url: "https://example.com" });
    assert.equal((await handlers["abrir-visita"](evento, visita.id)).correcto, true);
    assert.equal(opened, "https://example.com/");
    assert.equal((await handlers["abrir-visita"](evento, "missing")).correcto, false);
});

test("DOM: search, open, remove, live refresh and confirmation before clearing", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(await fs.readFile(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const win = dom.window;
        const doc = win.document;
        let datos = [
            { id: "one", titulo: "<img src=x onerror=alert(1)>", url: "https://example.com/", fecha: "2026-09-02T12:00:00Z" },
            { id: "two", titulo: "ASUS", url: "https://asus.com/", fecha: "2026-09-02T11:00:00Z" }
        ];
        let notify;
        let opened;
        let cleared = 0;
        const result = () => ({ correcto: true, historial: datos });
        win.patagonia = {
            listarHistorial: async () => result(), recibirHistorial: cb => notify = cb,
            abrirVisita: async id => { opened = id; return result(); },
            eliminarVisita: async id => { datos = datos.filter(item => item.id !== id); return result(); },
            vaciarHistorial: async () => { cleared++; datos = []; return result(); }
        };
        win.eval(await fs.readFile(path.join(__dirname, "../ui/modules/history.js"), "utf8"));
        const settle = () => new Promise(resolve => setImmediate(resolve));
        doc.getElementById("abrirHistorial").click(); await settle();
        assert.equal(doc.querySelectorAll("#listaHistorial li").length, 2);
        assert.equal(doc.querySelector("#listaHistorial img"), null);
        assert.ok(doc.querySelector("#listaHistorial time").textContent);
        const search = doc.getElementById("buscarHistorial");
        search.value = "ASUS"; search.dispatchEvent(new win.Event("input"));
        assert.equal(doc.querySelectorAll("#listaHistorial li").length, 1);
        notify(null); await settle();
        assert.equal(search.value, "ASUS");
        doc.querySelector("#listaHistorial .favorito-abrir").click(); await settle();
        assert.equal(opened, "two");
        doc.querySelector("#listaHistorial .favorito-eliminar").click(); await settle();
        assert.equal(doc.querySelectorAll("#listaHistorial li").length, 0);
        doc.getElementById("borrarHistorial").click();
        assert.equal(cleared, 0);
        doc.getElementById("cancelarBorradoHistorial").click();
        assert.equal(cleared, 0);
        doc.getElementById("borrarHistorial").click();
        doc.getElementById("aceptarBorradoHistorial").click(); await settle();
        assert.equal(cleared, 1);
    } finally { dom.window.close(); }
});
