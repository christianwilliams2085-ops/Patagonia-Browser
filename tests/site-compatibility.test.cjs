const test = require("node:test");
const assert = require("node:assert/strict");
const {
    requiereCompatibilidad,
    normalizarDominio,
    instalarCompatibilidadGhostery
} = require("../src/main/siteCompatibility");

test("detecta dominios dinámicos con compatibilidad especial", () => {
    assert.equal(normalizarDominio("WWW.ChatGPT.com."), "chatgpt.com");
    assert.equal(requiereCompatibilidad("chatgpt.com"), true);
    assert.equal(requiereCompatibilidad("www.youtube.com"), true);
    assert.equal(requiereCompatibilidad("example.com"), false);
});

test("desactiva sólo scriptlets y conserva filtros cosméticos", () => {
    const original = function (opciones) {
        return { styles: [".ad{display:none}"], scripts: ["proxyScript"] };
    };
    class FakeBlocker {}
    FakeBlocker.prototype.getCosmeticsFilters = original;

    instalarCompatibilidadGhostery(FakeBlocker);
    const youtube = new FakeBlocker().getCosmeticsFilters({ hostname: "youtube.com" });
    const normal = new FakeBlocker().getCosmeticsFilters({ hostname: "example.com" });

    assert.deepEqual(youtube.styles, [".ad{display:none}"]);
    assert.deepEqual(youtube.scripts, []);
    assert.deepEqual(normal.scripts, ["proxyScript"]);
});
