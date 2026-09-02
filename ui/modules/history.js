(() => {
    const abrir = document.getElementById("abrirHistorial");
    const panel = document.getElementById("panelHistorial");
    const buscar = document.getElementById("buscarHistorial");
    const lista = document.getElementById("listaHistorial");
    const estado = document.getElementById("estadoHistorial");
    const vacio = document.getElementById("historialVacio");
    const borrar = document.getElementById("borrarHistorial");
    const confirmar = document.getElementById("confirmarBorradoHistorial");
    const aceptar = document.getElementById("aceptarBorradoHistorial");
    const mas = document.getElementById("masHistorial");
    let datos = [];
    let ocupado = false;
    let pendiente = false;
    let cantidad = 50;
    const formato = new Intl.DateTimeFormat("es", { dateStyle: "short", timeStyle: "short" });

    function mostrar() {
        const consulta = buscar.value.trim().toLocaleLowerCase();
        const visibles = datos.filter(item => `${item.titulo} ${item.url}`.toLocaleLowerCase().includes(consulta));
        lista.replaceChildren();
        vacio.hidden = visibles.length > 0;
        vacio.textContent = consulta ? "No encontramos visitas con esa búsqueda." : "Todavía no hay páginas visitadas.";
        mas.hidden = visibles.length <= cantidad;
        borrar.disabled = ocupado;
        aceptar.disabled = ocupado;
        visibles.slice(0, cantidad).forEach(visita => {
            const fila = document.createElement("li");
            const enlace = document.createElement("button");
            enlace.className = "favorito-abrir";
            enlace.title = visita.url;
            enlace.disabled = ocupado;
            const titulo = document.createElement("span");
            titulo.textContent = visita.titulo;
            const dominio = document.createElement("small");
            dominio.textContent = new URL(visita.url).hostname;
            const fecha = document.createElement("time");
            fecha.dateTime = visita.fecha;
            fecha.textContent = formato.format(new Date(visita.fecha));
            enlace.append(titulo, dominio, fecha);
            enlace.addEventListener("click", () => ejecutar(async () => {
                const resultado = await window.patagonia.abrirVisita(visita.id);
                if (resultado.correcto) window.dispatchEvent(new Event("historial-abierto"));
                return resultado;
            }));
            const quitar = document.createElement("button");
            quitar.className = "favorito-eliminar";
            quitar.textContent = "×";
            quitar.title = `Borrar visita: ${visita.titulo}`;
            quitar.setAttribute("aria-label", quitar.title);
            quitar.disabled = ocupado;
            quitar.addEventListener("click", () => ejecutar(() => window.patagonia.eliminarVisita(visita.id)));
            fila.append(enlace, quitar);
            lista.append(fila);
        });
    }

    async function ejecutar(accion) {
        if (ocupado) return;
        ocupado = true;
        estado.textContent = "";
        mostrar();
        try {
            const resultado = await accion();
            if (!resultado.correcto) throw new Error(resultado.error);
            datos = resultado.historial;
        } catch (error) {
            estado.textContent = error.message || "No se pudo actualizar el historial.";
        } finally {
            ocupado = false;
            mostrar();
            if (pendiente && !panel.hidden) { pendiente = false; cargar(); }
        }
    }
    function cargar() { return ejecutar(() => window.patagonia.listarHistorial()); }
    abrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        abrir.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) { cargar(); buscar.focus(); }
    });
    buscar.addEventListener("input", () => { cantidad = 50; mostrar(); });
    mas.addEventListener("click", () => { cantidad += 50; mostrar(); });
    borrar.addEventListener("click", () => { confirmar.hidden = false; });
    document.getElementById("cancelarBorradoHistorial").addEventListener("click", () => { confirmar.hidden = true; });
    aceptar.addEventListener("click", () => {
        confirmar.hidden = true;
        ejecutar(() => window.patagonia.vaciarHistorial());
    });
    window.patagonia.recibirHistorial(error => {
        if (error) { estado.textContent = error; return; }
        if (panel.hidden) return;
        if (ocupado) pendiente = true;
        else cargar();
    });
})();
