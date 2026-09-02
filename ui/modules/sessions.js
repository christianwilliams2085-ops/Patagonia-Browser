(() => {
    const abrir = document.getElementById("abrirSesiones");
    const panel = document.getElementById("panelSesiones");
    const estado = document.getElementById("estadoSesion");
    const guardar = document.getElementById("guardarSesion");
    let revision = -1;
    let bloqueada = false;
    let ocupado = false;
    function mostrar(sesion) {
        if (sesion.revision < revision) return;
        revision = sesion.revision;
        bloqueada = sesion.bloqueada;
        estado.textContent = sesion.error || (sesion.guardada
            ? `${sesion.cantidad} pestaña(s) guardada(s) para el próximo inicio.`
            : `Guardando ${sesion.cantidad} pestaña(s)…`);
        guardar.disabled = ocupado || bloqueada;
    }
    async function ejecutar(accion) {
        if (ocupado) return;
        ocupado = true;
        guardar.disabled = true;
        try {
            const resultado = await accion();
            if (!resultado.correcto) throw new Error(resultado.error);
            mostrar(resultado.sesion);
        } catch (error) { estado.textContent = error.message || "No se pudo consultar la sesión."; }
        finally { ocupado = false; guardar.disabled = bloqueada; }
    }
    abrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        abrir.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) {
            abrir.scrollIntoView({ block: "start" });
            ejecutar(() => window.patagonia.obtenerSesion());
        }
    });
    guardar.addEventListener("click", () => ejecutar(() => window.patagonia.guardarSesion()));
    window.patagonia.recibirSesion(mostrar);
})();
