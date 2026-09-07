const { test } = require("node:test");
const assert = require("node:assert/strict");
const { registrarAperturas } = require("../src/main/newWindows");

function fixture() {
    let handler;
    let habilitada = true;
    const vistas = [];
    const pestanas = [];
    registrarAperturas({
        contenido: { setWindowOpenHandler: fn => { handler = fn; } },
        puedeAbrir: () => habilitada,
        crearVista: opciones => {
            const vista = { webContents: opciones.webContents || {}, opciones };
            vistas.push(vista);
            return vista;
        },
        agregarPestana: (url, opciones) => pestanas.push({ url, ...opciones })
    });
    return { abrir: detalle => handler(detalle), vistas, pestanas, cerrar: () => { habilitada = false; } };
}

test("foreground opens reuse native contents, preserve sandbox inheritance and keep the child alive", () => {
    const f = fixture();
    const respuesta = f.abrir({ url: "https://example.com/", disposition: "foreground-tab" });
    assert.equal(respuesta.action, "allow");
    assert.equal(respuesta.outlivesOpener, true);
    const contenido = {};
    const heredadas = { openerSandboxFlags: 42, nodeIntegration: false, javascript: false };
    assert.equal(respuesta.createWindow({ webContents: contenido, webPreferences: heredadas }), contenido);
    assert.equal(f.pestanas[0].cargar, false);
    assert.equal(f.pestanas[0].activar, true);
    assert.equal(f.vistas[0].opciones.webPreferences.openerSandboxFlags, 42);
    assert.equal(f.vistas[0].opciones.webPreferences.javascript, false);
    assert.equal(f.vistas[0].opciones.webPreferences.sandbox, true);
    assert.equal(f.vistas[0].opciones.webPreferences.contextIsolation, true);
    assert.equal(f.vistas[0].opciones.webPreferences.nodeIntegration, false);
});

test("background links load once without taking focus and retain the referrer policy", () => {
    const f = fixture();
    const referrer = { url: "https://source.example/", policy: "strict-origin-when-cross-origin" };
    const respuesta = f.abrir({ url: "https://example.com/", disposition: "background-tab", referrer });
    respuesta.createWindow({ webPreferences: {} });
    assert.equal(f.pestanas[0].activar, false);
    assert.equal(f.pestanas[0].cargar, true);
    assert.equal(f.pestanas[0].opcionesCarga.httpReferrer, referrer);
});

test("forms keep native POST intact or pass body and multipart headers when loading is deferred", () => {
    const f = fixture();
    const data = [{ type: "rawData", bytes: Buffer.from("field=value") }];
    for (const contentType of ["application/x-www-form-urlencoded", "multipart/form-data"]) {
        const boundary = contentType === "multipart/form-data" ? "----boundary" : undefined;
        const respuesta = f.abrir({ url: "https://example.com/submit", disposition: "new-window", postBody: { data, contentType, boundary } });
        respuesta.createWindow({ webPreferences: {} });
        const opciones = f.pestanas.at(-1).opcionesCarga;
        assert.equal(opciones.postData, data);
        assert.equal(opciones.extraHeaders, `Content-Type: ${contentType}${boundary ? "; boundary=----boundary" : ""}`);
    }
    f.abrir({ url: "https://example.com/submit", postBody: { data, contentType: "application/x-www-form-urlencoded" } })
        .createWindow({ webContents: {}, webPreferences: {} });
    assert.equal(f.pestanas.at(-1).cargar, false);
});

test("script, file and external app targets are rejected without opening windows", () => {
    const f = fixture();
    for (const url of ["javascript:alert(1)", "file:///private.txt", "data:text/html,hello", "mailto:user@example.com", "invalid"]) {
        assert.equal(f.abrir({ url }).action, "deny");
    }
    assert.equal(f.vistas.length, 0);
    for (const url of ["about:blank", "https://example.com", "http://localhost:3000", "blob:https://example.com/id"]) {
        assert.equal(f.abrir({ url }).action, "allow");
    }
    f.cerrar();
    assert.equal(f.abrir({ url: "https://example.com" }).action, "deny");
});
