const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { EventEmitter } = require("node:events");
const {
    extraerURLApp, nombreArchivoSeguro, pngAIco, esIco, prepararIcono,
    ejecutableEstable, crearAccesoDirecto, crearVentanaApp
} = require("../src/main/webApps");
const { registrarInstanciaUnica } = require("../src/main/lifecycle");

test("only web URLs without credentials are accepted from the command line", () => {
    assert.equal(extraerURLApp(["app.exe", "--patagonia-app=http://192.168.0.1"]), "http://192.168.0.1/");
    assert.equal(extraerURLApp(["--patagonia-app=\"https://example.com/a b\""]), "https://example.com/a%20b");
    for (const malo of ["file:///C:/Windows", "javascript:alert(1)", "https://u:p@example.com", "nada"]) {
        assert.equal(extraerURLApp([`--patagonia-app=${malo}`]), null);
    }
    assert.equal(extraerURLApp(["app.exe", "--otra"]), null);
});

test("shortcut names are safe for Windows", () => {
    assert.equal(nombreArchivoSeguro("Router: TP-Link / AX55?", "http://192.168.0.1/"), "Router TP-Link AX55");
    assert.equal(nombreArchivoSeguro("   ...", "http://192.168.0.1/"), "192.168.0.1");
    assert.equal(nombreArchivoSeguro("CON", "https://example.com"), "CON (app)");
    assert.equal(nombreArchivoSeguro("x".repeat(200), "https://example.com").length, 60);
});

test("PNG icons are wrapped as valid ICO files", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
    const ico = pngAIco(png, 256, 32);
    assert.ok(esIco(ico));
    assert.equal(ico.readUInt8(6), 0);
    assert.equal(ico.readUInt8(7), 32);
    assert.equal(ico.readUInt32LE(14), png.length);
    assert.deepEqual(ico.subarray(22), png);
});

test("icons fall back to Patagonia when the site icon is missing or broken", async t => {
    const carpeta = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-apps-"));
    t.after(() => fs.rm(carpeta, { recursive: true, force: true }));
    const vacia = { createFromBuffer: () => ({ isEmpty: () => true }) };
    const base = { nativeImage: vacia, carpeta, url: "http://192.168.0.1/", iconoRespaldo: "patagonia.ico" };
    assert.equal(await prepararIcono({ ...base, favicon: "", descargar: async () => assert.fail() }), "patagonia.ico");
    assert.equal(await prepararIcono({ ...base, favicon: "file:///x.ico", descargar: async () => assert.fail() }), "patagonia.ico");
    assert.equal(await prepararIcono({ ...base, favicon: "http://a/f.ico", descargar: async () => { throw new Error("x"); } }), "patagonia.ico");
    assert.equal(await prepararIcono({ ...base, favicon: "http://a/f.png", descargar: async () => Buffer.from("zzz") }), "patagonia.ico");
    const ico = pngAIco(Buffer.from("png"), 16, 16);
    const ruta = await prepararIcono({ ...base, favicon: "http://a/f.ico", descargar: async () => ico });
    assert.equal(path.dirname(ruta), carpeta);
    assert.deepEqual(await fs.readFile(ruta), ico);
});

test("Squirrel installs use the stable launcher so shortcuts survive updates", () => {
    const raiz = path.join("C:", "Users", "colo", "AppData", "Local", "PatagoniaBrowser");
    const exe = path.join(raiz, "app-1.0.6", "Patagonia Browser.exe");
    const existe = ruta => [path.join(raiz, "Update.exe"), path.join(raiz, "Patagonia Browser.exe")].includes(ruta);
    assert.equal(ejecutableEstable(exe, existe), path.join(raiz, "Patagonia Browser.exe"));
    assert.equal(ejecutableEstable(exe, () => false), exe);
    const portable = path.join("D:", "Patagonia", "Patagonia Browser.exe");
    assert.equal(ejecutableEstable(portable, () => true), portable);
});

