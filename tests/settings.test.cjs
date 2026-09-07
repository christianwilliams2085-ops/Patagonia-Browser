const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { crearConfiguracion, validarConfiguracion, registrarConfiguracion } = require("../src/main/settings");

async function fixture(t) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "patagonia-settings-"));
    t.after(() => fs.rm(dir, { recursive: true, force: true }));
    return path.join(dir, "configuracion.json");
}

test("settings persist across restart; concurrent changes retain the latest successful save", async t => {
    const archivo = await fixture(t);
    const gestor = crearConfiguracion(archivo);
    assert.equal((await gestor.iniciar()).restaurar, true);
    await Promise.all([
        gestor.guardar({ inicio: "https://example.com", restaurar: true }),
        gestor.guardar({ inicio: "http://localhost:3000", restaurar: false })
    ]);
    assert.deepEqual(await crearConfiguracion(archivo).iniciar(), { inicio: "http://localhost:3000/", restaurar: false, error: "" });
});

test("invalid addresses and damaged files cannot overwrite existing settings", async t => {
    const archivo = await fixture(t);
    for (const inicio of ["javascript:alert(1)", "file:///secret", "https://user:pass@example.com", "buscar algo"]) {
        assert.throws(() => validarConfiguracion({ inicio, restaurar: true }));
    }
    await fs.writeFile(archivo, "archivo dañado");
    const gestor = crearConfiguracion(archivo);
    assert.match((await gestor.iniciar()).error, /conserva/);
    await assert.rejects(gestor.guardar({ inicio: "https://example.org", restaurar: false }));
    assert.equal(await fs.readFile(archivo, "utf8"), "archivo dañado");
});

test("a failed write keeps the current configuration and allows a later retry", async t => {
    const archivo = await fixture(t);
    const gestor = crearConfiguracion(archivo);
    const inicial = await gestor.iniciar();
    await fs.mkdir(archivo);
    await assert.rejects(gestor.guardar({ inicio: "https://example.org", restaurar: false }));
    assert.deepEqual(gestor.estado(), inicial);
    await fs.rmdir(archivo);
    await gestor.guardar({ inicio: "https://example.org", restaurar: false });
    assert.equal(gestor.estado().restaurar, false);
});

test("settings IPC only allows the main interface frame", async t => {
    const handlers = {};
    const ventana = { isDestroyed: () => false, webContents: { mainFrame: {} } };
    const gestor = registrarConfiguracion({ archivo: await fixture(t), obtenerVentana: () => ventana,
        ipcMain: { handle: (nombre, fn) => { handlers[nombre] = fn; } } });
    await gestor.iniciar();
    assert.equal((await handlers["guardar-configuracion"]({ sender: {}, senderFrame: {} }, { inicio: "https://evil.example", restaurar: false })).correcto, false);
    const propio = { sender: ventana.webContents, senderFrame: ventana.webContents.mainFrame };
    assert.equal((await handlers["guardar-configuracion"](propio, { inicio: "https://example.com", restaurar: false })).correcto, true);
    assert.equal((await handlers["obtener-configuracion"](propio)).configuracion.restaurar, false);
});

test("settings panel loads values and reports failed saves without discarding the edit", async () => {
    const { JSDOM } = require("jsdom");
    const dom = new JSDOM(await fs.readFile(path.join(__dirname, "../index.html"), "utf8"), { runScripts: "outside-only" });
    try {
        const { window } = dom;
        const configuracion = { inicio: "https://example.com/", restaurar: true, error: "" };
        let enviado;
        window.patagonia = {
            obtenerConfiguracion: async () => ({ correcto: true, configuracion }),
            guardarConfiguracion: async datos => { enviado = datos; return { correcto: false, error: "Disco lleno" }; }
        };
        const panel = window.document.getElementById("panelConfiguracion");
        panel.scrollIntoView = () => {};
        window.eval(await fs.readFile(path.join(__dirname, "../ui/modules/settings.js"), "utf8"));
        window.document.getElementById("abrirConfiguracion").click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(panel.hidden, false);
        const inicio = window.document.getElementById("paginaInicio");
        assert.equal(inicio.value, configuracion.inicio);
        inicio.value = "https://new.example/";
        window.document.getElementById("guardarConfiguracion").click();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(enviado.inicio, "https://new.example/");
        assert.equal(inicio.value, "https://new.example/");
        assert.equal(window.document.getElementById("estadoConfiguracion").textContent, "Disco lleno");
    } finally { dom.window.close(); }
});
