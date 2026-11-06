// Traducción de páginas con Google Translate.
// Google descarga la página por su cuenta y la muestra traducida en *.translate.goog.
// Por eso no sirve para páginas con sesión iniciada ni de la red local.
const SUFIJO = ".translate.goog";
const IDIOMA = "es";

function analizar(valor) {
    try { return new URL(String(valor || "")); } catch { return null; }
}

function esTraducida(valor) {
    const url = analizar(valor);
    return Boolean(url && url.protocol === "https:" && url.hostname.endsWith(SUFIJO));
}

function esRedLocal(hostname) {
    const host = String(hostname || "").toLowerCase().replace(/^\[|\]$/g, "");
    if (!host.includes(".") && !host.includes(":")) return true; // "router", "localhost"
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
        host.endsWith(".lan") || host.endsWith(".home") || host.endsWith(".internal")) return true;
    if (host === "::1" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe80:/.test(host)) return true;
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (!ipv4) return false;
    const [a, b] = ipv4.slice(1).map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

// Devuelve { url } con la dirección de traducción, o { error } explicando por qué no se puede.
function urlTraduccion(valor, idioma = IDIOMA) {
    const url = analizar(valor);
    if (!url || !["http:", "https:"].includes(url.protocol)) {
        return { error: "Abrí una página web para traducirla." };
    }
    if (url.username || url.password) return { error: "Esta dirección incluye usuario y contraseña; no se envía a Google." };
    if (esTraducida(url.href)) return { error: "Esta página ya está traducida." };
    if (esRedLocal(url.hostname)) {
        return { error: "Esta página es de tu red local (como el router). Google no puede verla, así que no se puede traducir." };
    }
    const destino = new URL("https://translate.google.com/translate");
    destino.searchParams.set("sl", "auto");
    destino.searchParams.set("tl", idioma);
    destino.searchParams.set("hl", idioma);
    destino.searchParams.set("u", url.href);
    return { url: destino.href };
}

// Reconstruye la dirección original a partir de la de translate.goog, con el
// algoritmo que publica Google en "Enabling your ad network to work with
// translation-related Google Search features" (Google Search Central).
function decodificarHost(url) {
    let prefijo = url.hostname.slice(0, url.hostname.indexOf("."));
    const codificaciones = url.searchParams.has("_x_tr_enc") ? url.searchParams.get("_x_tr_enc").split(",") : [];
    if (url.searchParams.has("_x_tr_hp")) prefijo = url.searchParams.get("_x_tr_hp") + prefijo;
    if (codificaciones.includes("1") && prefijo.startsWith("1-")) prefijo = prefijo.slice(2);
    let internacional = false;
    if (codificaciones.includes("0") && prefijo.startsWith("0-")) {
        internacional = true;
        prefijo = prefijo.slice(2);
    }
    const host = prefijo.replace(/\b-\b/g, ".").replace(/--/g, "-");
    return internacional ? `xn--${host}` : host;
}

function urlOriginal(valor) {
    const url = analizar(valor);
    if (!url || !esTraducida(url.href)) return null;
    const host = decodificarHost(url);
    if (!host) return null;
    const esquema = url.searchParams.get("_x_tr_sch") === "http" ? "http:" : "https:";
    const parametros = new URLSearchParams();
    for (const [clave, dato] of url.searchParams) {
        if (!clave.startsWith("_x_tr_")) parametros.append(clave, dato);
    }
    const consulta = parametros.toString();
    const original = analizar(`${esquema}//${host}${url.pathname}${consulta ? `?${consulta}` : ""}${url.hash}`);
    return original && ["http:", "https:"].includes(original.protocol) && !original.username ? original.href : null;
}

module.exports = { SUFIJO, esTraducida, esRedLocal, urlTraduccion, urlOriginal, decodificarHost };
