const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

// Solo Electron se simula: el motor, parser de listas y serialización son reales.
const handlers = new Map();
const cargar = Module._load;
Module._load = function (id, ...args) {
    if (id === 'electron') return {
        ipcMain: {
            handle: (canal, handler) => handlers.set(canal, handler),
            removeHandler: canal => handlers.delete(canal)
        }
    };
    return cargar.call(this, id, ...args);
};
let ElectronBlocker, crearProteccion, crearLoteScriptlets;
try {
    ({ ElectronBlocker } = require('@ghostery/adblocker-electron'));
    ({ crearProteccion, crearLoteScriptlets } = require('../src/main/adblocker'));
} finally { Module._load = cargar; }

// Reproducción mínima del fallo: dos scripts redeclaran un helper global cuyo
// proxy conserva una referencia al nombre del helper, no a su valor anterior.
const helper = `function instalarProxy() {
    instalarProxy.original = Function.prototype.toString;
    Function.prototype.toString = new Proxy(Function.prototype.toString, {
        apply(target, receiver) { return instalarProxy.original.call(receiver); }
    });
}`;
const scriptlet = `${helper}\ninstalarProxy();`;

function contexto() { return vm.createContext({}); }
function comprobarToString(c) {
    return vm.runInContext('Function.prototype.toString.call(function ejemplo() {})', c);
}

test('reproduce la recursión original y la corrige conservando los dos scripts', () => {
    const original = contexto();
    vm.runInContext(scriptlet, original);
    vm.runInContext(scriptlet, original);
    assert.throws(() => comprobarToString(original), /Maximum call stack size exceeded/);
    const corregido = contexto();
    const fallos = vm.runInContext(crearLoteScriptlets([scriptlet, scriptlet]), corregido);
    assert.equal(fallos.length, 0);
    assert.match(comprobarToString(corregido), /function ejemplo/);
    assert.equal(vm.runInContext('typeof instalarProxy', corregido), 'undefined');
});

test('un script fallido se informa sin impedir los siguientes', () => {
    const c = contexto();
    const fallos = vm.runInContext(crearLoteScriptlets([
        'throw new Error("fallo controlado")', 'globalThis.siguiente = true;'
    ]), c);
    assert.equal(fallos.length, 1);
    assert.equal(fallos[0].indice, 0);
    assert.equal(fallos[0].mensaje, 'fallo controlado');
    assert.equal(c.siguiente, true);
});

async function preparar(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'patagonia-adblock-test-'));
    const red = {};
    const sesion = {
        webRequest: {
            onBeforeRequest: (...args) => { red.antes = args.at(-1); },
            onHeadersReceived: (...args) => { red.cabeceras = args.at(-1); }
        },
        registerPreloadScript: () => 'preload-prueba',
        unregisterPreloadScript: () => {}
    };
    const reglas = [
        '||tracker.invalid^$third-party',
        '||anuncios.invalid^',
        'chatgpt.com,www.youtube.com##.publicidad',
        ...Array.from({ length: 30 }, (_, i) => `chatgpt.com,www.youtube.com##+js(prueba-proxy, ${i})`)
    ];
    const engine = ElectronBlocker.parse(reglas.join('\n'));
    engine.updateResources(JSON.stringify({
        redirects: [],
        scriptlets: [
            { name: 'instalarProxy.fn', aliases: [], dependencies: [], body: helper },
            { name: 'prueba-proxy.js', aliases: ['prueba-proxy'], dependencies: ['instalarProxy.fn'],
              body: 'function pruebaProxy() { instalarProxy(); globalThis.aplicados = (globalThis.aplicados || 0) + 1; }' }
        ]
    }), 'fixture-local');
    const incluido = path.join(dir, 'incluido.bin');
    await fs.writeFile(incluido, engine.serialize());
    let c = contexto();
    const ejecuciones = [], estilos = [];
    const marco = {
        url: 'https://chatgpt.com/', detached: false, isDestroyed: () => false,
        async executeJavaScript(script, gesto) {
            ejecuciones.push({ script, gesto });
            return vm.runInContext(script, c);
        }
    };
    const contenido = {
        id: 17, session: sesion, mainFrame: marco, isDestroyed: () => false,
        async insertCSS(css, opciones) { estilos.push({ css, opciones }); return 'css'; },
        executeJavaScript() { assert.fail('No debe esperar did-stop-loading en webContents'); }
    };
    const gestor = crearProteccion({
        sesion, directorioDatos: dir, rutaMotorIncluido: incluido,
        obtenerURLPrincipal: id => id === 17 ? marco.url : '', fetchImpl: null
    });
    t.after(async () => { gestor.cerrar(); await fs.rm(dir, { recursive: true, force: true }); });
    await gestor.iniciar();
    const evento = { sender: contenido, senderFrame: marco, frameId: 1, processId: 2 };
    const inyectar = (...args) => handlers.get('@ghostery/adblocker/inject-cosmetic-filters')(...args);
    return { gestor, red, contenido, marco, evento, inyectar, ejecuciones, estilos,
        nuevoDocumento(url) { marco.url = url; c = contexto(); },
        contexto: () => c };
}

