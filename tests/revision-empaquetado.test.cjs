const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { incluirEnPaquete } = require('../scripts/package-files.cjs');
const { construir } = require('../scripts/build-portable.cjs');
const { prepararIntegracion } = require('../scripts/winstaller-hook.cjs');
const raiz = path.resolve(__dirname, '..');
async function temporal(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'patagonia-build-'));
    t.after(() => fs.rm(dir, { recursive: true, force: true })); return dir;
}
async function escribir(dir, nombre, contenido = 'fixture') {
    const archivo = path.join(dir, nombre); await fs.mkdir(path.dirname(archivo), { recursive: true });
    await fs.writeFile(archivo, contenido);
}

test('el filtro de distribución conserva recursos y excluye diagnósticos, respaldos y perfiles', () => {
    for (const ruta of ['/', '/main.js', '/src/main/pageSnapshot.js', '/ui/new-tab.html', '/assets/patagonia-adblock.bin', '/node_modules/lib/index.js']) assert.equal(incluirEnPaquete(ruta), true, ruta);
    for (const ruta of ['/patagonia-diagnostico.zip', '/respaldo-anterior/main.js', '/data/perfil.json', '/tests/test.cjs', '/scripts/build-portable.cjs', '/src/copia.bak', '/services/.env', '/ui/../perfil.json']) assert.equal(incluirEnPaquete(ruta), false, ruta);
});

test('Packager usa el extractor sustituido, crea un ASAR y no incluye archivos ajenos a la app', async t => {
    const dir = await temporal(t), app = path.join(dir, 'app'), zips = path.join(dir, 'zips');
    await escribir(app, 'package.json', JSON.stringify({ name: 'patagonia-prueba', version: '1.0.0', main: 'main.js' }));
    await escribir(app, 'main.js', 'module.exports = 42;');
    await escribir(app, 'src/main/modulo.js'); await escribir(app, 'diagnostico.zip'); await escribir(app, 'respaldo/main.js');
    await fs.mkdir(zips);
    await fs.copyFile(path.join(__dirname, 'fixtures/electron-minimo.zip'), path.join(zips, 'electron-v43.1.1-linux-x64.zip'));
    const { packager } = require('@electron/packager');
    const resultado = await packager({ dir: app, name: 'patagonia-prueba', platform: 'linux', arch: 'x64', electronVersion: '43.1.1',
        electronZipDir: zips, out: path.join(dir, 'out'), tmpdir: path.join(dir, 'tmp'), asar: true, quiet: true,
        ignore: ruta => !incluirEnPaquete(ruta) });
    const cargar = createRequire(require.resolve('@electron/packager'));
    const archivos = cargar('@electron/asar').listPackage(path.join(resultado[0], 'resources/app.asar'));
    assert.ok(archivos.includes('/main.js')); assert.ok(archivos.includes('/src/main/modulo.js'));
    assert.equal(archivos.some(ruta => /diagnostico|respaldo/.test(ruta)), false);
});

test('el extractor usado por Packager rechaza rutas que escapan del directorio', async t => {
    const dir = await temporal(t);
    const { extractElectronZip } = require('@electron/packager/dist/unzip');
    await assert.rejects(extractElectronZip(path.join(__dirname, 'fixtures/zip-ruta-invalida.zip'), path.join(dir, 'salida')));
    await assert.rejects(fs.access(path.join(dir, 'escape.txt')));
});

test('tar mantiene extracción por archivo y por stream con las opciones de node-gyp', async t => {
    const dir = await temporal(t), tar = require('tar');
    await escribir(dir, 'fuente/include/node.h', 'cabecera'); await escribir(dir, 'fuente/no-copiar.txt');
    const archivo = path.join(dir, 'cabeceras.tar');
    await tar.create({ file: archivo, cwd: dir }, ['fuente']);
    const opciones = cwd => ({ cwd, strip: 1, filter: nombre => nombre.endsWith('.h') });
    for (const modo of ['archivo', 'stream']) {
        const destino = path.join(dir, modo); await fs.mkdir(destino);
        if (modo === 'archivo') await tar.extract({ ...opciones(destino), file: archivo });
        else await require('node:stream/promises').pipeline(require('node:fs').createReadStream(archivo), tar.extract(opciones(destino)));
        assert.equal(await fs.readFile(path.join(destino, 'include/node.h'), 'utf8'), 'cabecera');
        await assert.rejects(fs.access(path.join(destino, 'no-copiar.txt')));
    }
});

