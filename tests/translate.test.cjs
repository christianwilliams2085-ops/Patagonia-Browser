const { test } = require("node:test");
const assert = require("node:assert/strict");
const { esTraducida, esRedLocal, urlTraduccion, urlOriginal, decodificarHost } = require("../src/main/translate");
const { crearPlantillaMenu } = require("../src/main/contextMenu");

test("public pages are sent to Google Translate into Spanish", () => {
    const { url, error } = urlTraduccion("https://www.formula1.com/en/latest/article?id=5#top");
    assert.equal(error, undefined);
    const destino = new URL(url);
    assert.equal(destino.origin + destino.pathname, "https://translate.google.com/translate");
    assert.equal(destino.searchParams.get("sl"), "auto");
    assert.equal(destino.searchParams.get("tl"), "es");
    assert.equal(destino.searchParams.get("u"), "https://www.formula1.com/en/latest/article?id=5#top");
});

test("local network, internal, credential and non-web pages are never sent to Google", () => {
    for (const direccion of [
        "http://192.168.0.1/", "http://10.0.0.5/", "http://172.20.1.1/", "http://127.0.0.1:3000/",
        "http://localhost/", "http://router/", "http://nas.local/", "http://[::1]/", "http://100.80.1.2/"
    ]) {
        assert.match(urlTraduccion(direccion).error, /red local/, direccion);
    }
    assert.ok(urlTraduccion("https://user:clave@example.com/").error);
    assert.ok(urlTraduccion("file:///C:/secreto.html").error);
    assert.ok(urlTraduccion("").error);
    assert.ok(urlTraduccion("https://example-com.translate.goog/").error);
    assert.equal(esRedLocal("172.32.0.1"), false);
    assert.equal(esRedLocal("8.8.8.8"), false);
    assert.equal(esRedLocal("example.com"), false);
});

// Casos de prueba publicados por Google Search Central.
test("translate.goog hostnames decode exactly like Google's reference table", () => {
    const casos = [
        ["https://example-com.translate.goog", "example.com"],
        ["https://foo-example-com.translate.goog", "foo.example.com"],
        ["https://foo--example-com.translate.goog", "foo-example.com"],
        ["https://0-57hw060o-com.translate.goog/?_x_tr_enc=0", "xn--57hw060o.com"],
        ["https://1-en--us-example-com.translate.goog/?_x_tr_enc=1", "en-us.example.com"],
        ["https://0-en----w45as309w-com.translate.goog/?_x_tr_enc=0", "xn--en--w45as309w.com"],
        ["https://1-0-----16pw588q-com.translate.goog/?_x_tr_enc=0,1", "xn----16pw588q.com"],
        ["https://lanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-co-uk.translate.goog/?_x_tr_hp=l",
            "llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch.co.uk"],
        ["https://lanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch-co-uk.translate.goog/?_x_tr_hp=www-l",
            "www.llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch.co.uk"],
        ["https://g5h3969ntadg44juhyah3c9aza87iiar4i410avdl8d3f1fuq3nz05dg5b-com.translate.goog/?_x_tr_enc=0&_x_tr_hp=0-",
            "xn--g5h3969ntadg44juhyah3c9aza87iiar4i410avdl8d3f1fuq3nz05dg5b.com"]
    ];
    for (const [proxy, esperado] of casos) assert.equal(decodificarHost(new URL(proxy)), esperado, proxy);
});

test("the original page keeps its path, parameters and fragment", () => {
    assert.equal(
        urlOriginal("https://www-formula1-com.translate.goog/en/latest?id=5&_x_tr_sl=auto&_x_tr_tl=es&_x_tr_hl=es&_x_tr_pto=wapp#top"),
        "https://www.formula1.com/en/latest?id=5#top"
    );
    assert.equal(urlOriginal("https://viejo-example-com.translate.goog/?_x_tr_sch=http&_x_tr_tl=es"), "http://viejo.example.com/");
    assert.equal(urlOriginal("https://www.formula1.com/"), null);
    assert.equal(urlOriginal("http://example-com.translate.goog/"), null);
    assert.equal(esTraducida("https://example-com.translate.goog/x"), true);
    assert.equal(esTraducida("https://translate.goog.example.com/"), false);
});

test("the page menu offers translating or going back to the original", () => {
    const base = { contenido: { navigationHistory: { canGoBack: () => false, canGoForward: () => false } }, clipboard: {}, abrirEnPestana() {} };
    let llamado = 0;
    const menu = crearPlantillaMenu({}, { ...base, traducir: () => ({ etiqueta: "Traducir al español", accion: () => { llamado++; } }) });
    const item = menu.find(i => i.label === "Traducir al español");
    item.click();
    assert.equal(llamado, 1);
    const sinOpcion = crearPlantillaMenu({}, { ...base, traducir: () => null });
    assert.equal(sinOpcion.some(i => /Traducir|original/.test(i.label || "")), false);
});
