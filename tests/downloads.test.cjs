const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const path = require("node:path");
const fs = require("node:fs");
const { registrarDescargas } = require("../src/main/downloads");

class Descarga extends EventEmitter {
    recibidos = 0;
    total = 100;
    ruta = "";
    getFilename() { return "archivo.txt"; }
    getReceivedBytes() { return this.recibidos; }
    getTotalBytes() { return this.total; }
    getSavePath() { return this.ruta; }
    cancel() { this.emit("done", {}, "cancelled"); }
}
function fixture(comprobarArchivo = async () => ({ isFile: () => true })) {
    const sesion = new EventEmitter();
    const handlers = {};
    const enviados = [];
    const carpetas = [];
    const contenido = {};
    const ventana = { isDestroyed: () => false, webContents: { mainFrame: {}, send: (_, datos) => enviados.push(datos) } };
    const evento = { sender: ventana.webContents, senderFrame: ventana.webContents.mainFrame };
    const gestor = registrarDescargas({
        ipcMain: { handle: (canal, fn) => { handlers[canal] = fn; } },
        sesion, shell: { showItemInFolder: ruta => carpetas.push(ruta) },
        obtenerVentana: () => ventana, esPestanaPropia: wc => wc === contenido, comprobarArchivo
    });
    function iniciar(item = new Descarga()) { sesion.emit("will-download", {}, item, contenido); return item; }
    return { ...gestor, iniciar, enviados, carpetas, sesion, handlers, evento,
        llamar: (canal, id) => handlers[canal](evento, id) };
}

test("tracks concurrent downloads, real saved name and completed folder without exposing paths", async () => {
    const f = fixture();
    const uno = f.iniciar();
    const dos = f.iniciar();
    const idUno = f.snapshot().descargas[1].id;
    uno.ruta = path.join(path.resolve("downloads"), "renombrado.txt");
    uno.recibidos = 100;
    uno.emit("done", {}, "completed");
    const datos = (await f.llamar("listar-descargas")).descargas;
    assert.equal(datos[1].nombre, "renombrado.txt");
    assert.equal(datos[1].estado, "completada");
    assert.equal(datos[0].estado, "descargando");
    assert.equal("ruta" in datos[1], false);
    assert.equal((await f.llamar("mostrar-descarga", idUno)).correcto, true);
    assert.deepEqual(f.carpetas, [uno.ruta]);
    dos.cancel();
});

test("handles unknown size, interruption, recovery, cancellation and final failure", async () => {
    const f = fixture();
    const item = f.iniciar();
    const id = f.snapshot().descargas[0].id;
    item.total = 0;
    item.recibidos = 27;
    item.emit("updated", {}, "interrupted");
    assert.equal(f.snapshot().descargas[0].estado, "interrumpida");
    item.emit("updated", {}, "progressing");
    assert.equal(f.snapshot().descargas[0].estado, "descargando");
    assert.equal(f.snapshot().descargas[0].total, 0);
    assert.equal((await f.llamar("cancelar-descarga", id)).correcto, true);
    assert.equal(f.snapshot().descargas[0].estado, "cancelada");
    assert.equal((await f.llamar("cancelar-descarga", id)).correcto, false);
    assert.equal((await f.llamar("mostrar-descarga", id)).correcto, false);
    f.iniciar().emit("done", {}, "interrupted");
    assert.equal(f.snapshot().descargas[0].estado, "fallida");
});

test("ignores foreign sessions' contents and rejects IPC from pages or child frames", async () => {
    const f = fixture();
    f.sesion.emit("will-download", {}, new Descarga(), {});
    assert.equal(f.snapshot().descargas.length, 0);
    const item = f.iniciar();
    const id = f.snapshot().descargas[0].id;
    for (const evento of [{ sender: {}, senderFrame: {} }, { ...f.evento, senderFrame: {} }]) {
        for (const canal of ["listar-descargas", "cancelar-descarga", "mostrar-descarga"]) {
            assert.equal((await f.handlers[canal](evento, id)).correcto, false);
        }
    }
    assert.equal(f.snapshot().descargas[0].estado, "descargando");
    item.cancel();
});

test("missing files and arbitrary paths cannot open a folder", async () => {
    const f = fixture(async () => { throw new Error("ENOENT"); });
    const item = f.iniciar();
    const id = f.snapshot().descargas[0].id;
    item.ruta = path.resolve("missing.txt");
    item.emit("done", {}, "completed");
    assert.match((await f.llamar("mostrar-descarga", id)).error, /movido o eliminado/);
    assert.equal((await f.llamar("mostrar-descarga", item.ruta)).correcto, false);
    assert.deepEqual(f.carpetas, []);
});

test("progress is throttled but terminal state is sent immediately", async () => {
    const f = fixture();
    const item = f.iniciar();
    for (let n = 1; n <= 30; n++) { item.recibidos = n; item.emit("updated", {}, "progressing"); }
    assert.equal(f.enviados.length, 1);
    await new Promise(resolve => setTimeout(resolve, 300));
    assert.equal(f.enviados.length, 2);
    assert.equal(f.enviados[1].descargas[0].recibidos, 30);
    item.cancel();
    assert.equal(f.enviados.length, 3);
    assert.equal(f.enviados[2].descargas[0].estado, "cancelada");
});

test("keeps at most 100 terminal downloads without losing active ones", () => {
    const f = fixture();
    const activa = f.iniciar();
    for (let n = 0; n < 110; n++) f.iniciar().cancel();
    assert.equal(f.snapshot().descargas.length, 101);
    assert.equal(f.snapshot().descargas.filter(d => d.estado === "descargando").length, 1);
    activa.cancel();
    assert.equal(f.snapshot().descargas.length, 100);
});

test("panel preserves focus, renders unsafe filenames as text and ignores stale snapshots", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(fs.readFileSync(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const { window } = dom;
        let recibir;
        let cancelado;
        let mostrado;
        window.patagonia = {
            recibirDescargas: fn => { recibir = fn; },
            listarDescargas: async () => ({ correcto: true, revision: 0, descargas: [] }),
            cancelarDescarga: async id => { cancelado = id; return { correcto: true, revision: 3, descargas: [] }; },
            mostrarDescarga: async id => { mostrado = id; return { correcto: false, error: "Archivo movido" }; }
        };
        window.eval(fs.readFileSync(path.join(__dirname, "../ui/modules/downloads.js"), "utf8"));
        await new Promise(resolve => setImmediate(resolve));
        window.document.getElementById("abrirDescargas").click();
        const dato = { id: "a", nombre: "<img src=x onerror=alert(1)>", estado: "descargando", recibidos: 1, total: 0 };
        recibir({ revision: 1, descargas: [dato] });
        const lista = window.document.getElementById("listaDescargas");
        const boton = lista.querySelector("button");
        boton.focus();
        recibir({ revision: 2, descargas: [{ ...dato, total: 100, recibidos: 50 }] });
        assert.equal(window.document.activeElement, boton);
        assert.equal(lista.querySelector("img"), null);
        assert.equal(lista.querySelector("progress").value, 50);
        recibir({ revision: 1, descargas: [] });
        assert.equal(lista.children.length, 1);
        boton.click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(cancelado, "a");
        recibir({ revision: 4, descargas: [{ ...dato, estado: "completada" }] });
        lista.querySelectorAll("button")[1].click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(mostrado, "a");
        assert.equal(window.document.getElementById("estadoDescargas").textContent, "Archivo movido");
        recibir({ revision: 5, descargas: [dato] });
        assert.equal(lista.querySelector("progress").hasAttribute("value"), false);
    } finally { dom.window.close(); }
});
