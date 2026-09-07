const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { registrarAtajos } = require("../src/main/shortcuts");

test("browser shortcuts run once on keyDown and cancel the default shell shortcut", () => {
    const contenido = new EventEmitter();
    const llamadas = [];
    const acciones = Object.fromEntries(["direccion", "nueva", "reabrir", "cerrar", "recargar", "siguiente", "anterior", "atras", "adelante", "inicio", "buscar", "buscarSiguiente", "buscarAnterior"].map(nombre => [nombre, () => llamadas.push(nombre)]));
    registrarAtajos(contenido, acciones);
    const casos = [
        [{ key: "L", control: true }, "direccion"], [{ key: "t", meta: true }, "nueva"],
        [{ key: "w", control: true }, "cerrar"], [{ key: "r", control: true }, "recargar"],
        [{ key: "T", control: true, shift: true }, "reabrir"],
        [{ key: "F5" }, "recargar"], [{ key: "Tab", control: true }, "siguiente"],
        [{ key: "Tab", control: true, shift: true }, "anterior"],
        [{ key: "ArrowLeft", alt: true }, "atras"], [{ key: "ArrowRight", alt: true }, "adelante"],
        [{ key: "Home", alt: true }, "inicio"], [{ key: "f", control: true }, "buscar"],
        [{ key: "F3" }, "buscarSiguiente"], [{ key: "F3", shift: true }, "buscarAnterior"]
    ];
    for (const [entrada, accion] of casos) {
        let bloqueado = false;
        contenido.emit("before-input-event", { preventDefault: () => { bloqueado = true; } }, { type: "keyDown", ...entrada });
        assert.equal(llamadas.at(-1), accion);
        assert.equal(bloqueado, true);
    }
    const cantidad = llamadas.length;
    for (const entrada of [{ type: "keyUp", key: "l", control: true }, { type: "keyDown", key: "l" }, { type: "keyDown", key: "t", control: true, alt: true }]) {
        contenido.emit("before-input-event", { preventDefault: () => assert.fail("Debe conservar el teclado de la página") }, entrada);
    }
    assert.equal(llamadas.length, cantidad);
});

test("Escape is consumed only by an open search and composing text is left alone", () => {
    const contenido = new EventEmitter();
    let abierta = false;
    let cerradas = 0;
    let interceptadas = 0;
    registrarAtajos(contenido, { cerrarBusqueda: () => {
        if (!abierta) return false;
        abierta = false;
        cerradas++;
        return true;
    } });
    const evento = { preventDefault: () => { interceptadas++; } };
    contenido.emit("before-input-event", evento, { type: "keyDown", key: "Escape" });
    assert.equal(interceptadas, 0);
    abierta = true;
    contenido.emit("before-input-event", evento, { type: "keyDown", key: "Escape", isComposing: true });
    assert.equal(cerradas, 0);
    contenido.emit("before-input-event", evento, { type: "keyDown", key: "Escape" });
    assert.equal(cerradas, 1);
    assert.equal(interceptadas, 1);
});
