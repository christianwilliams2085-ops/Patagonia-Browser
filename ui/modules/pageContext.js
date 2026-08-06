function limpiarTexto(texto) {
    return String(texto || "")
        .replace(/\r/g, " ")
        .replace(/\n+/g, " ")
        .replace(/\t+/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
}

function eliminarFragmentosRepetidos(texto) {
    const fragmentos = limpiarTexto(texto)
        .split(/(?<=[.!?])\s+|\s{3,}/)
        .map((fragmento) => fragmento.trim())
        .filter(Boolean);

    const vistos = new Set();
    const resultado = [];

    for (const fragmento of fragmentos) {
        const clave = fragmento.toLowerCase();

        if (vistos.has(clave)) {
            continue;
        }

        vistos.add(clave);
        resultado.push(fragmento);
    }

    return resultado.join(" ");
}

function eliminarRuidoComun(texto) {
const patrones = [
    /\bskip to content\b/gi,
    /\bopen(?:s)? in a new tab\b/gi,
    /\biniciar sesi[oó]n\b/gi,
    /\bregistrarme\b/gi,
    /\bsign in\b/gi,
    /\bsubscribe\b/gi,
    /\baceptar cookies\b/gi,
    /\bpol[ií]tica de privacidad\b/gi,
    /\bt[eé]rminos y condiciones\b/gi,
    /\badvertisement\b/gi,
    /\btrends?\b/gi,
    /\btendencias?\b/gi,
    /\btemas destacados\b/gi,
    /\bnoticias relacionadas\b/gi,
    /\ble[eé] también\b/gi,
    /\bcompartir\b/gi,
    /\bpublicidad\b/gi,
    /\brecomendados?\b/gi,
    /\bsponsored\b/gi
];
    let resultado = limpiarTexto(texto);

    for (const patron of patrones) {
        resultado = resultado.replace(patron, " ");
    }

    return limpiarTexto(resultado);
}

function limitarTexto(texto, limite = 12000) {
    const contenido = eliminarFragmentosRepetidos(
        eliminarRuidoComun(texto)
    );

    if (contenido.length <= limite) {
        return contenido;
    }

    const recorte = contenido.slice(0, limite);
    const ultimoPunto = Math.max(
        recorte.lastIndexOf("."),
        recorte.lastIndexOf("!"),
        recorte.lastIndexOf("?")
    );

    if (ultimoPunto > limite * 0.7) {
        return `${recorte.slice(0, ultimoPunto + 1)}…`;
    }

    return `${recorte}…`;
}

function crearContextoPagina(datos = {}) {
    return {
        titulo: limpiarTexto(datos.titulo) || "Sin título",
        url: limpiarTexto(datos.url),
        texto: limitarTexto(datos.texto),
        obtenidoEn: new Date().toISOString()
    };
}

module.exports = {
    crearContextoPagina
};