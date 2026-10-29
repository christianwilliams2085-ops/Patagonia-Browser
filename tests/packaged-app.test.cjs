const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const asar = require('@electron/asar');
const { verificarPaquete } = require('../scripts/verify-packaged-app.cjs');

async function paquete(t, omitir = '') {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'patagonia-asar-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    const fuente = path.join(dir, 'fuente');
    const salida = path.join(dir, 'salida');
    const archivos = ['bootstrap.js', 'main.js', 'preload.js', 'renderer.js', 'index.html',
        'src/main/siteCompatibility.js', 'ui/new-tab.html', 'assets/patagonia-adblock.bin',
        'assets/patagonia-oficial.ico', 'LICENSE'];
    for (const nombre of archivos.filter(nombre => nombre !== omitir)) {
        await fs.mkdir(path.dirname(path.join(fuente, nombre)), { recursive: true });
        await fs.writeFile(path.join(fuente, nombre), 'fixture');
    }
    await fs.writeFile(path.join(fuente, 'package.json'), JSON.stringify({ main: 'bootstrap.js', version: '1.0.4' }));
    await fs.mkdir(path.join(salida, 'resources'), { recursive: true });
    await fs.writeFile(path.join(salida, 'Patagonia Browser.exe'), 'fixture');
    await asar.createPackage(fuente, path.join(salida, 'resources/app.asar'));
    return salida;
}
test('verifica el contenido real del ASAR distribuido', async t => {
    assert.deepEqual(verificarPaquete(await paquete(t)), { main: 'bootstrap.js', version: '1.0.4' });
});
test('rechaza un ejecutable presente con ASAR sin su archivo de arranque', async t => {
    const salida = await paquete(t, 'bootstrap.js');
    assert.throws(() => verificarPaquete(salida), /bootstrap/);
});
