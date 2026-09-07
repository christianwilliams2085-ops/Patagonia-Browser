const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { EventEmitter } = require('node:events');
const { crearGestorSesion } = require('../src/main/sessions');
const archivoMain = path.resolve(__dirname, '../main.js');
const requireMain = createRequire(archivoMain);
const turno = () => new Promise(resolve => setImmediate(resolve));

async function entorno(t) {
    const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'patagonia-integracion-'));
    const archivoSesion = path.join(directorio, 'sesion.json');
    const sesion = crearGestorSesion(archivoSesion);
    await sesion.iniciar();
    const ventanas = [], mensajes = [], errores = [], respuestas = [];
    let siguiente = 1;
    class Contenido extends EventEmitter {
        constructor() {
            super(); this.id = siguiente++; this.url = 'about:blank'; this.destruido = false;
            this.mainFrame = {}; this.sinGuardar = false;
            this.navigationHistory = { canGoBack: () => false, canGoForward: () => false };
        }
        isDestroyed() { return this.destruido; }
        getURL() { return this.url; }
        getTitle() { return 'Prueba'; }
        send(...args) { mensajes.push(args); }
        focus() {}
        stopFindInPage() {}
        setWindowOpenHandler() {}
        async loadURL(url) {
            this.emit('did-start-navigation', {}, url, false, true);
            this.url = url; this.emit('did-navigate', {}, url, 200);
        }
        close({ waitForBeforeUnload } = {}) {
            if (this.destruido) return;
            if (waitForBeforeUnload && this.sinGuardar) this.emit('will-prevent-unload', {});
            else { this.destruido = true; this.emit('destroyed'); }
        }
    }
    class Ventana extends EventEmitter {
        constructor() {
            super(); this.webContents = new Contenido(); this.destruida = false;
            this.contentView = { addChildView() {}, removeChildView() {} };
            ventanas.push(this);
        }
        isDestroyed() { return this.destruida; }
        getContentSize() { return [1000, 800]; }
        center() {} show() {} restore() {} focus() {}
        async loadFile() { queueMicrotask(() => this.webContents.emit('did-finish-load')); }
        close() {
            let cancelado = false;
            this.emit('close', { preventDefault() { cancelado = true; } });
            if (!cancelado) { this.destruida = true; this.emit('closed'); }
        }
    }
    class Vista {
        constructor() { this.contenido = new Contenido(); }
        // Electron puede liberar esta referencia antes de que termine el cierre
        // de la ventana. No basta con conservar un objeto isDestroyed() = true.
        get webContents() { return this.contenido.isDestroyed() ? undefined : this.contenido; }
        setBounds() {}
        setVisible() {}
    }
    const app = new EventEmitter();
    Object.assign(app, { requestSingleInstanceLock: () => true, whenReady: () => new Promise(() => {}), quit() {} });
    const ipcMain = new EventEmitter(); ipcMain.handle = () => {};
    const electron = { app, ipcMain, BrowserWindow: Ventana, WebContentsView: Vista,
        Menu: { buildFromTemplate: () => ({}), setApplicationMenu() {} },
        dialog: { async showMessageBox() { return { response: respuestas.shift() ?? 0 }; } } };
    const codigo = await fs.readFile(archivoMain, 'utf8');
    const modulo = { exports: {} };
    const cargar = id => {
        if (id === 'electron') return electron;
        if (id === 'electron-squirrel-startup') return false;
        if (id === './src/main/adblocker') return {};
        if (id === './ui/modules/pageContext') return { crearContextoPagina: datos => datos };
        if (id === './services/ai') return { procesarConsulta: () => assert.fail('no invocar IA') };
        return requireMain(id);
    };
    const extra = `
        module.exports = {
            crearPestana, cerrarPestana, activarPestana, reabrirUltimaPestana, obtenerURLPrincipal,
            pestanas: () => pestanas, ventana: () => ventanaPrincipal,
            preparar(sesion) {
                gestorSesion = sesion;
                gestorConfiguracion = { estado: () => ({ restaurar: true }), esperar: async () => {} };
                gestorDescargas = { contarActivas: () => 0 };
                gestorFavoritos = { esperar: async () => {} };
                observarVisitas = Object.assign(() => {}, { esperar: async () => {} });
                crearVentana();
            }
        };`;
    const ejecutar = vm.runInNewContext(`(function(require,module,__dirname,process){${codigo}\n${extra}\n})`, {
        console: { log() {}, error(...datos) { errores.push(datos); } }, URL, AbortController,
        setTimeout, clearTimeout, queueMicrotask
    }, { filename: archivoMain });
    const proceso = new EventEmitter(); proceso.platform = 'darwin';
    ejecutar(cargar, modulo, path.dirname(archivoMain), proceso);
    const principal = modulo.exports;
    principal.preparar(sesion);
    await turno();
    t.after(async () => { await sesion.guardarAhora(); await fs.rm(directorio, { force: true, recursive: true }); });
    return { principal, sesion, archivoSesion, ventanas, mensajes, errores, respuestas, app };
}