test('30 scriptlets de prueba procesados por el motor real se envían en un lote sin recursión', async t => {
    const p = await preparar(t);
    for (const url of ['https://chatgpt.com/', 'https://www.youtube.com/watch?v=prueba']) {
        p.nuevoDocumento(url);
        const antes = p.ejecuciones.length;
        await p.inyectar(p.evento, url);
        assert.equal(p.ejecuciones.length - antes, 1);
        assert.equal(p.contexto().aplicados, 30);
        assert.match(comprobarToString(p.contexto()), /function ejemplo/);
        assert.notEqual(p.ejecuciones.at(-1).gesto, true);
        assert.equal(p.gestor.estado(17, url).activa, true);
        await p.inyectar(p.evento, url, { classes: ['publicidad'], ids: [], hrefs: [] });
        assert.equal(p.contexto().aplicados, 30, 'la actualización DOM no reinstala los scripts');
    }
    assert.ok(p.estilos.some(x => x.css.includes('publicidad')));
});

test('conserva bloqueo de red, contadores y excepciones por sitio', async t => {
    const p = await preparar(t);
    const detalle = { id: 1, webContentsId: 17, resourceType: 'script',
        url: 'https://tracker.invalid/pixel.js', referrer: 'https://chatgpt.com/' };
    let respuesta;
    p.red.antes(detalle, r => { respuesta = r; });
    assert.equal(respuesta.cancel, true);
    await Promise.resolve(); // El motor notifica los bloqueos en una microtarea.
    assert.equal(p.gestor.estado(17, detalle.referrer).total, 1);
    await p.gestor.alternarSitio(17, detalle.referrer);
    p.red.antes(detalle, r => { respuesta = r; });
    assert.equal(respuesta.cancel, undefined);
    await p.inyectar(p.evento, detalle.referrer);
    assert.equal(p.ejecuciones.length, 0);
    await p.gestor.alternarSitio(17, detalle.referrer);
    await p.inyectar(p.evento, detalle.referrer);
    assert.equal(p.ejecuciones.length, 1);
    assert.equal(p.gestor.estado(17, detalle.referrer).activa, true);
});

test('rechaza iframes, sesiones ajenas y páginas internas; usa la URL del marco', async t => {
    const p = await preparar(t);
    await p.inyectar({ ...p.evento, senderFrame: { ...p.marco } }, p.marco.url);
    await p.inyectar({ ...p.evento, sender: { ...p.contenido, session: {} } }, p.marco.url);
    p.marco.detached = true;
    await p.inyectar(p.evento, p.marco.url);
    p.marco.detached = false;
    p.marco.url = 'file:///interfaz.html';
    await p.inyectar(p.evento, 'https://chatgpt.com/');
    assert.equal(p.ejecuciones.length, 0);
    p.marco.url = 'https://example.com/';
    await p.inyectar(p.evento, 'https://chatgpt.com/');
    assert.equal(p.ejecuciones.length, 0, 'no debe usar la URL enviada por IPC');
});

test('captura rechazos asíncronos de JavaScript y CSS', async t => {
    const p = await preparar(t);
    const errores = [];
    const anterior = console.error;
    console.error = (...args) => errores.push(args);
    try {
        p.marco.executeJavaScript = async () => { throw new Error('marco reemplazado'); };
        p.contenido.insertCSS = async () => { throw new Error('CSS cancelado'); };
        await assert.doesNotReject(p.inyectar(p.evento, p.marco.url));
        assert.equal(errores.length, 2);
    } finally { console.error = anterior; }
});
