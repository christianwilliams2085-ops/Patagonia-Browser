(() => {
    const boton = document.getElementById("crearApp");
    const aviso = document.getElementById("avisoApp");
    let pagina = null;
    let ocupado = false;
    let temporizador = null;

    function actualizar() {
        boton.disabled = ocupado || !pagina || pagina.cargando ||
            Boolean(pagina.errorCarga) || !/^https?:\/\//i.test(pagina.url || "");
    }

    function avisar(texto) {
        clearTimeout(temporizador);
        aviso.textContent = texto;
        if (texto) temporizador = setTimeout(() => { aviso.textContent = ""; }, 6000);
    }

    boton.addEventListener("click", async () => {
        if (ocupado) return;
        ocupado = true;
        actualizar();
        avisar("Creando app…");
        try {
            const respuesta = await window.patagonia.crearAppPagina();
            if (!respuesta?.correcto) throw new Error(respuesta?.error);
            avisar(`Listo: "${respuesta.nombre}" quedó en el escritorio.`);
        } catch (error) {
            avisar(error.message || "No se pudo crear la app.");
        } finally {
            ocupado = false;
            actualizar();
        }
    });

    window.PatagoniaApps = {
        actualizarPagina(pestana) { pagina = pestana; actualizar(); }
    };
})();
