function registrarAtajos(contenido, acciones) {
    contenido.on("before-input-event", (evento, entrada) => {
        if (entrada.type !== "keyDown" || entrada.isComposing) return;
        const tecla = entrada.key.toLowerCase();
        const modificador = entrada.control || entrada.meta;
        if (tecla === "escape" && !modificador && !entrada.alt && !entrada.shift && acciones.cerrarBusqueda?.()) {
            evento.preventDefault();
            return;
        }
        let accion;
        if (modificador && !entrada.alt && !entrada.shift) {
            accion = { l: "direccion", t: "nueva", w: "cerrar", r: "recargar", f: "buscar" }[tecla];
        }
        if (modificador && !entrada.alt && entrada.shift && tecla === "t") accion = "reabrir";
        if (modificador && !entrada.alt && tecla === "tab") {
            accion = entrada.shift ? "anterior" : "siguiente";
        }
        if (!modificador && !entrada.alt && !entrada.shift && tecla === "f5") accion = "recargar";
        if (!modificador && !entrada.alt && tecla === "f3") accion = entrada.shift ? "buscarAnterior" : "buscarSiguiente";
        if (entrada.alt && !modificador && !entrada.shift) {
            accion = { arrowleft: "atras", arrowright: "adelante", home: "inicio" }[tecla];
        }
        if (accion && acciones[accion]) {
            evento.preventDefault();
            acciones[accion]();
        }
    });
}

module.exports = { registrarAtajos };
