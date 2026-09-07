const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { crearContextoPagina } = require('../ui/modules/pageContext');
const { procesarConsulta } = require('../services/ai');
const texto = archivo => fs.readFileSync(path.join(__dirname, '..', archivo), 'utf8');
const turno = () => new Promise(resolve => setImmediate(resolve));

test('un error de protección permanece visible después de refrescar contadores', async t => {
    const dom = new JSDOM(texto('index.html'), { runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const w = dom.window; let recibir;
    const estado = { disponible: true, sitio: 'example.com', activa: true, permitida: false, total: 0 };
    w.patagonia = {
        recibirURL() {}, recibirPestanas() {}, recibirEstadoBarraLateral() {},
        recibirProteccion(fn) { recibir = fn; },
        obtenerProteccion: async () => ({ correcto: true, proteccion: estado }),
        alternarProteccionSitio: async () => ({ correcto: false, error: 'Disco lleno' })
    };
    w.PatagoniaFavorites = { actualizarPagina() {} }; w.PatagoniaAssistant = { iniciar: () => true };
    w.eval(texto('renderer.js')); await turno();
    w.document.getElementById('alternarProteccionSitio').click(); await turno();
    recibir({ ...estado, total: 5 });
    assert.equal(w.document.getElementById('detalleProteccion').textContent, 'Disco lleno');
    assert.equal(w.document.getElementById('alternarProteccionSitio').disabled, false);
    recibir({ ...estado, sitio: 'otro.example' });
    assert.doesNotMatch(w.document.getElementById('detalleProteccion').textContent, /Disco lleno/);
});

test('el asistente conserva términos técnicos, paréntesis y oraciones cortas del artículo', async () => {
    const original = 'Compartir\nLa política de privacidad permite compartir esta información. La presión cayó (etapa de separación). Bomba parada.';
    const contexto = crearContextoPagina({ titulo: 'Operación', url: 'https://example.com/', texto: original });
    assert.match(contexto.texto, /política de privacidad permite compartir/);
    assert.doesNotMatch(contexto.texto, /^Compartir /);
    const resultado = await procesarConsulta({ mensaje: 'Resumí esta página', contexto });
    assert.match(resultado.respuesta, /\(etapa de separación\)/);
    assert.match(resultado.respuesta, /Bomba parada\./);
});

test('cerrar el asistente durante una respuesta no roba después el foco; Enter en composición no envía', async t => {
    const dom = new JSDOM(texto('index.html'), { runScripts: 'outside-only' });
    t.after(() => dom.window.close());
    const w = dom.window; let resolver; let llamadas = 0;
    w.patagonia = { procesarConsultaIA: () => { llamadas++; return new Promise(r => { resolver = r; }); } };
    w.eval(texto('ui/modules/assistant.js')); w.PatagoniaAssistant.iniciar(); w.PatagoniaAssistant.abrir();
    const entrada = w.document.getElementById('entradaAsistente'); entrada.value = 'Consulta';
    entrada.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    assert.equal(llamadas, 0);
    const pendiente = w.PatagoniaAssistant.enviarMensaje();
    w.PatagoniaAssistant.cerrar();
    const direccion = w.document.getElementById('direccion'); direccion.focus();
    resolver({ correcto: true, resultado: { respuesta: 'Respuesta local' } }); await pendiente;
    await new Promise(r => setTimeout(r, 120));
    assert.equal(w.document.activeElement, direccion);
});

function paginaNueva(t) {
    const dom = new JSDOM(texto('ui/new-tab.html'), { runScripts: 'outside-only', url: 'https://patagonia.local/' });
    t.after(() => dom.window.close()); const w = dom.window;
    w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    w.HTMLDialogElement.prototype.close = function () { this.open = false; };
    w.eval(texto('ui/new-tab.js'));
    return w;
}
test('agregar desde una pestaña antigua conserva los accesos guardados por otra', t => {
    const w = paginaNueva(t), clave = 'patagonia-accesos-rapidos-v1';
    w.localStorage.setItem(clave, JSON.stringify([{ nombre: 'Otro', url: 'https://otro.example/' }]));
    w.document.getElementById('nombreAcceso').value = 'Nuevo';
    w.document.getElementById('urlAcceso').value = 'https://nuevo.example/';
    w.document.getElementById('formularioAcceso').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.deepEqual(JSON.parse(w.localStorage.getItem(clave)).map(a => a.nombre), ['Otro', 'Nuevo']);
    w.localStorage.setItem(clave, '[]');
    w.dispatchEvent(new w.StorageEvent('storage', { key: clave, newValue: '[]' }));
    assert.equal(w.document.querySelectorAll('.acceso-personalizado').length, 0);
});
test('un error al guardar un acceso conserva el formulario y no muestra un guardado falso', t => {
    const w = paginaNueva(t);
    w.document.getElementById('agregarAcceso').click();
    w.document.getElementById('nombreAcceso').value = 'Ejemplo';
    w.document.getElementById('urlAcceso').value = 'https://example.com/';
    w.Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    w.document.getElementById('formularioAcceso').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(w.document.getElementById('dialogoAcceso').open, true);
    assert.match(w.document.getElementById('errorAcceso').textContent, /No se pudo guardar/);
    assert.equal(w.document.querySelectorAll('.acceso-personalizado').length, 0);
});
