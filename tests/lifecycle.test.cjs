const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { registrarInstanciaUnica, registrarCierre } = require("../src/main/lifecycle");
const completar = () => new Promise(resolve => setImmediate(resolve));

test("a second launch exits before startup and the primary launch restores its window", () => {
    const segunda = new EventEmitter();
    segunda.requestSingleInstanceLock = () => false;
    let salidas = 0;
    segunda.quit = () => { salidas++; };
    assert.equal(registrarInstanciaUnica(segunda, () => assert.fail("No debe abrir una ventana")), false);
    assert.equal(salidas, 1);
    const principal = new EventEmitter();
    principal.requestSingleInstanceLock = () => true;
    const acciones = [];
    let ventana;
    assert.equal(registrarInstanciaUnica(principal, () => ventana), true);
    principal.emit("second-instance");
    ventana = { isDestroyed: () => false, isMinimized: () => true,
        restore: () => acciones.push("restaurar"), show: () => acciones.push("mostrar"), focus: () => acciones.push("enfocar") };
    principal.emit("second-instance");
    assert.deepEqual(acciones, ["restaurar", "mostrar", "enfocar"]);
    ventana.isDestroyed = () => true;
    principal.emit("second-instance");
    assert.equal(acciones.length, 3);
});

function fixture(guardarDatos) {
    const ventana = new EventEmitter();
    let activas = 2;
    let destruida = false;
    let cerradas = 0;
    const preguntas = [];
    ventana.isDestroyed = () => destruida;
    ventana.close = () => {
        let cancelado = false;
        ventana.emit("close", { preventDefault: () => { cancelado = true; } });
        if (!cancelado) cerradas++;
    };
    const dialog = { showMessageBox: (_ventana, opciones) => new Promise((resolve, reject) => preguntas.push({ opciones, resolve, reject })) };
    registrarCierre({ ventana, dialog, contarDescargas: () => activas, guardarDatos });
    return { ventana, preguntas, cerradas: () => cerradas, terminarDescargas: () => { activas = 0; }, destruir: () => { destruida = true; } };
}

test("closing repeatedly with active downloads prompts once and defaults to keeping the window open", async () => {
    const f = fixture();
    f.ventana.close();
    f.ventana.close();
    await completar();
    assert.equal(f.preguntas.length, 1);
    assert.equal(f.preguntas[0].opciones.defaultId, 0);
    assert.equal(f.preguntas[0].opciones.cancelId, 0);
    assert.equal(f.cerradas(), 0);
    f.preguntas[0].resolve({ response: 0 });
    await completar();
    assert.equal(f.cerradas(), 0);
    f.ventana.close();
    await completar();
    assert.equal(f.preguntas.length, 2);
    f.preguntas[1].resolve({ response: 0 });
    await completar();
});

test("explicit confirmation closes once without a second prompt", async () => {
    const f = fixture();
    f.ventana.close();
    await completar();
    f.preguntas[0].resolve({ response: 1 });
    await completar();
    assert.equal(f.cerradas(), 1);
    assert.equal(f.preguntas.length, 1);
});

test("completed downloads allow closing without a confirmation", async () => {
    const f = fixture();
    f.terminarDescargas();
    f.ventana.close();
    await completar();
    assert.equal(f.cerradas(), 1);
    assert.equal(f.preguntas.length, 0);
});

test("dialog failure keeps downloads alive and a retry can still close", async t => {
    t.mock.method(console, "error", () => {});
    const f = fixture();
    f.ventana.close();
    await completar();
    f.preguntas[0].reject(new Error("Dialog unavailable"));
    await completar();
    assert.equal(f.cerradas(), 0);
    f.ventana.close();
    await completar();
    f.preguntas[1].resolve({ response: 1 });
    await completar();
    assert.equal(f.cerradas(), 1);
});

test("late confirmation cannot close an already destroyed window", async () => {
    const f = fixture();
    f.ventana.close();
    await completar();
    f.destruir();
    f.preguntas[0].resolve({ response: 1 });
    await completar();
    assert.equal(f.cerradas(), 0);
});

test("closing waits for pending saves and repeated attempts share the same operation", async () => {
    let terminar;
    let guardados = 0;
    const f = fixture(() => { guardados++; return new Promise(resolve => { terminar = resolve; }); });
    f.terminarDescargas();
    f.ventana.close();
    f.ventana.close();
    await completar();
    assert.equal(guardados, 1);
    assert.equal(f.cerradas(), 0);
    terminar();
    await completar();
    assert.equal(f.cerradas(), 1);
    assert.equal(f.preguntas.length, 0);
});

test("failed saves keep the window open by default and can be retried before closing", async () => {
    let guardados = 0;
    const f = fixture(async () => { if (++guardados < 3) throw new Error("Disco lleno"); });
    f.terminarDescargas();
    f.ventana.close();
    await completar();
    assert.equal(f.preguntas[0].opciones.defaultId, 0);
    assert.equal(f.preguntas[0].opciones.cancelId, 0);
    assert.match(f.preguntas[0].opciones.message, /No se pudieron guardar/);
    f.ventana.close();
    assert.equal(f.preguntas.length, 1);
    f.preguntas[0].resolve({ response: 0 });
    await completar();
    assert.equal(f.cerradas(), 0);
    f.ventana.close();
    await completar();
    f.preguntas[1].resolve({ response: 1 });
    await completar();
    assert.equal(guardados, 3);
    assert.equal(f.cerradas(), 1);
});

test("discarding an unsaved session requires the explicit close without saving choice", async () => {
    const f = fixture(async () => { throw new Error("Disco lleno"); });
    f.terminarDescargas();
    f.ventana.close();
    await completar();
    assert.equal(f.cerradas(), 0);
    assert.equal(f.preguntas[0].opciones.buttons[2], "Cerrar sin guardar");
    f.preguntas[0].resolve({ response: 2 });
    await completar();
    assert.equal(f.cerradas(), 1);
});

test("canceling the download warning avoids saving or opening another dialog", async () => {
    const f = fixture(() => assert.fail("No debe comenzar el cierre"));
    f.ventana.close();
    await completar();
    f.preguntas[0].resolve({ response: 0 });
    await completar();
    assert.equal(f.cerradas(), 0);
    assert.equal(f.preguntas.length, 1);
});

test("a save warning failure keeps the window open and a later attempt can recover", async t => {
    t.mock.method(console, "error", () => {});
    let falla = true;
    const f = fixture(async () => { if (falla) throw new Error("Disco lleno"); });
    f.terminarDescargas();
    f.ventana.close();
    await completar();
    f.preguntas[0].reject(new Error("Diálogo no disponible"));
    await completar();
    assert.equal(f.cerradas(), 0);
    falla = false;
    f.ventana.close();
    await completar();
    assert.equal(f.cerradas(), 1);
});

test("finishing a save after the window was destroyed never closes it again", async () => {
    let terminar;
    const f = fixture(() => new Promise(resolve => { terminar = resolve; }));
    f.terminarDescargas();
    f.ventana.close();
    await completar();
    f.destruir();
    terminar();
    await completar();
    assert.equal(f.cerradas(), 0);
});