test('cerrar toda la ventana conserva la sesión y permite recrearla al activar la app', async t => {
    const p = await entorno(t);
    const a = p.principal.crearPestana('https://a.example/');
    p.principal.crearPestana('https://b.example/');
    p.principal.activarPestana(a);
    await p.sesion.guardarAhora();
    const guardada = await fs.readFile(p.archivoSesion, 'utf8');
    const ventana = p.principal.ventana(); ventana.close();
    for (let i = 0; i < 100 && !ventana.isDestroyed(); i++) await turno();
    assert.equal(ventana.isDestroyed(), true);
    await p.sesion.guardarAhora();
    assert.equal(await fs.readFile(p.archivoSesion, 'utf8'), guardada);
    p.app.emit('activate'); await turno();
    assert.equal(p.ventanas.length, 2);
    assert.equal(JSON.stringify(p.principal.pestanas().map(tab => tab.url)), JSON.stringify(['https://a.example/', 'https://b.example/']));
    assert.deepEqual(p.errores, []);
});

test('cancelar un formulario durante el cierre conserva la pestaña y permite reabrir las ya cerradas', async t => {
    const p = await entorno(t);
    p.principal.crearPestana('https://a.example/');
    const id = p.principal.crearPestana('https://formulario.example/');
    p.principal.pestanas().find(tab => tab.id === id).vista.webContents.sinGuardar = true;
    await p.sesion.guardarAhora();
    const ventana = p.principal.ventana(); ventana.close();
    for (let i = 0; i < 100 && p.principal.pestanas().length !== 1; i++) await turno();
    assert.equal(ventana.isDestroyed(), false);
    assert.equal(p.principal.pestanas().length, 1);
    assert.equal(p.principal.pestanas()[0].id, id);
    assert.equal(p.principal.reabrirUltimaPestana(), true);
    assert.equal(p.principal.pestanas()[1].url, 'https://a.example/');
    p.principal.cerrarPestana(id); await turno();
    assert.equal(p.principal.pestanas().length, 2, 'cancelar un cierre individual conserva ambas pestañas');
    p.respuestas.push(1); p.principal.cerrarPestana(id); await turno();
    assert.equal(p.principal.pestanas().length, 1);
    assert.deepEqual(p.errores, []);
});

test('el bloqueador resuelve solicitudes pendientes mientras otras pestañas pierden su contenido', { timeout: 5000 }, async t => {
    const p = await entorno(t);
    const a = p.principal.crearPestana('https://a.example/');
    const b = p.principal.crearPestana('https://b.example/');
    const contenidoA = p.principal.pestanas().find(tab => tab.id === a).vista.webContents;
    const contenidoB = p.principal.pestanas().find(tab => tab.id === b).vista.webContents;
    const idA = contenidoA.id, idB = contenidoB.id;
    const ventana = p.principal.ventana();
    const comprobaciones = [];
    contenidoA.once('destroyed', () => {
        try {
            comprobaciones.push([
                p.principal.pestanas().find(tab => tab.id === a).vista.webContents,
                p.principal.obtenerURLPrincipal(idA),
                p.principal.obtenerURLPrincipal(idB),
                p.principal.obtenerURLPrincipal(-1),
                p.principal.crearPestana('https://tardia.example/'),
                p.principal.reabrirUltimaPestana()
            ]);
            ventana.emit('resize');
        } catch (error) { comprobaciones.push(error); }
    });
    const cerrada = new Promise(resolve => ventana.once('closed', resolve));
    ventana.close();
    await cerrada;
    assert.deepEqual(comprobaciones, [[undefined, '', 'https://b.example/', '', null, false]]);
    assert.equal(p.principal.ventana(), null);
    assert.equal(p.principal.pestanas().length, 0);
    assert.equal(p.principal.obtenerURLPrincipal(idB), '');
    assert.deepEqual(p.errores, []);
});

test('la limpieza final tolera referencias liberadas y cierra las páginas que todavía existen', async t => {
    const p = await entorno(t);
    p.principal.crearPestana('https://a.example/');
    p.principal.crearPestana('https://b.example/');
    const contenidos = p.principal.pestanas().map(tab => tab.vista.webContents);
    contenidos[0].destruido = true;
    const ventana = p.principal.ventana();
    ventana.destruida = true;
    assert.doesNotThrow(() => ventana.emit('closed'));
    assert.equal(p.principal.ventana(), null);
    assert.equal(p.principal.pestanas().length, 0);
    assert.ok(contenidos.every(contenido => contenido.isDestroyed()));
    assert.deepEqual(p.errores, []);
});

test('una operación de Squirrel termina antes de cargar servicios o crear ventanas', async () => {
    let salidas = 0;
    const codigo = await fs.readFile(archivoMain, 'utf8');
    const ejecutar = vm.runInNewContext(`(function(require){${codigo}\n})`);
    ejecutar(id => {
        if (id === 'electron') return { app: { quit() { salidas++; } } };
        if (id === 'electron-squirrel-startup') return true;
        assert.fail(`El instalador intentó iniciar ${id}`);
    });
    assert.equal(salidas, 1);
});
