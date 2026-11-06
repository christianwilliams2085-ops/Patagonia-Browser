(() => {
    const boton = document.getElementById("traducirPagina");
    const aviso = document.getElementById("avisoTraduccion");
    let pagina = null;
    let ocupado = false;
    let temporizador = null;

    function traducida(url) {
        try {
            const direccion = new URL(url);
            return direccion.protocol === "https:" && direccion.hostname.endsWith(".translate.goog");
        } catch { return false; }
    }

    function actualizar() {
        const url = pagina?.url || "";
        const yaTraducida = traducida(url);
        boton.disabled = ocupado || !pagina || Boolean(pagina.errorCarga) || !/^https?:\/\//i.test(url);
        boton.setAttribute("aria-pressed", String(yaTraducida));
        boton.title = yaTraducida ? "Ver la página original" : "Traducir página al español";
        boton.setAttribute("aria-label", boton.title);
    }

    function avisar(texto) {
        clearTimeout(temporizador);
        aviso.textContent = texto;
        if (texto) temporizador = setTimeout(() => { aviso.textContent = ""; }, 8000);
    }

    boton.addEventListener("click", async () => {
        if (ocupado) return;
        ocupado = true;
        actualizar();
        avisar("");
        try {
            const respuesta = await window.patagonia.traducirPagina();
            if (!respuesta?.correcto && !respuesta?.cancelado) avisar(respuesta?.error || "No se pudo traducir la página.");
        } catch {
            avisar("No se pudo traducir la página.");
        } finally {
            ocupado = false;
            actualizar();
        }
    });

    window.PatagoniaTraductor = {
        actualizarPagina(pestana) { pagina = pestana; actualizar(); }
    };
})();
