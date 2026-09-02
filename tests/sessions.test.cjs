const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");
const { crearInstantanea, crearGestorSesion, registrarSesiones } = require("../src/main/sessions");

async function fixture(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-session-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    return { dir, archivo: path.join(dir, "sesion.json") };
}
const paginas = [{ id: 4, url: "https://example.com/uno" }, { id: 9, url: "https://example.org/dos" }];

test("session survives restart with order, duplicate URLs and selected tab", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    assert.deepEqual((await gestor.iniciar()).pestanas, []);
    gestor.actualizar([...paginas, { ...paginas[0], id: 15 }], 9);
    await gestor.guardarAhora();
    const restaurada = await crearGestorSesion(archivo).iniciar();
    assert.deepEqual(restaurada.pestanas.map(p => p.url), [paginas[0].url, paginas[1].url, paginas[0].url]);
    assert.equal(restaurada.activa, 1);
    assert.equal(gestor.estado().guardada, true);
});

test("filters unsafe URLs and remaps active index without changing tab order", () => {
    const datos = crearInstantanea([
        { id: 1, url: "file:///secret" }, ...paginas,
        { id: 2, url: "https://user:password@example.com" },
        { id: 3, url: "javascript:alert(1)" }, { id: 5, url: "not a URL" }
    ], 9);
    assert.deepEqual(datos, { version: 1, pestanas: paginas.map(p => ({ url: p.url })), activa: 1 });
    assert.equal(crearInstantanea(paginas, -1).activa, 0);
});

test("closing a tab and rapid navigation save the latest state before quit", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    await gestor.iniciar();
    gestor.actualizar(paginas, 4);
    const primero = gestor.guardarAhora();
    gestor.actualizar([paginas[1]], 9);
    const segundo = gestor.guardarAhora();
    await Promise.all([primero, segundo]);
    assert.deepEqual((await crearGestorSesion(archivo).iniciar()).pestanas, [{ url: paginas[1].url }]);
    assert.equal(gestor.estado().guardada, true);
});

test("autosaves without requiring a normal shutdown", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    await gestor.iniciar();
    gestor.actualizar(paginas, 9);
    await new Promise(resolve => setTimeout(resolve, 400));
    await gestor.guardarAhora();
    assert.equal((await crearGestorSesion(archivo).iniciar()).activa, 1);
});

test("corrupt or unsafe session files remain untouched", async t => {
    const { archivo } = await fixture(t);
    for (const texto of ["broken", JSON.stringify({ version: 1, pestanas: [{ url: "file:///secret" }], activa: 0 }),
        JSON.stringify({ version: 1, pestanas: [], activa: 99 })]) {
        await fs.writeFile(archivo, texto);
        const gestor = crearGestorSesion(archivo);
        assert.deepEqual((await gestor.iniciar()).pestanas, []);
        gestor.actualizar(paginas, 4);
        await assert.rejects(gestor.guardarAhora());
        assert.equal(gestor.estado().bloqueada, true);
        assert.equal(await fs.readFile(archivo, "utf8"), texto);
    }
});

test("write failure is reported and explicit retry recovers", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    await gestor.iniciar();
    await fs.mkdir(archivo);
    gestor.actualizar(paginas, 9);
    await assert.rejects(gestor.guardarAhora(), /No pudimos guardar/);
    assert.equal(gestor.estado().guardada, false);
    await fs.rmdir(archivo);
    await gestor.guardarAhora();
    assert.equal(gestor.estado().error, "");
    assert.equal((await crearGestorSesion(archivo).iniciar()).activa, 1);
});

test("session IPC rejects pages and child frames", async t => {
    const { archivo } = await fixture(t);
    const handlers = {};
    const webContents = { mainFrame: {}, send: () => {} };
    const gestor = registrarSesiones({ archivo, ipcMain: { handle: (canal, fn) => { handlers[canal] = fn; } },
        obtenerVentana: () => ({ webContents, isDestroyed: () => false }) });
    await gestor.iniciar();
    for (const canal of ["obtener-sesion", "guardar-sesion"]) {
        assert.equal((await handlers[canal]({ sender: {}, senderFrame: {} })).correcto, false);
        assert.equal((await handlers[canal]({ sender: webContents, senderFrame: {} })).correcto, false);
        assert.equal((await handlers[canal]({ sender: webContents, senderFrame: webContents.mainFrame })).correcto, true);
    }
});

