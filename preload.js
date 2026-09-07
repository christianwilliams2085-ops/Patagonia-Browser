const { contextBridge, ipcRenderer } = require("electron");

function suscribir(canal, callback) {
    if (typeof callback !== "function") throw new TypeError("El receptor debe ser una función.");
    const recibir = (_evento, ...datos) => callback(...datos);
    ipcRenderer.on(canal, recibir);
    // El renderer recibe únicamente cómo cancelar su suscripción, nunca ipcRenderer.
    return () => { ipcRenderer.removeListener(canal, recibir); };
}

contextBridge.exposeInMainWorld("patagonia", {
    abrirBusqueda: () => ipcRenderer.send("abrir-busqueda"),
    buscarEnPagina: datos => ipcRenderer.send("buscar-en-pagina", datos),
    cerrarBusqueda: () => ipcRenderer.send("cerrar-busqueda"),
    recibirBusqueda: callback => suscribir("estado-busqueda", callback),
    obtenerConfiguracion: () => ipcRenderer.invoke("obtener-configuracion"),
    guardarConfiguracion: datos => ipcRenderer.invoke("guardar-configuracion", datos),
    recibirEnfoqueDireccion: callback => suscribir("enfocar-direccion", callback),
    obtenerProteccion: () => ipcRenderer.invoke("obtener-proteccion"),
    alternarProteccionSitio: () => ipcRenderer.invoke("alternar-proteccion-sitio"),
    recibirProteccion: callback => suscribir("proteccion-actualizada", callback),
    obtenerSesion: () => ipcRenderer.invoke("obtener-sesion"),
    guardarSesion: () => ipcRenderer.invoke("guardar-sesion"),
    recibirSesion: (callback) => suscribir("sesion-actualizada", callback),
    listarDescargas: () => ipcRenderer.invoke("listar-descargas"),
    cancelarDescarga: (id) => ipcRenderer.invoke("cancelar-descarga", id),
    mostrarDescarga: (id) => ipcRenderer.invoke("mostrar-descarga", id),
    recibirDescargas: (callback) => suscribir("descargas-actualizadas", callback),
    listarHistorial: () => ipcRenderer.invoke("listar-historial"),
    abrirVisita: (id) => ipcRenderer.invoke("abrir-visita", id),
    eliminarVisita: (id) => ipcRenderer.invoke("eliminar-visita", id),
    vaciarHistorial: () => ipcRenderer.invoke("vaciar-historial"),
    recibirHistorial: (callback) => suscribir("historial-actualizado", callback),
    listarFavoritos: () => ipcRenderer.invoke("listar-favoritos"),
    alternarFavorito: () => ipcRenderer.invoke("alternar-favorito"),
    eliminarFavorito: (id) => ipcRenderer.invoke("eliminar-favorito", id),
    abrirFavorito: (id) => ipcRenderer.invoke("abrir-favorito", id),

    navegar: (url) => ipcRenderer.send("navegar", url),

    atras: () => ipcRenderer.send("atras"),

    adelante: () => ipcRenderer.send("adelante"),

    recargar: () => ipcRenderer.send("recargar"),
    detener: () => ipcRenderer.send("detener-carga"),

    inicio: () => ipcRenderer.send("inicio"),

    nuevaPestana: () => ipcRenderer.send("nueva-pestana"),

    activarPestana: (id) =>
        ipcRenderer.send("activar-pestana", id),

    cerrarPestana: (id) =>
        ipcRenderer.send("cerrar-pestana", id),

    alternarBarraLateral: () =>
        ipcRenderer.send("alternar-barra-lateral"),

    obtenerContextoPagina: () =>
        ipcRenderer.invoke("obtener-contexto-pagina"),

    procesarConsultaIA: (mensaje) =>
        ipcRenderer.invoke("procesar-consulta-ia", mensaje),

    recibirURL: (callback) =>
        suscribir(
            "url-actualizada",
            callback
        ),

    recibirPestanas: (callback) =>
        suscribir(
            "pestanas-actualizadas",
            callback
        ),

    recibirEstadoBarraLateral: (callback) =>
        suscribir(
            "estado-barra-lateral",
            callback
        )

});
