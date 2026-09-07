function crearBusqueda({ obtenerContenido, notificar }) {
    const inicial = () => ({ abierta: false, texto: "", coincidencias: 0, actual: 0, buscando: false, error: "" });
    let datos = inicial();
    let contenido = null;
    let solicitud = null;
    const estado = () => ({ ...datos });
    const avisar = (enfocar = false) => notificar(estado(), enfocar);
    function limpiarSeleccion() {
        solicitud = null;
        if (contenido && !contenido.isDestroyed()) contenido.stopFindInPage("clearSelection");
    }
    function cerrar() {
        limpiarSeleccion();
        contenido = null;
        datos = inicial();
        avisar();
    }
    function abrir() {
        const actual = obtenerContenido();
        if (!actual || actual.isDestroyed()) return;
        if (actual !== contenido) { limpiarSeleccion(); datos = inicial(); contenido = actual; }
        datos.abierta = true;
        avisar(true);
    }
    function buscar(texto, adelante = true, repetir = false) {
        if (typeof texto !== "string" || texto.length > 1000 || !datos.abierta) return;
        if (!contenido || contenido.isDestroyed() || contenido !== obtenerContenido()) { cerrar(); return; }
        const nueva = !repetir || texto !== datos.texto;
        datos = { ...datos, texto, error: "", buscando: Boolean(texto) };
        if (!texto) {
            limpiarSeleccion();
            datos.coincidencias = 0;
            datos.actual = 0;
        } else {
            if (nueva) limpiarSeleccion();
            try {
                // En Electron 43 findNext=true inicia una sesión nueva de búsqueda.
                solicitud = contenido.findInPage(texto, { forward: adelante, findNext: nueva });
            } catch {
                solicitud = null;
                datos.buscando = false;
                datos.error = "No se pudo buscar en esta página.";
            }
        }
        avisar();
    }
    function siguiente(adelante = true) {
        if (!datos.abierta || !datos.texto) { abrir(); return; }
        buscar(datos.texto, adelante, true);
    }
    function observar(pagina) {
        pagina.on("found-in-page", (_evento, resultado) => {
            if (!datos.abierta || pagina !== contenido || pagina !== obtenerContenido() || resultado.requestId !== solicitud) return;
            datos.coincidencias = resultado.matches;
            datos.actual = resultado.activeMatchOrdinal;
            datos.buscando = !resultado.finalUpdate;
            avisar();
        });
        pagina.on("did-start-navigation", (_evento, _url, mismaPagina, principal) => {
            if (principal && !mismaPagina && pagina === contenido) cerrar();
        });
        for (const evento of ["destroyed", "render-process-gone"]) {
            pagina.on(evento, () => { if (pagina === contenido) cerrar(); });
        }
    }
    function cambiarPestana() {
        if (contenido && contenido !== obtenerContenido()) cerrar();
    }
    return { estado, abrir, cerrar, buscar, siguiente, observar, cambiarPestana, reenviar: avisar };
}

module.exports = { crearBusqueda };
