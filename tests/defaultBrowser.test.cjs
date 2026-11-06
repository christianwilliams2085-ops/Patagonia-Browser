const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
    NOMBRE_APP, extraerEnlaces, entradasRegistro, comandosRegistrar, comandosQuitar,
    ejecutarSincronico, ejecutarEnSegundoPlano, atenderEventoInstalador, abrirConfiguracionWindows
} = require("../src/main/defaultBrowser");

const EXE = "C:\\Users\\colo\\AppData\\Local\\PatagoniaBrowser\\Patagonia Browser.exe";

test("links sent by other programs are opened, unsafe or flag arguments are ignored", () => {
    assert.deepEqual(extraerEnlaces([EXE, "https://claude.ai/chat"]), ["https://claude.ai/chat"]);
    assert.deepEqual(extraerEnlaces(["electron.exe", ".", "http://192.168.0.1"]), ["http://192.168.0.1/"]);
    assert.deepEqual(extraerEnlaces([EXE, "--patagonia-app=\"https://a.com\"", "--allow-file-access-from-files"]), []);
    assert.deepEqual(extraerEnlaces([EXE, "file:///C:/Windows/win.ini", "javascript:alert(1)", "https://u:p@a.com"]), []);
    assert.deepEqual(extraerEnlaces(["https://solo-el-ejecutable.com"]), []);
    assert.equal(extraerEnlaces([EXE, ...Array.from({ length: 50 }, (_, i) => `https://a.com/${i}`)]).length, 20);
});

test("Windows registration lists Patagonia as a browser for http and https of the current user only", () => {
    const entradas = entradasRegistro(EXE);
    assert.ok(entradas.every(([clave]) => clave.startsWith("HKCU\\")));
    const buscar = (fin, nombre) => entradas.find(([clave, valor]) => clave.endsWith(fin) && valor === nombre)?.[2];
    assert.equal(buscar("RegisteredApplications", NOMBRE_APP), "Software\\Clients\\StartMenuInternet\\PatagoniaBrowser\\Capabilities");
    assert.equal(buscar("URLAssociations", "http"), "PatagoniaBrowserURL");
    assert.equal(buscar("URLAssociations", "https"), "PatagoniaBrowserURL");
    assert.equal(buscar("PatagoniaBrowserURL\\shell\\open\\command", ""), `"${EXE}" "%1"`);
    const comandos = comandosRegistrar(EXE);
    assert.ok(comandos.every(args => args[0] === "add" && args.at(-1) === "/f"));
    assert.deepEqual(comandos[0].slice(0, 3), ["add", "HKCU\\Software\\Clients\\StartMenuInternet\\PatagoniaBrowser", "/ve"]);
    assert.ok(comandosQuitar().every(args => args[0] === "delete" && args[1].startsWith("HKCU\\")));
});

test("installer events register or clean up and never crash on registry errors", () => {
    const llamadas = [];
    const ejecutar = (programa, args) => { llamadas.push([programa, args[0]]); if (args[0] === "delete") throw new Error("no existe"); };
    assert.equal(atenderEventoInstalador([EXE, "--squirrel-install"], EXE, ejecutar), true);
    assert.ok(llamadas.length > 10 && llamadas.every(([programa, accion]) => programa === "reg.exe" && accion === "add"));
    llamadas.length = 0;
    assert.equal(atenderEventoInstalador([EXE, "--squirrel-uninstall"], EXE, ejecutar), true);
    assert.equal(llamadas.length, 3);
    assert.equal(atenderEventoInstalador([EXE, "--squirrel-firstrun"], EXE, () => assert.fail()), false);
    assert.equal(atenderEventoInstalador([EXE], EXE, () => assert.fail()), false);
    assert.doesNotThrow(() => ejecutarSincronico([["add"]], () => { throw new Error("x"); }));
});

test("background registration runs every command even if one fails", async () => {
    const hechos = [];
    await ejecutarEnSegundoPlano([["a"], ["b"]], (_p, args, _o, listo) => { hechos.push(args[0]); listo(new Error("x")); });
    assert.deepEqual(hechos, ["a", "b"]);
});

test("the settings button opens Patagonia's page in Windows default apps", async () => {
    const abiertas = [];
    await abrirConfiguracionWindows({ openExternal: async url => { abiertas.push(url); } });
    assert.deepEqual(abiertas, ["ms-settings:defaultapps?registeredAppUser=Patagonia%20Browser"]);
    abiertas.length = 0;
    await abrirConfiguracionWindows({ openExternal: async url => { abiertas.push(url); if (abiertas.length === 1) throw new Error("x"); } });
    assert.deepEqual(abiertas.at(-1), "ms-settings:defaultapps");
});
