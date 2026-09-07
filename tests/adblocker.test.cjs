const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { ElectronBlocker, Request } = require("@ghostery/adblocker-electron");
const { dominioWeb, encontrarSitioPermitido, sitioEstaPermitido, clasificarBloqueo } = require("../src/main/adblocker");

test("la protección reconoce sitios web y aplica sus excepciones solo al dominio elegido", () => {
    assert.equal(dominioWeb("https://www.example.com/ruta"), "example.com");
    assert.equal(dominioWeb("file:///inicio.html"), "");
    const permitidos = new Set(["example.com"]);
    assert.equal(sitioEstaPermitido(permitidos, "example.com"), true);
    assert.equal(sitioEstaPermitido(permitidos, "video.example.com"), true);
    assert.equal(encontrarSitioPermitido(permitidos, "video.example.com"), "example.com");
    assert.equal(sitioEstaPermitido(permitidos, "notexample.com"), false);
});

test("los conteos distinguen rastreadores de anuncios visibles", () => {
    assert.equal(clasificarBloqueo({ isThirdParty: true, type: "script" }), "rastreadores");
    assert.equal(clasificarBloqueo({ isThirdParty: true, type: "xhr" }), "rastreadores");
    assert.equal(clasificarBloqueo({ isThirdParty: true, type: "image" }), "anuncios");
    assert.equal(clasificarBloqueo({ isThirdParty: false, type: "script" }), "anuncios");
});

test("el motor incluido bloquea publicidad y seguimiento conocidos sin bloquear recursos normales", () => {
    const ruta = path.join(__dirname, "..", "assets", "patagonia-adblock.bin");
    const motor = ElectronBlocker.deserialize(fs.readFileSync(ruta));
    const solicitud = (url, type = "script") => Request.fromRawDetails({
        requestId: url,
        tabId: 1,
        url,
        sourceUrl: "https://example.com/",
        type
    });
    assert.equal(motor.match(solicitud("https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js")).match, true);
    assert.equal(motor.match(solicitud("https://www.google-analytics.com/analytics.js")).match, true);
    assert.equal(motor.match(solicitud("https://example.com/app.js")).match, false);
});
