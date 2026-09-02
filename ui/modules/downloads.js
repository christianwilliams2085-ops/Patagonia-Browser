(() => {
    const abrir = document.getElementById("abrirDescargas");
    const panel = document.getElementById("panelDescargas");
    const lista = document.getElementById("listaDescargas");
    const aviso = document.getElementById("estadoDescargas");
    const filas = new Map();
    let revision = -1;

    function bytes(valor) {
        if (valor < 1024) return `${valor} B`;
        if (valor < 1024 * 1024) return `${(valor / 1024).toFixed(1)} KB`;
        return `${(valor / (1024 * 1024)).toFixed(1)} MB`;
    }
    async function ejecutar(accion, boton) {
        if (boton) boton.disabled = true;
        aviso.textContent = "";
        try {
            const respuesta = await accion();
            if (!respuesta.correcto) throw new Error(respuesta.error);
            mostrar(respuesta);
        } catch (error) {
            aviso.textContent = error.message || "No se pudo actualizar la descarga.";
        } finally {
            if (boton) boton.disabled = false;
        }
    }
    function crearFila(id) {
        const fila = document.createElement("li");
        const nombre = document.createElement("strong");
        const estado = document.createElement("p");
        const progreso = document.createElement("progress");
        const cancelar = document.createElement("button");
        const carpeta = document.createElement("button");
        cancelar.className = carpeta.className = "historial-accion";
        cancelar.textContent = "Cancelar";
        carpeta.textContent = "Mostrar en carpeta";
        cancelar.addEventListener("click", () => ejecutar(() => window.patagonia.cancelarDescarga(id), cancelar));
        carpeta.addEventListener("click", () => ejecutar(() => window.patagonia.mostrarDescarga(id), carpeta));
        fila.append(nombre, estado, progreso, cancelar, carpeta);
        return { fila, nombre, estado, progreso, cancelar, carpeta };
    }
    function mostrar(datos) {
        if (datos.revision < revision) return;
        revision = datos.revision;
        const ids = new Set(datos.descargas.map(dato => dato.id));
        for (const [id, fila] of filas) {
            if (!ids.has(id)) { fila.fila.remove(); filas.delete(id); }
        }
        let anterior = null;
        for (const dato of datos.descargas) {
            if (!filas.has(dato.id)) filas.set(dato.id, crearFila(dato.id));
            const f = filas.get(dato.id);
            // Conservamos los botones y su foco durante las actualizaciones de progreso.
            const siguiente = anterior ? anterior.nextElementSibling : lista.firstElementChild;
            if (siguiente !== f.fila) lista.insertBefore(f.fila, siguiente);
            anterior = f.fila;
            const activa = dato.estado === "descargando" || dato.estado === "interrumpida";
            f.nombre.textContent = dato.nombre;
            f.nombre.title = dato.nombre;
            const etiquetas = { descargando: "Descargando", interrumpida: "Conexión interrumpida", completada: "Completada", cancelada: "Cancelada", fallida: "No se pudo completar. Iniciá la descarga de nuevo desde la página." };
            const cantidad = dato.total > 0 ? `${bytes(dato.recibidos)} de ${bytes(dato.total)}` : `${bytes(dato.recibidos)} · tamaño desconocido`;
            f.estado.textContent = `${etiquetas[dato.estado]} · ${cantidad}`;
            f.progreso.hidden = !activa;
            f.progreso.setAttribute("aria-label", `Progreso de ${dato.nombre}`);
            if (dato.total > 0) {
                f.progreso.max = dato.total;
                f.progreso.value = Math.min(dato.recibidos, dato.total);
            } else f.progreso.removeAttribute("value");
            f.cancelar.hidden = !activa;
            f.cancelar.setAttribute("aria-label", `Cancelar descarga de ${dato.nombre}`);
            f.carpeta.hidden = dato.estado !== "completada";
        }
        document.getElementById("descargasVacias").hidden = datos.descargas.length > 0;
        const activas = datos.descargas.filter(d => ["descargando", "interrumpida"].includes(d.estado)).length;
        document.getElementById("contadorDescargas").textContent = activas ? ` (${activas})` : "";
    }
    abrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        abrir.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) ejecutar(() => window.patagonia.listarDescargas());
    });
    window.addEventListener("abrir-descargas", () => {
        panel.hidden = false;
        abrir.setAttribute("aria-expanded", "true");
        abrir.scrollIntoView({ block: "start" });
        abrir.focus({ preventScroll: true });
        ejecutar(() => window.patagonia.listarDescargas());
    });
    window.patagonia.recibirDescargas(mostrar);
    ejecutar(() => window.patagonia.listarDescargas());
})();
