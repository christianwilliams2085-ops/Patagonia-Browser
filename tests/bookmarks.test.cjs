const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { crearAlmacenFavoritos, registrarFavoritos } = require("../src/main/bookmarks");

async function fixture(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-bookmarks-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const archivo = path.join(dir, "favoritos.json");
    return { dir, archivo, almacen: crearAlmacenFavoritos(archivo) };
}

test("bookmarks survive restart and deleting persists", async t => {
    const { archivo, almacen } = await fixture(t);
    assert.deepEqual(await almacen.listar(), []);
    const guardados = await almacen.alternar({ url: "https://example.com", titulo: "Example" });
    const reiniciado = crearAlmacenFavoritos(archivo);
    assert.deepEqual(await reiniciado.listar(), guardados);
    assert.equal(guardados[0].url, "https://example.com/");
    await reiniciado.eliminar(guardados[0].id);
    assert.deepEqual(await almacen.listar(), []);
});

test("concurrent saves preserve both pages and equivalent URLs toggle", async t => {
    const { almacen } = await fixture(t);
    await Promise.all([
        almacen.alternar({ url: "https://example.com", titulo: "One" }),
        almacen.alternar({ url: "https://other.example", titulo: "Two" })
    ]);
    assert.equal((await almacen.listar()).length, 2);
    await almacen.alternar({ url: "https://EXAMPLE.com/", titulo: "One again" });
    assert.equal((await almacen.listar()).length, 1);
});

test("invalid data is preserved and unsafe URLs are rejected", async t => {
    const { archivo, almacen } = await fixture(t);
    for (const url of ["javascript:alert(1)", "file:///secret", "https://user:pass@example.com"]) {
        await assert.rejects(almacen.alternar({ url }));
    }
    await fs.writeFile(archivo, "broken-json");
    await assert.rejects(almacen.alternar({ url: "https://example.com" }));
    assert.equal(await fs.readFile(archivo, "utf8"), "broken-json");
});

test("failed writes do not report success and later operations can recover", async t => {
    const { dir } = await fixture(t);
    const parent = path.join(dir, "blocked");
    await fs.writeFile(parent, "not a directory");
    const almacen = crearAlmacenFavoritos(path.join(parent, "favoritos.json"));
    await assert.rejects(almacen.alternar({ url: "https://example.com" }));
    await fs.unlink(parent);
    assert.equal((await almacen.alternar({ url: "https://example.com" })).length, 1);
});

test("IPC only accepts the trusted window and saves the actual active page", async t => {
    const { archivo } = await fixture(t);
    const handlers = {};
    const contents = { mainFrame: {} };
    const evento = { sender: contents, senderFrame: contents.mainFrame };
    const tab = { vista: { webContents: { isDestroyed: () => false,
        getURL: () => "https://actual.example/", getTitle: () => "Actual" } } };
    let destino;
    registrarFavoritos({ archivo, ipcMain: { handle: (name, cb) => handlers[name] = cb },
        obtenerVentana: () => ({ isDestroyed: () => false, webContents: contents }),
        obtenerPestana: () => tab, navegar: (_tab, url) => destino = url });
    assert.equal((await handlers["alternar-favorito"]({ sender: {} })).correcto, false);
    assert.equal((await handlers["listar-favoritos"]({ sender: contents, senderFrame: {} })).correcto, false);
    const result = await handlers["alternar-favorito"](evento, "https://forged.example");
    assert.equal(result.favoritos[0].url, "https://actual.example/");
    await handlers["abrir-favorito"](evento, result.favoritos[0].id);
    assert.equal(destino, "https://actual.example/");
    tab.cargando = true;
    assert.equal((await handlers["alternar-favorito"](evento)).correcto, false);
});

test("DOM: star, list, open and remove use plain text and reflect the active tab", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(await fs.readFile(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const win = dom.window;
        let items = [];
        let opened;
        win.patagonia = {
            listarFavoritos: async () => ({ correcto: true, favoritos: items }),
            alternarFavorito: async () => ({ correcto: true, favoritos: items = items.length ? [] : [
                { id: "one", url: "https://example.com/", titulo: "<img src=x onerror=alert(1)>" }
            ] }),
            abrirFavorito: async id => { opened = id; return { correcto: true, favoritos: items }; },
            eliminarFavorito: async () => ({ correcto: true, favoritos: items = [] })
        };
        win.eval(await fs.readFile(path.join(__dirname, "../ui/modules/bookmarks.js"), "utf8"));
        const settle = () => new Promise(resolve => setImmediate(resolve));
        await settle();
        const star = win.document.getElementById("guardarFavorito");
        win.PatagoniaFavorites.actualizarPagina({ url: "https://example.com/" });
        assert.equal(star.disabled, false);
        star.click(); await settle();
        assert.equal(star.getAttribute("aria-pressed"), "true");
        win.document.getElementById("abrirFavoritos").click(); await settle();
        assert.equal(win.document.getElementById("panelFavoritos").hidden, false);
        assert.equal(win.document.querySelector("#listaFavoritos img"), null);
        win.document.querySelector(".favorito-abrir").click(); await settle();
        assert.equal(opened, "one");
        win.PatagoniaFavorites.actualizarPagina({ url: "https://other.example/" });
        assert.equal(star.getAttribute("aria-pressed"), "false");
        win.document.querySelector(".favorito-eliminar").click(); await settle();
        assert.equal(win.document.getElementById("favoritosVacios").hidden, false);
    } finally { dom.window.close(); }
});
