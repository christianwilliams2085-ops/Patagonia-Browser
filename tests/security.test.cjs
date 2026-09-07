const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { crearIPCInterfaz, protegerInterfaz } = require("../src/main/security");

test("privileged commands and page context reject foreign windows and child frames", async () => {
    const bus = new EventEmitter();
    const handlers = {};
    bus.handle = (nombre, accion) => { handlers[nombre] = accion; };
    const ventana = { isDestroyed: () => false, webContents: { mainFrame: {} } };
    const ipc = crearIPCInterfaz(bus, () => ventana);
    let ejecutadas = 0;
    ipc.on("navegar", () => { ejecutadas++; });
    ipc.handle("contexto", () => ({ correcto: true, texto: "privado" }));
    for (const evento of [{ sender: {}, senderFrame: {} }, { sender: ventana.webContents, senderFrame: {} }]) {
        bus.emit("navegar", evento);
        assert.equal((await handlers.contexto(evento)).correcto, false);
    }
    assert.equal(ejecutadas, 0);
    const propio = { sender: ventana.webContents, senderFrame: ventana.webContents.mainFrame };
    bus.emit("navegar", propio);
    assert.equal(ejecutadas, 1);
    assert.equal((await handlers.contexto(propio)).texto, "privado");
    ventana.isDestroyed = () => true;
    assert.equal((await handlers.contexto(propio)).correcto, false);
});

test("shell cannot navigate to remote content or create privileged popup windows", () => {
    const contenido = new EventEmitter();
    let abrir;
    contenido.setWindowOpenHandler = fn => { abrir = fn; };
    protegerInterfaz(contenido);
    let impedido = false;
    contenido.emit("will-navigate", { preventDefault: () => { impedido = true; } }, "https://example.com");
    assert.equal(impedido, true);
    assert.equal(abrir({ url: "https://example.com" }).action, "deny");
});
