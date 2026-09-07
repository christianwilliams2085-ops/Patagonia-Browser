(() => {
    const panel = document.getElementById("barraBusqueda");
    const entrada = document.getElementById("textoBusqueda");
    const resultado = document.getElementById("resultadoBusqueda");
    const anterior = document.getElementById("busquedaAnterior");
    const siguiente = document.getElementById("busquedaSiguiente");
    let temporizador;
    let abierta = false;

    function buscar(adelante = true, repetir = false) {
        clearTimeout(temporizador);
        if (!abierta) return;
        window.patagonia.buscarEnPagina({ texto: entrada.value, adelante, repetir });
    }
    function cerrar() {
        clearTimeout(temporizador);
        window.patagonia.cerrarBusqueda();
    }
    entrada.addEventListener("input", () => {
        clearTimeout(temporizador);
        resultado.textContent = entrada.value ? "Buscando…" : "Escribí para buscar";
        anterior.disabled = siguiente.disabled = true;
        temporizador = setTimeout(() => buscar(), 120);
    });
    panel.addEventListener("keydown", evento => {
        if (evento.isComposing) return;
        if (evento.key === "Escape") { evento.preventDefault(); cerrar(); }
        if (evento.key === "Enter" && evento.target === entrada) {
            evento.preventDefault();
            buscar(!evento.shiftKey, true);
        }
    });
    anterior.addEventListener("click", () => buscar(false, true));
    siguiente.addEventListener("click", () => buscar(true, true));
    document.getElementById("cerrarBusqueda").addEventListener("click", cerrar);
    window.patagonia.recibirBusqueda(estado => {
        const estabaAbierta = abierta;
        abierta = estado.abierta;
        panel.hidden = !abierta;
        document.documentElement.style.setProperty("--alto-busqueda", abierta ? "44px" : "0px");
        if (!abierta) {
            clearTimeout(temporizador);
            entrada.value = "";
            return;
        }
        if (!estabaAbierta) entrada.value = estado.texto;
        const pendiente = estado.buscando || estado.texto !== entrada.value;
        resultado.textContent = estado.error || (!entrada.value ? "Escribí para buscar"
            : pendiente ? "Buscando…" : `${estado.actual} de ${estado.coincidencias}`);
        anterior.disabled = siguiente.disabled = !entrada.value || pendiente || !estado.coincidencias || Boolean(estado.error);
        if (estado.enfocar) { entrada.focus(); entrada.select(); }
    });
})();
