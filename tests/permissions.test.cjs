const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { registrarPermisos, origenSeguro, descripcionPermiso } = require("../src/main/permissions");

function fixture() {
    const sesion = {
        setPermissionCheckHandler(fn) { this.comprobar = fn; },
        setPermissionRequestHandler(fn) { this.solicitar = fn; }
    };
    const preguntas = [];
    let abiertas = 0;
    const dialog = { showMessageBox: (_ventana, opciones) => new Promise(resolve => {
        assert.equal(abiertas, 0, "Solo debe mostrarse un aviso a la vez");
        abiertas++;
        let terminada = false;
        const resolver = respuesta => {
            if (terminada) return;
            terminada = true;
            abiertas--;
            resolve(respuesta);
        };
        preguntas.push({ opciones, resolve: resolver });
        opciones.signal.addEventListener("abort", () => resolver({ response: 0 }), { once: true });
    }) };
    const ventana = Object.assign(new EventEmitter(), { destruida: false, isDestroyed() { return this.destruida; } });
    const propias = new Set();
    let activa;
    const pagina = url => {
        let actual = url;
        const contenido = Object.assign(new EventEmitter(), { destruido: false, isDestroyed() { return this.destruido; }, getURL: () => actual });
        propias.add(contenido);
        if (!activa) activa = contenido;
        return { contenido, navegar: urlNueva => {
            contenido.emit("did-start-navigation", {}, urlNueva, false, true);
            actual = urlNueva;
        } };
    };
    const gestor = registrarPermisos({ sesion, dialog, obtenerVentana: () => ventana,
        esPestanaPropia: contenido => propias.has(contenido), esPestanaActiva: contenido => activa === contenido });
    const solicitar = (contenido, permiso, detalles) => new Promise(resolve => sesion.solicitar(contenido, permiso, resolve, { isMainFrame: true, ...detalles }));
    const activar = contenido => { activa = contenido; gestor.cambiarPestana(); };
    return { sesion, preguntas, pagina, gestor, solicitar, activar, dialog, ventana };
}

test("only HTTPS and local pages owned by Patagonia can request known permissions", async () => {
    const f = fixture();
    assert.equal(origenSeguro("https://example.com/ruta"), "https://example.com");
    assert.equal(origenSeguro("http://localhost:3000/ruta"), "http://localhost:3000");
    for (const url of ["http://example.com", "file:///tmp/a", "https://user:secret@example.com"]) assert.equal(origenSeguro(url), null);
    assert.equal(descripcionPermiso("media", { mediaTypes: ["audio", "video"] }), "usar la cámara y el micrófono");
    const segura = f.pagina("https://example.com/ruta");
    const externa = { isDestroyed: () => false, getURL: () => "https://example.com/" };
    for (const [contenido, permiso, detalles] of [
        [externa, "geolocation", { requestingUrl: "https://example.com/" }],
        [segura.contenido, "unknown", { requestingUrl: "https://example.com/" }],
        [segura.contenido, "notifications", { requestingUrl: "https://third.example/" }]
    ]) assert.equal(await f.solicitar(contenido, permiso, detalles), false);
    assert.equal(f.preguntas.length, 0);
    assert.equal(f.sesion.comprobar(segura.contenido, "notifications", "https://example.com", { requestingUrl: "https://example.com/" }), false);
});

test("a visible choice is reused during the session and media grants remain granular", async () => {
    const f = fixture();
    const pagina = f.pagina("https://meet.example/sala");
    const detalles = { requestingUrl: "https://meet.example/sala", securityOrigin: "https://meet.example", mediaTypes: ["audio"] };
    const primera = f.solicitar(pagina.contenido, "media", detalles);
    const simultanea = f.solicitar(pagina.contenido, "media", detalles);
    assert.equal(f.preguntas.length, 1);
    assert.match(f.preguntas[0].opciones.message, /https:\/\/meet\.example.*micrófono/);
    assert.equal(f.preguntas[0].opciones.defaultId, 0);
    f.preguntas[0].resolve({ response: 1 });
    assert.deepEqual(await Promise.all([primera, simultanea]), [true, true]);
    assert.equal(f.gestor.cantidadDecisiones(), 1);
    assert.equal(f.sesion.comprobar(pagina.contenido, "media", "https://meet.example", { securityOrigin: "https://meet.example", mediaType: "audio" }), true);
    assert.equal(f.sesion.comprobar(pagina.contenido, "media", "https://meet.example", { securityOrigin: "https://meet.example", mediaType: "video" }), false);
    assert.equal(await f.solicitar(pagina.contenido, "media", detalles), true);
    assert.equal(f.preguntas.length, 1);
});

