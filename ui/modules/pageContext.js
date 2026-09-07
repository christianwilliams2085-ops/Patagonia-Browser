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
    // Quitar etiquetas de navegación completas, sin borrar palabras de una
    // oración: "publicidad", "compartir" o "privacidad" pueden ser el tema.
    const etiqueta = /^(?:skip to content|opens? in a new tab|iniciar sesi[oó]n|registrarme|sign in|subscribe|aceptar cookies|pol[ií]tica de privacidad|t[eé]rminos y condiciones|advertisement|trends?|tendencias?|temas destacados|noticias relacionadas|le[eé] también|compartir|publicidad|recomendados?|sponsored)[.!:]*$/i;
    return String(texto || "").split(/\r?\n/)
        .filter(linea => !etiqueta.test(linea.trim())).join("\n");
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