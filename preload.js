const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("patagonia", {

    navegar: (url) => ipcRenderer.send("navegar", url),

    atras: () => ipcRenderer.send("atras"),

    adelante: () => ipcRenderer.send("adelante"),

    recargar: () => ipcRenderer.send("recargar"),

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
        ipcRenderer.on(
            "url-actualizada",
            (_, url) => callback(url)
        ),

    recibirPestanas: (callback) =>
        ipcRenderer.on(
            "pestanas-actualizadas",
            (_, pestanas) => callback(pestanas)
        ),

    recibirEstadoBarraLateral: (callback) =>
        ipcRenderer.on(
            "estado-barra-lateral",
            (_, estado) => callback(estado)
        )

});