test("blocking is remembered and navigating to another origin cancels pending permission", async () => {
    const f = fixture();
    const pagina = f.pagina("https://maps.example/");
    const detalles = { requestingUrl: "https://maps.example/" };
    const bloqueada = f.solicitar(pagina.contenido, "geolocation", detalles);
    f.preguntas[0].resolve({ response: 0 });
    assert.equal(await bloqueada, false);
    assert.equal(await f.solicitar(pagina.contenido, "geolocation", detalles), false);
    assert.equal(f.preguntas.length, 1);
    const notificaciones = f.solicitar(pagina.contenido, "notifications", detalles);
    pagina.navegar("https://other.example/");
    f.preguntas[1].resolve({ response: 1 });
    assert.equal(await notificaciones, false);
    assert.equal(f.sesion.comprobar(pagina.contenido, "notifications", "https://other.example", { requestingUrl: "https://other.example/" }), false);
});

test("reloads, same-origin navigation and leaving then returning invalidate a pending choice", async () => {
    for (const destino of ["https://maps.example/", "https://maps.example/otra", "https://other.example/"]) {
        const f = fixture();
        const pagina = f.pagina("https://maps.example/");
        const detalles = { requestingUrl: "https://maps.example/" };
        const pendiente = f.solicitar(pagina.contenido, "geolocation", detalles);
        pagina.navegar(destino);
        pagina.navegar("https://maps.example/");
        assert.equal(f.preguntas[0].opciones.signal.aborted, true);
        f.preguntas[0].resolve({ response: 1 });
        assert.equal(await pendiente, false);
        assert.equal(f.gestor.cantidadDecisiones(), 0);
        assert.equal(pagina.contenido.listenerCount("did-start-navigation"), 0);
        const nueva = f.solicitar(pagina.contenido, "geolocation", detalles);
        assert.equal(f.preguntas.length, 2);
        f.preguntas[1].resolve({ response: 1 });
        assert.equal(await nueva, true);
    }
});

test("different permissions are queued and an overlapping media choice keeps existing grants", async () => {
    const f = fixture();
    const pagina = f.pagina("https://meet.example/");
    const detalles = { requestingUrl: "https://meet.example/" };
    const audio = f.solicitar(pagina.contenido, "media", { ...detalles, mediaTypes: ["audio"] });
    const audioVideo = f.solicitar(pagina.contenido, "media", { ...detalles, mediaTypes: ["audio", "video"] });
    assert.equal(f.preguntas.length, 1);
    f.preguntas[0].resolve({ response: 1 });
    assert.equal(await audio, true);
    assert.equal(f.preguntas.length, 2);
    assert.match(f.preguntas[1].opciones.message, /cámara/);
    assert.doesNotMatch(f.preguntas[1].opciones.message, /micrófono/);
    f.preguntas[1].resolve({ response: 0 });
    assert.equal(await audioVideo, false);
    assert.equal(f.sesion.comprobar(pagina.contenido, "media", "https://meet.example", { mediaType: "audio" }), true);
    assert.equal(f.sesion.comprobar(pagina.contenido, "media", "https://meet.example", { mediaType: "video" }), false);
});

test("background tabs cannot show permission dialogs and switching tabs cancels a pending one", async () => {
    const f = fixture();
    const primera = f.pagina("https://one.example/");
    const segunda = f.pagina("https://two.example/");
    const detalles = { requestingUrl: "https://one.example/" };
    assert.equal(await f.solicitar(segunda.contenido, "notifications", { requestingUrl: "https://two.example/" }), false);
    assert.equal(f.preguntas.length, 0);
    const pendiente = f.solicitar(primera.contenido, "geolocation", detalles);
    f.activar(segunda.contenido);
    assert.equal(await pendiente, false);
    assert.equal(f.preguntas[0].opciones.signal.aborted, true);
    assert.equal(f.gestor.cantidadDecisiones(), 0);
});

