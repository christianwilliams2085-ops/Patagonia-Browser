(() => {
    const boton = document.getElementById("botonActualizacion");
    window.patagonia.recibirActualizacion(estado => {
        const lista = estado?.estado === "lista";
        boton.hidden = !lista;
        if (lista) {
            boton.textContent = estado.version ? `⟳ Actualizar a ${estado.version}` : "⟳ Actualizar";
        }
    });
    boton.addEventListener("click", async () => {
        boton.disabled = true;
        const respuesta = await window.patagonia.reiniciarParaActualizar();
        if (!respuesta?.correcto) boton.disabled = false;
    });
})();
