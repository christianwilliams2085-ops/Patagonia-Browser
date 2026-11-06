const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { crearPlantillaMenu, registrarMenuContextual } = require("../src/main/contextMenu");

function entorno() {
    const registro = { abiertas: [], copiado: [], descargas: [], imagenesCopiadas: [], recargas: 0 };
    const contenido = {
        navigationHistory: { canGoBack: () => true, canGoForward: () => false, goBack() { registro.atras = true; }, goForward() {} },
        downloadURL: url => registro.descargas.push(url),
        copyImageAt: (x, y) => registro.imagenesCopiadas.push([x, y]),
        reload: () => { registro.recargas++; }
    };
    const opciones = {
        contenido,
        clipboard: { writeText: texto => registro.copiado.push(texto) },
        abrirEnPestana: url => registro.abiertas.push(url)
    };
    return { registro, opciones };
}
const etiquetas = plantilla => plantilla.filter(item => item.type !== "separator").map(item => item.label);
const buscar = (plantilla, texto) => plantilla.find(item => item.label?.startsWith(texto));

test("right-clicking an image offers saving, copying and opening it", () => {
    const { registro, opciones } = entorno();
    const plantilla = crearPlantillaMenu({ mediaType: "image", srcURL: "https://example.com/foto.jpg", x: 10, y: 20 }, opciones);
    assert.deepEqual(etiquetas(plantilla), [
        "Abrir imagen en pestaña nueva", "Guardar imagen como…", "Copiar imagen", "Copiar dirección de la imagen"
    ]);
    buscar(plantilla, "Guardar imagen").click();
    buscar(plantilla, "Copiar imagen").click();
    buscar(plantilla, "Copiar dirección").click();
    buscar(plantilla, "Abrir imagen").click();
    assert.deepEqual(registro.descargas, ["https://example.com/foto.jpg"]);
    assert.deepEqual(registro.imagenesCopiadas, [[10, 20]]);
    assert.deepEqual(registro.copiado, ["https://example.com/foto.jpg"]);
    assert.deepEqual(registro.abiertas, ["https://example.com/foto.jpg"]);
});

test("embedded images can be saved but not opened as unsafe addresses", () => {
    const { opciones } = entorno();
    const datos = crearPlantillaMenu({ mediaType: "image", srcURL: "data:image/png;base64,AAAA" }, opciones);
    assert.deepEqual(etiquetas(datos), ["Guardar imagen como…", "Copiar imagen"]);
    const archivo = crearPlantillaMenu({ mediaType: "image", srcURL: "file:///C:/secreto.png" }, opciones);
    assert.deepEqual(etiquetas(archivo), ["Copiar imagen"]);
});

test("linked images show link and image options separated", () => {
    const { opciones } = entorno();
    const plantilla = crearPlantillaMenu({ linkURL: "https://example.com/nota", mediaType: "image", srcURL: "https://example.com/a.png" }, opciones);
    assert.equal(plantilla[0].label, "Abrir enlace en pestaña nueva");
    assert.equal(plantilla[2].type, "separator");
    assert.ok(buscar(plantilla, "Guardar imagen"));
    assert.equal(buscar(crearPlantillaMenu({ linkURL: "javascript:alert(1)" }, opciones), "Abrir enlace"), undefined);
});

test("selected text can be copied and searched privately", () => {
    const { registro, opciones } = entorno();
    const plantilla = crearPlantillaMenu({ selectionText: "  Fórmula 1 en Interlagos  " }, opciones);
    assert.equal(plantilla[0].role, "copy");
    plantilla[1].click();
    assert.equal(registro.abiertas[0], "https://duckduckgo.com/?q=F%C3%B3rmula%201%20en%20Interlagos");
});

test("text fields get edit actions and empty areas get navigation", () => {
    const { registro, opciones } = entorno();
    const campo = crearPlantillaMenu({ isEditable: true, editFlags: { canCut: false, canCopy: true, canPaste: true } }, opciones);
    assert.deepEqual(etiquetas(campo), ["Deshacer", "Rehacer", "Cortar", "Copiar", "Pegar", "Seleccionar todo"]);
    assert.equal(buscar(campo, "Cortar").enabled, false);
    const vacio = crearPlantillaMenu({}, opciones);
    assert.deepEqual(etiquetas(vacio), ["Atrás", "Adelante", "Recargar", "Seleccionar todo"]);
    assert.equal(vacio[1].enabled, false);
    vacio[0].click();
    vacio[2].click();
    assert.equal(registro.atras, true);
    assert.equal(registro.recargas, 1);
});

test("the menu pops up only while its window is alive", () => {
    const contenido = new EventEmitter();
    contenido.isDestroyed = () => false;
    contenido.navigationHistory = { canGoBack: () => false, canGoForward: () => false };
    let ventana = { isDestroyed: () => false };
    const mostrados = [];
    const Menu = { buildFromTemplate: plantilla => ({ popup: opciones => mostrados.push({ plantilla, opciones }) }) };
    registrarMenuContextual({ contenido, Menu, clipboard: {}, obtenerVentana: () => ventana, abrirEnPestana() {} });
    contenido.emit("context-menu", {}, { mediaType: "image", srcURL: "https://example.com/a.png" });
    assert.equal(mostrados.length, 1);
    assert.equal(mostrados[0].opciones.window, ventana);
    ventana = null;
    contenido.emit("context-menu", {}, {});
    assert.equal(mostrados.length, 1);
});
