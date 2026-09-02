const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { registrarErroresCarga } = require('../src/main/loadErrors');
const { recargar } = require('../src/main/navigation');

function fixture() {
    const wc = new EventEmitter();
    wc.isDestroyed = () => false;
    const state = { visible: true };
    wc.loadURL = async url => { state.loaded = url; };
    const tab = { url: 'https://example.com', vista: {
        webContents: wc, setVisible: value => { state.visible = value; }
    } };
    registrarErroresCarga(tab, () => {});
    return { wc, state, tab };
}

test('main-frame failures hide only the failed tab and retry its URL', async () => {
    const { wc, state, tab } = fixture();
    const other = fixture();
    wc.emit('did-fail-load', {}, -105, 'DNS', tab.url, true);
    assert.match(tab.errorCarga.mensaje, /No encontramos/);
    assert.equal(state.visible, false);
    assert.equal(other.state.visible, true);
    await recargar(tab);
    assert.equal(state.loaded, 'https://example.com');
    wc.emit('did-start-navigation', {}, tab.url, false, true);
    assert.equal(tab.errorCarga, null);
    assert.equal(state.visible, true);
});

test('subframes, aborted navigations and stale failures do not replace a page', () => {
    const { wc, state, tab } = fixture();
    wc.emit('did-fail-load', {}, -105, 'DNS', 'https://ads.example', false);
    wc.emit('did-fail-load', {}, -3, 'ABORT', tab.url, true);
    assert.equal(tab.errorCarga, undefined);
    wc.emit('did-start-navigation', {}, 'https://new.example', false, true);
    wc.emit('did-fail-load', {}, -105, 'DNS', 'https://example.com', true);
    assert.equal(tab.errorCarga, null);
    assert.equal(state.visible, true);
});

test('certificate failure after redirect preserves the failed destination', () => {
    const { wc, tab } = fixture();
    wc.emit('did-redirect-navigation', {}, 'https://redirect.example', false, true);
    wc.emit('did-fail-load', {}, -201, 'CERT', 'https://redirect.example', true);
    assert.match(tab.errorCarga.mensaje, /segura/);
    assert.equal(tab.errorCarga.url, 'https://redirect.example');
});
