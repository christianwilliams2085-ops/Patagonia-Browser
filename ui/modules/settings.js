(() => {
    const abrir = document.getElementById("abrirConfiguracion");
    const panel = document.getElementById("panelConfiguracion");
    const formulario = document.getElementById("formularioConfiguracion");
    const inicio = document.getElementById("paginaInicio");
    const restaurar = document.getElementById("restaurarPestanas");
    const guardar = document.getElementById("guardarConfiguracion");
    const estado = document.getElementById("estadoConfiguracion");
    let ocupado = false;
    let bloqueada = false;
    function habilitar() {
        for (const elemento of [inicio, restaurar, guardar]) elemento.disabled = ocupado || bloqueada;
    }
    async function ejecutar(accion, guardando = false) {
        if (ocupado) return;
        ocupado = true;
        habilitar();
        estado.textContent = guardando ? "Guardando…" : "Cargando…";
        try {
            const respuesta = await accion();
            if (!respuesta.correcto) throw new Error(respuesta.error);
            const configuracion = respuesta.configuracion;
            inicio.value = configuracion.inicio;
            restaurar.checked = configuracion.restaurar;
            bloqueada = Boolean(configuracion.error);
            estado.textContent = configuracion.error || (guardando ? "Configuración guardada." : "");
        } catch (error) { estado.textContent = error.message || "No se pudo completar la operación."; }
        finally { ocupado = false; habilitar(); }
    }
    abrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        abrir.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) {
            panel.scrollIntoView({ block: "start" });
            ejecutar(() => window.patagonia.obtenerConfiguracion());
        }
    });
    formulario.addEventListener("submit", evento => {
        evento.preventDefault();
        ejecutar(() => window.patagonia.guardarConfiguracion({ inicio: inicio.value.trim(), restaurar: restaurar.checked }), true);
    });
})();
