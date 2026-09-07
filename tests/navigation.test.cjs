const { test } = require("node:test");
const assert = require("node:assert/strict");
const { prepararDireccion, navegar, atras, adelante, recargar, detener, estadoNavegacion } = require("../src/main/navigation");

test("opens local development servers over HTTP without changing explicit protocols", async () => {
    for (const direccion of ["localhost:3000", "localhost:3000/ruta?q=uno#dos", "app.localhost:8080", "127.0.0.1:5173", "[::1]:3000"]) {
        assert.equal(prepararDireccion(direccion), `http://${direccion}`);
    }
    assert.equal(prepararDireccion("https://localhost:3000"), "https://localhost:3000");
    let destino;
    await navegar({ vista: { webContents: { isDestroyed: () => false, loadURL: async url => { destino = url; } } } }, "localhost:3000");
    assert.equal(destino, "http://localhost:3000");
});

test("back and forward reflect the page history and destroyed tabs ignore navigation commands", async () => {
    let destruida = false;
    const llamadas = [];
    let retroceder = true;
    let avanzar = false;
    const contenido = {
        isDestroyed: () => destruida,
        get navigationHistory() {
            assert.equal(destruida, false);
            return { canGoBack: () => retroceder, canGoForward: () => avanzar,
                goBack: () => llamadas.push("atrás"), goForward: () => llamadas.push("adelante") };
        },
        reload: () => llamadas.push("recargar"),
        loadURL: async () => { llamadas.push("navegar"); },
        isLoading: () => false
    };
    const pestana = { vista: { webContents: contenido } };
    assert.deepEqual(estadoNavegacion(pestana), { puedeRetroceder: true, puedeAvanzar: false });
    atras(pestana);
    adelante(pestana);
    retroceder = false;
    avanzar = true;
    assert.deepEqual(estadoNavegacion(pestana), { puedeRetroceder: false, puedeAvanzar: true });
    atras(pestana);
    adelante(pestana);
    assert.deepEqual(llamadas, ["atrás", "adelante"]);
    destruida = true;
    for (const tab of [pestana, undefined]) {
        atras(tab);
        adelante(tab);
        recargar(tab);
        await navegar(tab, "https://example.com");
        assert.equal(detener(tab), false);
        assert.deepEqual(estadoNavegacion(tab), { puedeRetroceder: false, puedeAvanzar: false });
    }
    assert.deepEqual(llamadas, ["atrás", "adelante"]);
});

test("stopping a pending navigation restores the visible address and preserves real load errors", () => {
    let cargando = true;
    let llamadas = 0;
    let url = "https://visible.example/";
    const pestana = { url: "https://pending.example/", cargando: true, vista: { webContents: {
        isDestroyed: () => false,
        isLoading: () => cargando,
        stop: () => { llamadas++; cargando = false; },
        getURL: () => url
    } } };
    assert.equal(detener(pestana), true);
    assert.equal(pestana.url, "https://visible.example/");
    assert.equal(pestana.cargando, false);
    assert.equal(detener(pestana), false);
    assert.equal(llamadas, 1);
    cargando = true;
    url = "";
    detener(pestana);
    assert.equal(pestana.url, "about:blank");
    cargando = true;
    pestana.url = "https://failed.example/";
    pestana.errorCarga = { url: pestana.url, mensaje: "No se pudo cargar" };
    detener(pestana);
    assert.equal(pestana.url, "https://failed.example/");
    assert.equal(pestana.errorCarga.mensaje, "No se pudo cargar");
});

test("preserves ordinary domains and searches without confusing local-looking text", () => {
    assert.equal(prepararDireccion("example.com/ruta"), "https://example.com/ruta");
    assert.equal(prepararDireccion("localhost.example.com"), "https://localhost.example.com");
    for (const texto of ["buscar noticias", "localhost tutorial", "localhost:3000 buscar"]) {
        assert.equal(prepararDireccion(texto), `https://www.google.com/search?q=${encodeURIComponent(texto)}`);
    }
});