test("notification checks without a tab only reuse an explicitly granted matching origin", async () => {
    const f = fixture();
    const pagina = f.pagina("https://notify.example/");
    assert.equal(f.sesion.comprobar(null, "notifications", "https://notify.example", {}), false);
    const permiso = f.solicitar(pagina.contenido, "notifications", { requestingUrl: "https://notify.example/" });
    f.preguntas[0].resolve({ response: 1 });
    assert.equal(await permiso, true);
    assert.equal(f.sesion.comprobar(null, "notifications", "https://notify.example", {}), true);
    assert.equal(f.sesion.comprobar(null, "notifications", "https://notify.example", { embeddingOrigin: "https://other.example" }), false);
    assert.equal(f.sesion.comprobar(null, "notifications", "https://other.example", {}), false);
    assert.equal(f.sesion.comprobar(null, "media", "https://notify.example", { mediaType: "audio" }), false);
    assert.equal(await f.solicitar(null, "notifications", { requestingUrl: "https://notify.example/" }), false);
});

test("unsupported schemes, subframes, inconsistent origins and ambiguous media fail closed", async () => {
    const f = fixture();
    const pagina = f.pagina("https://example.com/");
    const detalles = { requestingUrl: "https://example.com/" };
    for (const [permiso, adicionales] of [
        ["openExternal", { externalURL: "file:///programa.exe" }], ["fileSystem", {}], ["constructor", {}],
        ["notifications", { isMainFrame: false }], ["notifications", { securityOrigin: "https://other.example" }],
        ["media", {}], ["media", { mediaTypes: [] }], ["media", { mediaTypes: ["audio", "unknown"] }]
    ]) assert.equal(await f.solicitar(pagina.contenido, permiso, { ...detalles, ...adicionales }), false);
    assert.equal(f.sesion.comprobar(pagina.contenido, "notifications", "https://other.example", detalles), false);
    assert.equal(f.preguntas.length, 0);
});

test("dialog throws or rejections deny the request without preventing an explicit retry", async () => {
    for (const fallo of [() => { throw new Error("dialog unavailable"); }, () => Promise.reject(new Error("dialog rejected"))]) {
        const f = fixture();
        const pagina = f.pagina("https://example.com/");
        const mostrar = f.dialog.showMessageBox;
        f.dialog.showMessageBox = fallo;
        const detalles = { requestingUrl: "https://example.com/" };
        assert.equal(await f.solicitar(pagina.contenido, "geolocation", detalles), false);
        assert.equal(f.gestor.cantidadDecisiones(), 0);
        f.dialog.showMessageBox = mostrar;
        const reintento = f.solicitar(pagina.contenido, "geolocation", detalles);
        f.preguntas[0].resolve({ response: 1 });
        assert.equal(await reintento, true);
    }
});

test("closing a page or window and renderer crashes answer pending callbacks only once", async () => {
    for (const evento of ["destroyed", "render-process-gone", "closed"]) {
        const f = fixture();
        const pagina = f.pagina("https://example.com/");
        const respuestas = [];
        f.sesion.solicitar(pagina.contenido, "geolocation", valor => respuestas.push(valor), { isMainFrame: true, requestingUrl: pagina.contenido.getURL() });
        if (evento === "closed") { f.ventana.destruida = true; f.ventana.emit(evento); }
        else pagina.contenido.emit(evento);
        f.preguntas[0].resolve({ response: 1 });
        await new Promise(resolve => setImmediate(resolve));
        assert.deepEqual(respuestas, [false]);
        assert.equal(f.gestor.cantidadDecisiones(), 0);
        assert.equal(pagina.contenido.listenerCount("destroyed"), 0);
    }
});

test("flooded requests are bounded and a bad callback cannot stop another response", async t => {
    const avisos = t.mock.method(console, "error", () => {});
    const f = fixture();
    const pagina = f.pagina("https://example.com/");
    const detalles = { isMainFrame: true, requestingUrl: pagina.contenido.getURL() };
    f.sesion.solicitar(pagina.contenido, "notifications", () => { throw new Error("renderer gone"); }, detalles);
    const solicitudes = Array.from({ length: 20 }, () => f.solicitar(pagina.contenido, "notifications", detalles));
    const otras = ["geolocation", "fullscreen", "pointerLock", "keyboardLock", "midi", "midiSysex", "idle-detection", "window-management"]
        .map(permiso => f.solicitar(pagina.contenido, permiso, detalles));
    assert.equal(f.preguntas.length, 1);
    f.preguntas[0].resolve({ response: 1 });
    const valores = await Promise.all(solicitudes);
    assert.equal(avisos.mock.callCount(), 1);
    assert.equal(valores.filter(Boolean).length, 15);
    assert.equal(valores.filter(valor => !valor).length, 5);
    pagina.navegar("https://example.com/otra");
    assert.ok((await Promise.all(otras)).every(valor => valor === false));
    assert.equal(pagina.contenido.listenerCount("did-start-navigation"), 0);
});
