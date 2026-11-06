// Menú de clic derecho para las páginas: imágenes, enlaces, texto y campos editables.
const BUSCADOR = "https://duckduckgo.com/?q=";

function esWeb(valor) {
    try {
        const url = new URL(String(valor || ""));
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
    } catch { return false; }
}

function sePuedeGuardar(valor) {
    return esWeb(valor) || /^(data:image\/|blob:https?:\/\/)/i.test(String(valor || ""));
}

function resumir(texto, maximo = 30) {
    const limpio = String(texto || "").replace(/\s+/g, " ").trim();
    return limpio.length > maximo ? `${limpio.slice(0, maximo - 1)}…` : limpio;
}

function crearPlantillaMenu(params, { contenido, clipboard, abrirEnPestana, zoom, imprimir }) {
    const grupos = [];
    const flags = params.editFlags || {};
    const historial = contenido.navigationHistory;

    if (esWeb(params.linkURL)) {
        grupos.push([
            { label: "Abrir enlace en pestaña nueva", click: () => abrirEnPestana(params.linkURL) },
            { label: "Copiar dirección del enlace", click: () => clipboard.writeText(params.linkURL) }
        ]);
    }

    if (params.mediaType === "image" && params.srcURL) {
        const imagen = [];
        if (esWeb(params.srcURL)) {
            imagen.push({ label: "Abrir imagen en pestaña nueva", click: () => abrirEnPestana(params.srcURL) });
        }
        if (sePuedeGuardar(params.srcURL)) {
            imagen.push({ label: "Guardar imagen como…", click: () => contenido.downloadURL(params.srcURL) });
        }
        imagen.push({ label: "Copiar imagen", click: () => contenido.copyImageAt(params.x, params.y) });
        if (esWeb(params.srcURL)) {
            imagen.push({ label: "Copiar dirección de la imagen", click: () => clipboard.writeText(params.srcURL) });
        }
        grupos.push(imagen);
    }

    const seleccion = String(params.selectionText || "").trim();
    if (params.isEditable) {
        grupos.push([
            { label: "Deshacer", role: "undo", enabled: flags.canUndo !== false },
            { label: "Rehacer", role: "redo", enabled: flags.canRedo !== false }
        ]);
        grupos.push([
            { label: "Cortar", role: "cut", enabled: Boolean(flags.canCut) },
            { label: "Copiar", role: "copy", enabled: Boolean(flags.canCopy) },
            { label: "Pegar", role: "paste", enabled: flags.canPaste !== false },
            { label: "Seleccionar todo", role: "selectAll" }
        ]);
    } else if (seleccion) {
        grupos.push([
            { label: "Copiar", role: "copy" },
            {
                label: `Buscar "${resumir(seleccion)}" en DuckDuckGo`,
                click: () => abrirEnPestana(BUSCADOR + encodeURIComponent(seleccion.slice(0, 500)))
            }
        ]);
    }

    if (!grupos.length) {
        grupos.push([
            { label: "Atrás", enabled: Boolean(historial?.canGoBack()), click: () => historial.goBack() },
            { label: "Adelante", enabled: Boolean(historial?.canGoForward()), click: () => historial.goForward() },
            { label: "Recargar", click: () => contenido.reload() }
        ]);
        grupos.push([{ label: "Seleccionar todo", role: "selectAll" }]);
        if (zoom) {
            grupos.push([
                { label: "Acercar", accelerator: "CmdOrCtrl+Plus", registerAccelerator: false, click: () => zoom(1) },
                { label: "Alejar", accelerator: "CmdOrCtrl+-", registerAccelerator: false, click: () => zoom(-1) },
                { label: "Tamaño normal", accelerator: "CmdOrCtrl+0", registerAccelerator: false, click: () => zoom(0) }
            ]);
        }
        if (imprimir) {
            grupos.push([{ label: "Imprimir…", accelerator: "CmdOrCtrl+P", registerAccelerator: false, click: imprimir }]);
        }
    }

    return grupos.flatMap((grupo, indice) => (indice ? [{ type: "separator" }, ...grupo] : grupo));
}

function registrarMenuContextual({ contenido, Menu, clipboard, obtenerVentana, abrirEnPestana, zoom, imprimir }) {
    contenido.on("context-menu", (_evento, params) => {
        const ventana = obtenerVentana();
        if (!ventana || ventana.isDestroyed() || contenido.isDestroyed()) return;
        const plantilla = crearPlantillaMenu(params, { contenido, clipboard, abrirEnPestana, zoom, imprimir });
        if (plantilla.length) Menu.buildFromTemplate(plantilla).popup({ window: ventana });
    });
}

module.exports = { crearPlantillaMenu, registrarMenuContextual, esWeb, sePuedeGuardar };
