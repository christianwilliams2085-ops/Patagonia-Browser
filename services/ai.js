function limpiarTexto(texto) {
    return String(texto || "")
        .replace(/\r/g, " ")
        .replace(/\n+/g, " ")
        .replace(/\t+/g, " ")
        .replace(
            /\((?:imagen|foto|fotografía|archivo|ilustrativa|crédito)[^)]*\)/gi,
            " "
        )
        .replace(
            /\((?:[^()]*)?(?:infobae|maximiliano luna|reuters|afp|ap|efe)(?:[^()]*)?\)/gi,
            " "
        )
        .replace(/\s{2,}/g, " ")
        .trim();
}

function dividirEnOraciones(texto) {
    return limpiarTexto(texto)
        .split(/(?<=[.!?])\s+/)
        .map((oracion) => oracion.trim())
        .filter((oracion) => oracion.length >= 35);
}

function contieneDemasiadoRuido(texto) {
    const contenido = texto.toLowerCase();

    const patronesRuido = [
        "skip to content",
        "sign in",
        "subscribe",
        "open in a new tab",
        "privacy",
        "cookies",
        "terms",
        "advertisement"
    ];

    return patronesRuido.some((patron) =>
        contenido.includes(patron)
    );
}

function seleccionarOracionesImportantes(texto, cantidad = 5) {
    const oraciones = dividirEnOraciones(texto);

    const candidatas = oraciones
        .filter((oracion) => !contieneDemasiadoRuido(oracion))
        .filter((oracion) => oracion.length <= 260)
        .slice(0, 20);

    return candidatas.slice(0, cantidad);
}

function crearResumenEstructurado(contexto) {
    const titulo = limpiarTexto(contexto?.titulo);
    const url = limpiarTexto(contexto?.url);
    const texto = limpiarTexto(contexto?.texto);

    if (!texto) {
        return [
            "No encontré contenido visible para resumir.",
            "",
            `Título: ${titulo || "Sin título"}`,
            `URL: ${url || "No disponible"}`
        ].join("\n");
    }

    const oracionesImportantes = seleccionarOracionesImportantes(texto);

    if (oracionesImportantes.length === 0) {
        const fragmento = texto.slice(0, 900);

        return [
            "Resumen",
            "",
            fragmento + (texto.length > 900 ? "…" : ""),
            "",
            `Título: ${titulo || "Sin título"}`,
            `URL: ${url || "No disponible"}`
        ].join("\n");
    }

    return [
        "Resumen",
        "",
        oracionesImportantes.join(" "),
        "",
        `Título: ${titulo || "Sin título"}`,
        `URL: ${url || "No disponible"}`
    ].join("\n");
}

function crearRespuestaContextual(mensaje, contexto) {
    const texto = limpiarTexto(mensaje).toLowerCase();

    if (!contexto) {
        return "No pude obtener el contexto de la página activa.";
    }

    if (
        texto.includes("resum") ||
        texto.includes("de qué trata") ||
        texto.includes("de que trata") ||
        texto.includes("qué dice esta página") ||
        texto.includes("que dice esta pagina")
    ) {
        return crearResumenEstructurado(contexto);
    }

    if (
        texto.includes("url") ||
        texto.includes("dirección") ||
        texto.includes("direccion")
    ) {
        return [
            `Título: ${contexto.titulo}`,
            `URL: ${contexto.url}`
        ].join("\n");
    }

    return [
        "Puedo leer la página activa, pero todavía estoy funcionando en modo local.",
        "",
        "Probá preguntando:",
        "• ¿De qué trata esta página?",
        "• Resumí esta página",
        "• ¿Cuál es la URL?"
    ].join("\n");
}

async function procesarConsulta({
    mensaje,
    contexto
}) {
    return {
        proveedor: "local",
        modelo: "patagonia-local",
        respuesta: crearRespuestaContextual(
            mensaje,
            contexto
        )
    };
}

module.exports = {
    procesarConsulta
};