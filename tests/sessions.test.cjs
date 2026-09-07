const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { pathToFileURL } = require("node:url");
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

test("saving drains navigation changes that arrive during a slow disk write", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    await gestor.iniciar();
    const rename = fs.rename;
    let empezar;
    let terminar;
    const escribiendo = new Promise(resolve => { empezar = resolve; });
    const continuar = new Promise(resolve => { terminar = resolve; });
    t.after(() => terminar());
    let escrituras = 0;
    t.mock.method(fs, "rename", async (origen, destino) => {
        if (destino === archivo && ++escrituras === 1) { empezar(); await continuar; }
        return rename(origen, destino);
    });
    gestor.actualizar(paginas, 4);
    const guardando = gestor.guardarAhora();
    await escribiendo;
    gestor.actualizar([paginas[1]], 9);
    terminar();
    await guardando;
    assert.equal(gestor.estado().guardada, true);
    assert.deepEqual(JSON.parse(await fs.readFile(archivo, "utf8")), crearInstantanea([paginas[1]], 9));
});

test("a failed slow write preserves the newest pending tabs for the next retry", async t => {
    const { archivo } = await fixture(t);
    const gestor = crearGestorSesion(archivo);
    await gestor.iniciar();
    const rename = fs.rename;
    let empezar;
    let terminar;
    const escribiendo = new Promise(resolve => { empezar = resolve; });
    const continuar = new Promise(resolve => { terminar = resolve; });
    t.after(() => terminar());
    let primera = true;
    t.mock.method(fs, "rename", async (origen, destino) => {
        if (destino === archivo && primera) {
            primera = false;
            empezar(); await continuar;
            throw new Error("Disco lleno");
        }
        return rename(origen, destino);
    });
    gestor.actualizar(paginas, 4);
    const fallo = assert.rejects(gestor.guardarAhora(), /No pudimos guardar/);
    await escribiendo;
    gestor.actualizar([paginas[1]], 9);
    const reintento = gestor.guardarAhora();
    terminar();
    await Promise.all([fallo, reintento]);
    assert.equal(gestor.estado().guardada, true);
    assert.equal(gestor.estado().error, "");
    assert.deepEqual(JSON.parse(await fs.readFile(archivo, "utf8")), crearInstantanea([paginas[1]], 9));
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

for (const restaurar of [true, false]) test(`main startup respects restore=${restaurar}, configured homepage and shell reload`, async t => {
    const { dir, archivo } = await fixture(t);
    await fs.writeFile(archivo, JSON.stringify(crearInstantanea(paginas, 4)));
    await fs.writeFile(path.join(dir, "configuracion.json"), JSON.stringify({ inicio: "https://home.example/", restaurar }));
    const app = new EventEmitter();
    app.requestSingleInstanceLock = () => true;
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
    const manejadores = {};
    ipcMain.handle = (nombre, fn) => { manejadores[nombre] = fn; };
    const Menu = { buildFromTemplate: datos => datos, setApplicationMenu() {} };
    const sesionElectron = {
        setPermissionCheckHandler(fn) { this.comprobarPermiso = fn; },
        setPermissionRequestHandler(fn) { this.solicitarPermiso = fn; }
    };
    const preguntasPermisos = [];
    const dialog = { showMessageBox: (_ventana, opciones) => new Promise(resolve => {
        preguntasPermisos.push(opciones);
        opciones.signal.addEventListener("abort", () => resolve({ response: 0 }), { once: true });
    }) };
    const vistas = [];
    const mensajes = [];
    let ventana;
    let siguienteContenido = 0;
    class Contenido extends EventEmitter {
        mainFrame = {};
        identificador = ++siguienteContenido;
        destruido = false;
        cargando = false;
        puedeVolver = false;
        puedeAvanzar = false;
        detenciones = 0;
        navigationHistory = { canGoBack: () => this.puedeVolver, canGoForward: () => this.puedeAvanzar };
        isLoading() { return this.cargando; }
        getURL() { return this.confirmada || this.cargada || ""; }
        getTitle() { return "Página de prueba"; }
        stop() { this.detenciones++; this.cargando = false; this.emit("did-stop-loading"); }
        send(canal, datos) { mensajes.push({ canal, datos }); }
        isDestroyed() { return this.destruido; }
        get id() {
            if (this.destruido) throw new Error("No se puede consultar una pestaña destruida");
            return this.identificador;
        }
        close() { this.emit("did-stop-loading"); this.destruido = true; this.emit("destroyed"); }
        setWindowOpenHandler(fn) { this.abrirVentana = fn; }
        async loadURL(url, opciones) { this.cargada = url; this.opcionesCarga = opciones; }
        findInPage() { return 1; }
        stopFindInPage() {}
        focus() {}
    }
    class Vista {
        constructor(opciones = {}) { this.webContents = opciones.webContents || new Contenido(); vistas.push(this); }
        setBounds(valor) { this.limites = valor; }
    }
    let cargaLista;
    const lista = new Promise(resolve => { cargaLista = resolve; });
    class Ventana extends EventEmitter {
        destruida = false;
        webContents = new Contenido();
        contentView = { addChildView: vista => { this.activa = vista; }, removeChildView: () => {} };
        constructor() { super(); ventana = this; }
        isDestroyed() { return this.destruida; }
        close() {
            let impedido = false;
            this.emit("close", { preventDefault: () => { impedido = true; } });
            if (impedido) return;
            this.destruida = true;
            this.emit("closed");
            app.emit("window-all-closed");
        }
        getContentSize() { return [1400, 900]; }
        center() {} show() {} restore() {} focus() {}
        loadFile() { setImmediate(() => { this.webContents.emit("did-finish-load"); cargaLista(); }); return Promise.resolve(); }
    }
    const navegador = { ...require("../src/main/navigation"), navegar: (p, url) => { p.vista.destino = url; } };
    const paginaNueva = pathToFileURL(path.join(__dirname, "../ui/new-tab.html")).href;
    const requirePrueba = nombre => {
        if (nombre === "electron") return { app, ipcMain, Menu, BrowserWindow: Ventana, WebContentsView: Vista, session: { defaultSession: sesionElectron }, shell: {}, dialog };
        if (nombre === "electron-squirrel-startup") return false;
        if (nombre === "path") return path;
        if (nombre === "node:url") return require("node:url");
        if (nombre.endsWith("/sessions")) return { registrarSesiones, crearInstantanea };
        if (nombre.endsWith("/settings")) return require("../src/main/settings");
        if (nombre.endsWith("/security")) return require("../src/main/security");
        if (nombre.endsWith("/shortcuts")) return require("../src/main/shortcuts");
        if (nombre.endsWith("/lifecycle")) return require("../src/main/lifecycle");
        if (nombre.endsWith("/newWindows")) return require("../src/main/newWindows");
        if (nombre.endsWith("/find")) return require("../src/main/find");
        if (nombre.endsWith("/menu")) return require("../src/main/menu");
        if (nombre.endsWith("/permissions")) return require("../src/main/permissions");
        if (nombre.endsWith("/adblocker")) return { crearProteccion: () => ({
            iniciar: () => Promise.resolve(), esperar: async () => {}, cerrar() {}, actualizarSiHaceFalta() {}, reiniciarPestana() {}, olvidarPestana() {},
            estado: () => ({ disponible: true, sitio: "", activa: false, permitida: false, anuncios: 0, rastreadores: 0, total: 0 })
        }) };
        if (nombre.endsWith("/closedTabs")) return require("../src/main/closedTabs");
        if (nombre.endsWith("/constants")) return { ALTURA_BARRA: 108, ALTURA_BUSQUEDA: 44, ANCHO_BARRA_LATERAL: 320, PAGINA_INICIO: "https://www.google.com" };
        if (nombre.endsWith("/navigation")) return navegador;
        if (nombre.endsWith("/history")) return { registrarHistorial: () => Object.assign(() => {}, { esperar: () => Promise.resolve() }) };
        if (nombre.endsWith("/downloads")) return { registrarDescargas: () => ({ contarActivas: () => 0 }) };
        if (nombre.endsWith("/bookmarks")) return require("../src/main/bookmarks");
        if (nombre.endsWith("/loadErrors")) return { registrarErroresCarga: () => {} };
        return {};
    };
    require("node:vm").runInNewContext("(function () {\n" + await fs.readFile(path.join(__dirname, "../main.js"), "utf8") + "\n})();", {
        require: requirePrueba, __dirname: path.join(__dirname, ".."), console: { log() {}, error() {} },
        process: { platform: "win32", on() {} }
    });
    await lista;
    assert.equal(typeof sesionElectron.comprobarPermiso, "function");
    assert.equal(typeof sesionElectron.solicitarPermiso, "function");
    if (!restaurar) {
        assert.deepEqual(vistas.map(v => v.webContents.cargada), [paginaNueva]);
        ventana.close();
        await salida;
        assert.deepEqual((await crearGestorSesion(archivo).iniciar()).pestanas, []);
        return;
    }
    assert.deepEqual(vistas.map(v => v.destino), paginas.map(p => p.url));
    assert.equal(ventana.activa, vistas[0]);
    mensajes.length = 0;
    ventana.webContents.emit("did-finish-load");
    assert.equal(vistas.length, 2);
    assert.ok(mensajes.some(m => m.canal === "pestanas-actualizadas" && m.datos.length === 2));
    assert.ok(mensajes.some(m => m.canal === "estado-barra-lateral"));
    const eventoUI = { sender: ventana.webContents, senderFrame: ventana.webContents.mainFrame };
    ipcMain.emit("abrir-busqueda", eventoUI);
    assert.equal(ventana.activa.limites.y, 152);
    assert.equal(ventana.activa.limites.height, 748);
    vistas[0].webContents.confirmada = paginas[0].url;
    const permisoPendiente = new Promise(resolve => sesionElectron.solicitarPermiso(
        vistas[0].webContents, "geolocation", resolve, { requestingUrl: paginas[0].url, isMainFrame: true }
    ));
    assert.equal(preguntasPermisos.length, 1);
    ipcMain.emit("activar-pestana", eventoUI, 2);
    assert.equal(await permisoPendiente, false);
    assert.equal(preguntasPermisos[0].signal.aborted, true);
    assert.equal(ventana.activa.limites.y, 108);
    assert.equal(mensajes.filter(m => m.canal === "estado-busqueda").at(-1).datos.abierta, false);
    const paginaActiva = ventana.activa.webContents;
    paginaActiva.puedeVolver = true;
    paginaActiva.confirmada = paginas[1].url;
    paginaActiva.cargando = true;
    paginaActiva.emit("did-start-loading");
    const estadoCargando = mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.find(p => p.activa);
    assert.equal(estadoCargando.cargando, true);
    assert.equal(estadoCargando.puedeRetroceder, true);
    assert.equal(estadoCargando.puedeAvanzar, false);
    ipcMain.emit("detener-carga", { sender: {}, senderFrame: {} });
    assert.equal(paginaActiva.detenciones, 0);
    ipcMain.emit("detener-carga", eventoUI);
    assert.equal(paginaActiva.detenciones, 1);
    assert.equal(vistas[0].webContents.detenciones, 0);
    assert.equal(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.find(p => p.activa).cargando, false);
    assert.equal(mensajes.filter(m => m.canal === "url-actualizada").at(-1).datos, paginas[1].url);
    ipcMain.emit("nueva-pestana", { sender: {}, senderFrame: {} });
    assert.equal(vistas.length, 2);
    ipcMain.emit("nueva-pestana", eventoUI);
    assert.equal(vistas[2].webContents.cargada, paginaNueva);
    vistas[2].webContents.confirmada = "https://closed.example/";
    vistas[2].webContents.emit("did-navigate", {}, "https://closed.example/");
    ipcMain.emit("cerrar-pestana", eventoUI, 3);
    let atajoBloqueado = false;
    ventana.webContents.emit("before-input-event", { preventDefault: () => { atajoBloqueado = true; } },
        { type: "keyDown", key: "T", control: true, shift: true });
    assert.equal(atajoBloqueado, true);
    assert.equal(vistas[3].destino, "https://closed.example/");
    assert.equal(ventana.activa, vistas[3]);
    vistas[3].webContents.close();
    assert.equal(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.length, 2);
    const activaAntes = ventana.activa;
    const abrirFondo = vistas[0].webContents.abrirVentana({ url: "https://background.example/", disposition: "background-tab" });
    const fondo = abrirFondo.createWindow({ webPreferences: {} });
    assert.equal(fondo.cargada, "https://background.example/");
    assert.equal(ventana.activa, activaAntes);
    assert.ok(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.some(p => p.url === fondo.cargada && !p.activa));
    fondo.close();
    assert.equal(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.length, 2);
    ventana.webContents.emit("before-input-event", { preventDefault() {} },
        { type: "keyDown", key: "t", control: true, shift: true });
    assert.equal(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.length, 2);
    const nativo = new Contenido();
    const abrirNativo = vistas[0].webContents.abrirVentana({ url: "https://form.example/", disposition: "foreground-tab" });
    assert.equal(abrirNativo.createWindow({ webContents: nativo, webPreferences: {} }), nativo);
    assert.equal(nativo.cargada, undefined);
    assert.equal(ventana.activa.webContents, nativo);
    nativo.close();
    assert.equal(mensajes.filter(m => m.canal === "pestanas-actualizadas").at(-1).datos.length, 2);
    vistas[0].webContents.emit("did-navigate-in-page", {}, "https://frame.example/", false);
    vistas[1].webContents.emit("did-navigate", {}, "https://changed.example/");
    ipcMain.emit("activar-pestana", eventoUI, 2);
    vistas[1].webContents.confirmada = "https://changed.example/";
    const archivoFavoritos = path.join(dir, "favoritos.json");
    const rename = fs.rename;
    let empezarFavorito;
    let terminarFavorito;
    const escribiendoFavorito = new Promise(resolve => { empezarFavorito = resolve; });
    const continuarFavorito = new Promise(resolve => { terminarFavorito = resolve; });
    t.after(() => terminarFavorito());
    t.mock.method(fs, "rename", async (origen, destino) => {
        if (destino === archivoFavoritos) { empezarFavorito(); await continuarFavorito; }
        return rename(origen, destino);
    });
    const guardandoFavorito = manejadores["alternar-favorito"](eventoUI);
    await escribiendoFavorito;
    ventana.close();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(ventana.isDestroyed(), false);
    terminarFavorito();
    await salida;
    assert.equal((await guardandoFavorito).correcto, true);
    assert.equal(JSON.parse(await fs.readFile(archivoFavoritos, "utf8"))[0].url, "https://changed.example/");
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
