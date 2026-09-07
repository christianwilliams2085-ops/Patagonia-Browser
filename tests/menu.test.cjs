const { test } = require("node:test");
const assert = require("node:assert/strict");
const { registrarMenu } = require("../src/main/menu");

test("Spanish browser menu routes reload and search to the active page and keeps editing roles", () => {
    let menu;
    const llamadas = [];
    const acciones = Object.fromEntries(["nueva", "reabrir", "cerrar", "buscar", "direccion", "atras", "adelante", "recargar", "detener", "inicio", "cerrarVentana"].map(nombre => [nombre, () => llamadas.push(nombre)]));
    registrarMenu({ buildFromTemplate: datos => datos, setApplicationMenu: datos => { menu = datos; } }, acciones, "win32");
    const opciones = menu.flatMap(item => item.submenu);
    opciones.find(item => item.label === "Recargar página").click();
    opciones.find(item => item.label === "Buscar en la página").click();
    opciones.find(item => item.label === "Detener carga").click();
    opciones.find(item => item.label === "Reabrir pestaña cerrada").click();
    assert.deepEqual(llamadas, ["recargar", "buscar", "detener", "reabrir"]);
    assert.equal(opciones.some(item => ["reload", "forceReload", "close"].includes(item.role)), false);
    assert.ok(opciones.some(item => item.role === "copy"));
    assert.equal(opciones.filter(item => item.accelerator === "CmdOrCtrl+W").length, 1);
    assert.equal(opciones.filter(item => item.accelerator === "CmdOrCtrl+Shift+T").length, 1);
});