test('el editor de Forge conserva la creación y limpieza de temporales con tmp actualizado', async () => {
    const { ExternalEditor } = require('external-editor');
    const editor = new ExternalEditor('prueba');
    const archivo = editor.tempFile;
    assert.equal(await fs.readFile(archivo, 'utf8'), 'prueba');
    editor.cleanup(); await assert.rejects(fs.access(archivo));
});

test('integrar NuGet no modifica electron-winstaller en disco y detecta versiones incompatibles', async () => {
    const archivo = require.resolve('electron-winstaller');
    const original = await fs.readFile(archivo, 'utf8');
    const integrado = prepararIntegracion(original);
    assert.match(integrado, /'-ConfigFile', process\.env\.PATAGONIA_NUGET_CONFIG/);
    assert.throws(() => prepararIntegracion('otra versión'), /no coincide/);
    const resultado = spawnSync(process.execPath, ['--require', path.join(raiz, 'scripts/winstaller-hook.cjs'), '-e',
        'if(typeof require("electron-winstaller").createWindowsInstaller!=="function")process.exit(1)'], {
        cwd: raiz, env: { ...process.env, PATAGONIA_NUGET_EXE: 'nuget-prueba', PATAGONIA_NUGET_CONFIG: 'config-prueba' }, encoding: 'utf8'
    });
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.equal(await fs.readFile(archivo, 'utf8'), original);
});

async function proyectoPortable(t) {
    const dir = await temporal(t);
    const version = '1.0.3';
    await escribir(dir, 'package.json', JSON.stringify({ name: 'patagonia-prueba', version, main: 'main.js', type: 'commonjs', dependencies: { '@ghostery/adblocker-electron': '2.18.2' } }));
    await escribir(dir, 'package-lock.json', JSON.stringify({ packages: { '': { version }, 'node_modules/@ghostery/adblocker-electron': { version: '2.18.2' } } }));
    await escribir(dir, 'node_modules/electron/package.json', JSON.stringify({ version: '43.1.1' }));
    for (const recurso of ['main.js', 'preload.js', 'renderer.js', 'index.html', 'LICENSE', 'services/ai.js', 'src/main/modulo.js',
        'ui/new-tab.html', 'assets/patagonia-oficial.ico', 'assets/patagonia-adblock.bin', 'node_modules/electron/dist/electron.exe',
        'node_modules/electron/dist/resources/default_app.asar', 'node_modules/@ghostery/adblocker-electron/package.json']) await escribir(dir, recurso);
    const destino = path.join(dir, 'dist/Patagonia Browser-win32-x64');
    await escribir(destino, 'anterior.txt', 'versión anterior');
    return { dir, destino, opciones: { raiz: dir, plataforma: 'win32', arquitectura: 'x64' } };
}
test('un recurso faltante o un fallo de copia conserva la compilación portátil anterior', async t => {
    const p = await proyectoPortable(t);
    await assert.rejects(construir({ ...p.opciones, plataforma: 'linux' }), /Windows/);
    await fs.rm(path.join(p.dir, 'LICENSE'));
    await assert.rejects(construir(p.opciones), /LICENSE/);
    assert.equal(await fs.readFile(path.join(p.destino, 'anterior.txt'), 'utf8'), 'versión anterior');
    await escribir(p.dir, 'LICENSE');
    // El destino de copia entra en conflicto con un archivo de la distribución.
    await escribir(p.dir, 'node_modules/electron/dist/resources/app', 'archivo incompatible');
    await assert.rejects(construir(p.opciones));
    assert.equal(await fs.readFile(path.join(p.destino, 'anterior.txt'), 'utf8'), 'versión anterior');
});
test('una compilación portátil válida publica recursos y dependencias y retira temporales', async t => {
    const p = await proyectoPortable(t);
    await escribir(p.dir, 'diagnostico.zip'); await escribir(p.dir, 'services/copia.bak');
    await construir(p.opciones);
    const app = path.join(p.destino, 'resources/app');
    await fs.access(path.join(app, 'main.js'));
    await fs.access(path.join(app, 'node_modules/@ghostery/adblocker-electron/package.json'));
    await assert.rejects(fs.access(path.join(app, 'services/copia.bak')));
    await assert.rejects(fs.access(path.join(p.destino, 'anterior.txt')));
    assert.equal((await fs.readdir(path.dirname(p.destino))).length, 1);
});