test("the desktop shortcut opens the page as an app with its icon", async () => {
    const llamadas = [];
    const shell = { writeShortcutLink: (...args) => { llamadas.push(args); return true; } };
    const { nombre, ruta } = await crearAccesoDirecto({
        shell, escritorio: "Escritorio", ejecutable: "Patagonia Browser.exe",
        url: "http://192.168.0.1", titulo: "Router", icono: "router.ico"
    });
    assert.equal(nombre, "Router");
    assert.equal(ruta, path.join("Escritorio", "Router.lnk"));
    assert.equal(llamadas[0][1], "create");
    assert.equal(llamadas[0][2].target, "Patagonia Browser.exe");
    assert.equal(llamadas[0][2].args, "--patagonia-app=\"http://192.168.0.1/\"");
    assert.equal(llamadas[0][2].icon, "router.ico");
    await assert.rejects(crearAccesoDirecto({ shell, escritorio: "E", ejecutable: "x", url: "file:///c", titulo: "x", icono: "i" }));
    await assert.rejects(crearAccesoDirecto({ shell: { writeShortcutLink: () => false }, escritorio: "E", ejecutable: "x", url: "https://a.com", titulo: "x", icono: "i" }));
});

function ventanaFalsa() {
    const contenido = new EventEmitter();
    contenido.cargadas = [];
    contenido.loadURL = url => { contenido.cargadas.push(url); return Promise.resolve(); };
    contenido.setWindowOpenHandler = handler => { contenido.abrir = handler; };
    contenido.reload = () => { contenido.recargada = true; };
    class Ventana extends EventEmitter {
        constructor(opciones) { super(); this.opciones = opciones; this.webContents = contenido; Ventana.ultima = this; }
        isDestroyed() { return false; }
        setTitle(titulo) { this.titulo = titulo; }
        show() { this.mostrada = true; }
        close() { this.cerrada = true; }
    }
    return Ventana;
}

test("app windows stay sandboxed and send other sites to the browser", () => {
    const Ventana = ventanaFalsa();
    const enviadas = [];
    const preferencias = { contextIsolation: true, nodeIntegration: false, sandbox: true };
    const ventana = crearVentanaApp({ BrowserWindow: Ventana, url: "http://192.168.0.1/", icono: "i.ico", preferencias, abrirEnNavegador: u => enviadas.push(u) });
    assert.deepEqual(ventana.opciones.webPreferences, preferencias);
    assert.equal(ventana.opciones.webPreferences.preload, undefined);
    const contenido = ventana.webContents;
    assert.deepEqual(contenido.cargadas, ["http://192.168.0.1/"]);
    assert.deepEqual(contenido.abrir({ url: "https://tp-link.com" }), { action: "deny" });
    assert.deepEqual(contenido.abrir({ url: "file:///c:/" }), { action: "deny" });
    let bloqueos = 0;
    const evento = { preventDefault: () => { bloqueos++; } };
    contenido.emit("will-navigate", evento, "http://192.168.0.1/otra");
    assert.equal(bloqueos, 0);
    contenido.emit("will-navigate", evento, "https://example.com/");
    contenido.emit("will-navigate", evento, "file:///c:/");
    assert.equal(bloqueos, 2);
    assert.deepEqual(enviadas, ["https://tp-link.com/", "https://example.com/"]);
    contenido.emit("before-input-event", evento, { type: "keyDown", key: "F5" });
    assert.equal(contenido.recargada, true);
    contenido.emit("page-title-updated", evento, "Router");
    assert.equal(ventana.titulo, "Router");
    ventana.emit("ready-to-show");
    assert.equal(ventana.mostrada, true);
});

test("a second launch with an app shortcut is handled instead of focusing the browser", () => {
    const app = new EventEmitter();
    app.requestSingleInstanceLock = () => true;
    const atendidos = [];
    let enfocada = 0;
    const ventana = { isDestroyed: () => false, isMinimized: () => false, show() {}, focus: () => { enfocada++; } };
    registrarInstanciaUnica(app, () => ventana, argv => { atendidos.push(argv); return argv.includes("--app"); });
    app.emit("second-instance", {}, ["exe", "--app"]);
    assert.equal(enfocada, 0);
    app.emit("second-instance", {}, ["exe"]);
    assert.equal(enfocada, 1);
    assert.equal(atendidos.length, 2);
});
