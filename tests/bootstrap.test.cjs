const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function arrancar({ squirrel = false, windowsStore = false } = {}) {
    const llamadas = [];
    const ejecutar = vm.runInNewContext('(function(require, process){' +
        fs.readFileSync(path.join(__dirname, '../bootstrap.js'), 'utf8') + '\n})');
    ejecutar(id => {
        llamadas.push(id);
        if (id === 'electron') return { app: { quit: () => llamadas.push('quit') } };
        if (id === 'electron-squirrel-startup') return squirrel;
        if (id === '@ghostery/adblocker-electron') return { ElectronBlocker: class {} };
        if (id === './src/main/siteCompatibility') return {
            instalarCompatibilidadGhostery: () => llamadas.push('compatibilidad')
        };
        if (id !== './main.js') assert.fail(id);
    }, { windowsStore });
    return llamadas;
}

test('el arranque real atiende Squirrel antes de cargar Ghostery o la aplicacion', () => {
    const llamadas = arrancar({ squirrel: true });
    assert.ok(llamadas.includes('quit'));
    assert.ok(!llamadas.includes('@ghostery/adblocker-electron'));
    assert.ok(!llamadas.includes('./main.js'));
});

test('MSIX no ejecuta operaciones Squirrel y configura proteccion antes de main', () => {
    const llamadas = arrancar({ windowsStore: true });
    assert.ok(!llamadas.includes('electron-squirrel-startup'));
    assert.ok(llamadas.indexOf('compatibilidad') < llamadas.indexOf('./main.js'));
});
