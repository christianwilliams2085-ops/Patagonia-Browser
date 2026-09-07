(() => {
    "use strict";

    const CLAVE_ACCESOS = "patagonia-accesos-rapidos-v1";
    const MAXIMO_ACCESOS = 4;

    function prepararDireccion(valor) {
        const texto = String(valor || "").trim();
        if (!texto) return "";
        if (/^https?:\/\//i.test(texto)) return texto;
        if (/^(?:localhost|(?:[a-z0-9-]+\.)+localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?(?:[/?#][^\s]*)?$/i.test(texto)) {
            return `http://${texto}`;
        }
        if (texto.includes(" ") || !texto.includes(".")) {
            return `https://www.google.com/search?q=${encodeURIComponent(texto)}`;
        }
        return `https://${texto}`;
    }

    function normalizarAcceso(nombre, direccion) {
        const etiqueta = String(nombre || "").trim().slice(0, 24);
        const destino = prepararDireccion(direccion);
        try {
            const url = new URL(destino);
            if (!etiqueta || !["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
            return { nombre: etiqueta, url: url.href };
        } catch {
            return null;
        }
    }

    function leerAccesos() {
        try {
            const datos = JSON.parse(localStorage.getItem(CLAVE_ACCESOS) || "[]");
            if (!Array.isArray(datos)) return [];
            return datos.map(dato => normalizarAcceso(dato?.nombre, dato?.url)).filter(Boolean).slice(0, MAXIMO_ACCESOS);
        } catch {
            return [];
        }
    }

    function guardarAccesos(accesos) {
        localStorage.setItem(CLAVE_ACCESOS, JSON.stringify(accesos.slice(0, MAXIMO_ACCESOS)));
    }

    const formularioBusqueda = document.getElementById("busquedaPrincipal");
    const consulta = document.getElementById("consultaPrincipal");
    const contenedor = document.getElementById("accesosRapidos");
    const botonAgregar = document.getElementById("agregarAcceso");
    const dialogo = document.getElementById("dialogoAcceso");
    const formularioAcceso = document.getElementById("formularioAcceso");
    const nombreAcceso = document.getElementById("nombreAcceso");
    const urlAcceso = document.getElementById("urlAcceso");
    const errorAcceso = document.getElementById("errorAcceso");
    const estadoAccesos = document.getElementById("estadoAccesos");
    let accesos = leerAccesos();

    function inicial(nombre) {
        return [...nombre.trim()][0]?.toLocaleUpperCase("es") || "↗";
    }

    function crearAcceso(acceso, indice) {
        const enlace = document.createElement("a");
        enlace.className = "acceso-rapido acceso-personalizado";
        enlace.href = acceso.url;
        enlace.title = `${acceso.nombre} · Clic derecho para quitar`;

        const icono = document.createElement("span");
        icono.className = "icono-acceso";
        icono.setAttribute("aria-hidden", "true");
        icono.textContent = inicial(acceso.nombre);

        const etiqueta = document.createElement("span");
        etiqueta.textContent = acceso.nombre;
        enlace.append(icono, etiqueta);
        enlace.addEventListener("contextmenu", evento => {
            evento.preventDefault();
            const actuales = leerAccesos();
            const posicion = actuales.findIndex(dato => dato.url === acceso.url && dato.nombre === acceso.nombre);
            if (posicion === -1) { accesos = actuales; renderizarAccesos(); return; }
            actuales.splice(posicion, 1);
            try {
                guardarAccesos(actuales);
                accesos = actuales;
                estadoAccesos.textContent = "Acceso eliminado.";
                renderizarAccesos();
            } catch { estadoAccesos.textContent = "No se pudo guardar el cambio. El acceso sigue disponible."; }
        });
        return enlace;
    }

    function renderizarAccesos() {
        contenedor.querySelectorAll(".acceso-personalizado").forEach(elemento => elemento.remove());
        accesos.forEach((acceso, indice) => contenedor.insertBefore(crearAcceso(acceso, indice), botonAgregar));
        botonAgregar.hidden = accesos.length >= MAXIMO_ACCESOS;
    }

    formularioBusqueda.addEventListener("submit", evento => {
        evento.preventDefault();
        const destino = prepararDireccion(consulta.value);
        if (destino) window.location.assign(destino);
    });

    botonAgregar.addEventListener("click", () => {
        errorAcceso.textContent = "";
        formularioAcceso.reset();
        dialogo.showModal();
        nombreAcceso.focus();
    });

    function cerrarDialogo() { dialogo.close(); }
    document.getElementById("cancelarAcceso").addEventListener("click", cerrarDialogo);
    document.getElementById("cancelarAccesoSuperior").addEventListener("click", cerrarDialogo);

    formularioAcceso.addEventListener("submit", evento => {
        evento.preventDefault();
        const acceso = normalizarAcceso(nombreAcceso.value, urlAcceso.value);
        if (!acceso) {
            errorAcceso.textContent = "Escribí un nombre y una dirección web válida.";
            return;
        }
        const actuales = leerAccesos();
        if (actuales.length >= MAXIMO_ACCESOS) {
            errorAcceso.textContent = "Ya hay cuatro accesos. Quitá uno antes de agregar otro.";
            accesos = actuales;
            renderizarAccesos();
            return;
        }
        try {
            guardarAccesos([...actuales, acceso]);
            accesos = [...actuales, acceso];
            estadoAccesos.textContent = "Acceso guardado.";
            renderizarAccesos();
            cerrarDialogo();
        } catch { errorAcceso.textContent = "No se pudo guardar el acceso. Volvé a intentarlo."; }
    });

    window.addEventListener("storage", evento => {
        if (evento.key !== null && evento.key !== CLAVE_ACCESOS) return;
        accesos = leerAccesos();
        renderizarAccesos();
    });

    window.PatagoniaNewTab = { prepararDireccion, normalizarAcceso };
    renderizarAccesos();
})();
