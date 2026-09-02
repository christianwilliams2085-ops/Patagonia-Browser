(() => {
    const estrella = document.getElementById("guardarFavorito");
    const abrir = document.getElementById("abrirFavoritos");
    const panel = document.getElementById("panelFavoritos");
    const lista = document.getElementById("listaFavoritos");
    const estado = document.getElementById("estadoFavoritos");
    const vacio = document.getElementById("favoritosVacios");
    const aviso = document.getElementById("avisoFavoritos");
    let favoritos = [];
    let pagina = null;
    let ocupado = false;
    let cargado = false;

    function actualizarEstrella() {
        const guardado = favoritos.some(item => item.url === pagina?.url);
        estrella.textContent = guardado ? "★" : "☆";
        estrella.setAttribute("aria-pressed", String(guardado));
        estrella.title = guardado ? "Quitar de favoritos" : "Guardar en favoritos";
        estrella.setAttribute("aria-label", estrella.title);
        estrella.disabled = ocupado || !cargado || !pagina || pagina.cargando ||
            Boolean(pagina.errorCarga) || !/^https?:\/\//i.test(pagina.url);
    }

    function mostrar() {
        lista.replaceChildren();
        vacio.hidden = favoritos.length > 0;
        favoritos.forEach(favorito => {
            const fila = document.createElement("li");
            const enlace = document.createElement("button");
            enlace.className = "favorito-abrir";
            enlace.title = favorito.url;
            const titulo = document.createElement("span");
            titulo.textContent = favorito.titulo;
            const dominio = document.createElement("small");
            dominio.textContent = new URL(favorito.url).hostname;
            enlace.append(titulo, dominio);
            enlace.disabled = ocupado;
            enlace.addEventListener("click", () => ejecutar(async () => {
                const respuesta = await window.patagonia.abrirFavorito(favorito.id);
                if (respuesta.correcto) window.dispatchEvent(new Event("favorito-abierto"));
                return respuesta;
            }));
            const eliminar = document.createElement("button");
            eliminar.className = "favorito-eliminar";
            eliminar.textContent = "×";
            eliminar.title = `Eliminar ${favorito.titulo}`;
            eliminar.setAttribute("aria-label", eliminar.title);
            eliminar.disabled = ocupado;
            eliminar.addEventListener("click", () => ejecutar(
                () => window.patagonia.eliminarFavorito(favorito.id), "Favorito eliminado."
            ));
            fila.append(enlace, eliminar);
            lista.append(fila);
        });
        actualizarEstrella();
    }

    async function ejecutar(accion, mensaje = "") {
        if (ocupado) return;
        ocupado = true;
        estado.textContent = "";
        aviso.textContent = "";
        mostrar();
        try {
            const respuesta = await accion();
            if (!respuesta.correcto) throw new Error(respuesta.error);
            favoritos = respuesta.favoritos;
            cargado = true;
            estado.textContent = mensaje;
            aviso.textContent = mensaje;
        } catch (error) {
            estado.textContent = error.message || "No se pudo completar la acción.";
            aviso.textContent = "No se pudo actualizar favoritos. Abrí la lista para ver el detalle.";
        } finally {
            ocupado = false;
            mostrar();
        }
    }

    estrella.addEventListener("click", () => {
        const existe = favoritos.some(item => item.url === pagina?.url);
        ejecutar(() => window.patagonia.alternarFavorito(), existe ? "Favorito eliminado." : "Página guardada.");
    });
    abrir.addEventListener("click", () => {
        panel.hidden = !panel.hidden;
        abrir.setAttribute("aria-expanded", String(!panel.hidden));
        if (!panel.hidden) ejecutar(() => window.patagonia.listarFavoritos());
    });
    window.PatagoniaFavorites = {
        actualizarPagina(pestana) { pagina = pestana; actualizarEstrella(); }
    };
    ejecutar(() => window.patagonia.listarFavoritos());
})();
