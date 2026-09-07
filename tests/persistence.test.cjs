const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { crearAlmacenFavoritos } = require("../src/main/bookmarks");
const { crearHistorial } = require("../src/main/history");
const { crearConfiguracion } = require("../src/main/settings");

function compuerta() {
    let abrir;
    const promesa = new Promise(resolve => { abrir = resolve; });
    return { promesa, abrir };
}

for (const tipo of ["favoritos", "historial", "configuracion"]) {
    test(`${tipo}: waiting for persistence includes changes queued during the wait`, async t => {
        const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-persistence-"));
        const archivo = path.join(dir, `${tipo}.json`);
        const almacen = tipo === "favoritos" ? crearAlmacenFavoritos(archivo)
            : tipo === "historial" ? crearHistorial(archivo) : crearConfiguracion(archivo);
        if (almacen.iniciar) await almacen.iniciar();
        const llegadas = [compuerta(), compuerta()];
        const permisos = [compuerta(), compuerta()];
        let operaciones = [];
        t.after(async () => {
            permisos.forEach(permiso => permiso.abrir());
            await Promise.allSettled(operaciones);
            await fs.rm(dir, { recursive: true, force: true });
        });
        const rename = fs.rename;
        let escritura = 0;
        t.mock.method(fs, "rename", async (origen, destino) => {
            if (destino === archivo) {
                const indice = escritura++;
                llegadas[indice].abrir();
                await permisos[indice].promesa;
            }
            return rename(origen, destino);
        });
        const guardar = numero => {
            const url = `https://example.com/${numero}`;
            if (tipo === "favoritos") return almacen.alternar({ url });
            if (tipo === "historial") return almacen.agregar({ url });
            return almacen.guardar({ inicio: url, restaurar: true });
        };
        operaciones.push(guardar(1));
        await llegadas[0].promesa;
        let listo = false;
        const esperando = almacen.esperar().then(() => { listo = true; });
        operaciones.push(guardar(2));
        permisos[0].abrir();
        await llegadas[1].promesa;
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(listo, false);
        permisos[1].abrir();
        await Promise.all([...operaciones, esperando]);
        const guardados = JSON.parse(await fs.readFile(archivo, "utf8"));
        if (tipo === "configuracion") assert.equal(guardados.inicio, "https://example.com/2");
        else assert.deepEqual(guardados.map(dato => dato.url).sort(), ["https://example.com/1", "https://example.com/2"]);
    });
}
