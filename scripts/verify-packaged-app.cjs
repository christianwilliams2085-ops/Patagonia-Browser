const fs = require('node:fs');
const path = require('node:path');
const asar = require('@electron/asar');

function verificarPaquete(directorio) {
    const ejecutable = path.join(directorio, 'Patagonia Browser.exe');
    if (!fs.statSync(ejecutable).isFile()) throw new Error('Falta Patagonia Browser.exe');
    const archivo = path.join(directorio, 'resources', 'app.asar');
    const leer = nombre => asar.extractFile(archivo, path.normalize(nombre));
    const paquete = JSON.parse(leer('package.json').toString('utf8'));
    if (paquete.main !== 'bootstrap.js') throw new Error('El paquete no usa el arranque bootstrap.js');
    for (const nombre of [paquete.main, 'main.js', 'preload.js', 'renderer.js', 'index.html',
        'src/main/siteCompatibility.js', 'ui/new-tab.html', 'assets/patagonia-adblock.bin',
        'assets/patagonia-oficial.ico', 'LICENSE']) {
        if (!leer(nombre).length) throw new Error(`Recurso vacio: ${nombre}`);
    }
    for (const nombre of Object.keys(paquete.dependencies || {})) {
        JSON.parse(leer(`node_modules/${nombre}/package.json`).toString('utf8'));
    }
    return { version: paquete.version, main: paquete.main };
}

if (require.main === module) {
    try {
        if (!process.argv[2]) throw new Error('Indicar la carpeta empaquetada de Patagonia Browser.');
        console.log('Contenido de la aplicacion verificado:', verificarPaquete(process.argv[2]));
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
module.exports = { verificarPaquete };