test("main restores tabs, saves navigation and does not erase session on window destruction", async t => {
    const { dir, archivo } = await fixture(t);
    await fs.writeFile(archivo, JSON.stringify(crearInstantanea(paginas, 4)));
    const app = new EventEmitter();
    app.whenReady = () => Promise.resolve();
    app.getPath = () => dir;
    let terminado;
    const salida = new Promise(resolve => { terminado = resolve; });
    app.quit = () => {
        let impedido = false;
        app.emit("will-quit", { preventDefault: () => { impedido = true; } });
        if (!impedido) terminado();
    };
    const ipcMain = new EventEmitter();
    ipcMain.handle = () => {};
    const vistas = [];
    let ventana;
    class Contenido extends EventEmitter {
        mainFrame = {};
        send() {}
        isDestroyed() { return false; }
        close() { this.emit("did-stop-loading"); }
    }
    class Vista {
        webContents = new Contenido();
        constructor() { vistas.push(this); }
        setBounds() {}
    }
    let cargaLista;
    const lista = new Promise(resolve => { cargaLista = resolve; });
    class Ventana extends EventEmitter {
        webContents = new Contenido();
        contentView = { addChildView: vista => { this.activa = vista; }, removeChildView: () => {} };
        constructor() { super(); ventana = this; }
        isDestroyed() { return false; }
        getContentSize() { return [1400, 900]; }
        center() {} show() {} restore() {} focus() {}
        loadFile() { setImmediate(() => { this.webContents.emit("did-finish-load"); cargaLista(); }); return Promise.resolve(); }
    }
    const navegador = { navegar: (p, url) => { p.vista.destino = url; } };
    const requirePrueba = nombre => {
        if (nombre === "electron") return { app, ipcMain, BrowserWindow: Ventana, WebContentsView: Vista, session: { defaultSession: {} }, shell: {} };
        if (nombre === "path") return path;
        if (nombre.endsWith("/sessions")) return { registrarSesiones };
        if (nombre.endsWith("/constants")) return { ALTURA_BARRA: 108, ANCHO_BARRA_LATERAL: 320, PAGINA_INICIO: "https://www.google.com" };
        if (nombre.endsWith("/navigation")) return navegador;
        if (nombre.endsWith("/history")) return { registrarHistorial: () => Object.assign(() => {}, { esperar: () => Promise.resolve() }) };
        if (nombre.endsWith("/downloads")) return { registrarDescargas: () => {} };
        if (nombre.endsWith("/bookmarks")) return { registrarFavoritos: () => {} };
        if (nombre.endsWith("/loadErrors")) return { registrarErroresCarga: () => {} };
        return {};
    };
    require("node:vm").runInNewContext(await fs.readFile(path.join(__dirname, "../main.js"), "utf8"), {
        require: requirePrueba, __dirname: path.join(__dirname, ".."), console: { log() {}, error() {} },
        process: { platform: "win32", on() {} }
    });
    await lista;
    assert.deepEqual(vistas.map(v => v.destino), paginas.map(p => p.url));
    assert.equal(ventana.activa, vistas[0]);
    vistas[0].webContents.emit("did-navigate-in-page", {}, "https://frame.example/", false);
    vistas[1].webContents.emit("did-navigate", {}, "https://changed.example/");
    ipcMain.emit("activar-pestana", {}, 2);
    ventana.emit("close");
    ventana.emit("closed");
    app.emit("window-all-closed");
    await salida;
    const guardada = await crearGestorSesion(archivo).iniciar();
    assert.deepEqual(guardada.pestanas, [{ url: paginas[0].url }, { url: "https://changed.example/" }]);
    assert.equal(guardada.activa, 1);
});

test("session panel shows save results, errors and ignores stale notifications", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(await fs.readFile(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const { window } = dom;
        let recibir;
        let llamadas = 0;
        const sesion = { cantidad: 2, guardada: true, revision: 1, error: "", bloqueada: false };
        window.patagonia = {
            recibirSesion: fn => { recibir = fn; },
            obtenerSesion: async () => ({ correcto: true, sesion }),
            guardarSesion: async () => { llamadas++; return { correcto: false, error: "Disco lleno" }; }
        };
        window.document.getElementById("abrirSesiones").scrollIntoView = () => {};
        window.eval(await fs.readFile(path.join(__dirname, "../ui/modules/sessions.js"), "utf8"));
        window.document.getElementById("abrirSesiones").click();
        await new Promise(resolve => setImmediate(resolve));
        const estado = window.document.getElementById("estadoSesion");
        assert.match(estado.textContent, /2 pestaña/);
        window.document.getElementById("guardarSesion").click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(llamadas, 1);
        assert.equal(estado.textContent, "Disco lleno");
        recibir({ ...sesion, revision: 3, error: "Archivo ilegible", bloqueada: true });
        recibir(sesion);
        assert.equal(estado.textContent, "Archivo ilegible");
        assert.equal(window.document.getElementById("guardarSesion").disabled, true);
    } finally { dom.window.close(); }
});
