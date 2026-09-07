const botonAtras = document.getElementById("atras");
const botonAdelante = document.getElementById("adelante");
const botonRecargar = document.getElementById("recargar");
const botonInicio = document.getElementById("inicio");
const botonIr = document.getElementById("ir");
const botonNuevaPestana = document.getElementById("nuevaPestana");
const botonSidebar = document.getElementById("alternarSidebar");
const botonCerrarSidebar = document.getElementById("cerrarSidebar");
const estadoConexion = document.getElementById("estadoConexion");
const tarjetaProteccion = document.querySelector(".tarjeta-privacidad");
const estadoProteccion = document.getElementById("estadoProteccion");
const totalBloqueado = document.getElementById("totalBloqueado");
const anunciosBloqueados = document.getElementById("anunciosBloqueados");
const rastreadoresBloqueados = document.getElementById("rastreadoresBloqueados");
const alternarProteccionSitio = document.getElementById("alternarProteccionSitio");
const detalleProteccion = document.getElementById("detalleProteccion");

const barraDireccion = document.getElementById("direccion");
const contenedorPestanas = document.querySelector(".tabs");
const sidebar = document.getElementById("sidebar");
const avisoCarga = document.getElementById("errorCarga");
const mensajeCarga = document.getElementById("mensajeErrorCarga");
const direccionCarga = document.getElementById("direccionErrorCarga");
document.getElementById("reintentarCarga").addEventListener("click", () => {
    window.patagonia.recargar();
});

let urlActual = "";
let editandoDireccion = false;
let direccionPendiente = null;
let idPestanaMostrada = null;
let descargasPendientes = false;
let cargandoActiva = false;
let cambiandoProteccion = false;
let sitioProteccionMostrado = "";
let errorProteccion = null;
const elementosPestanas = new Map();

function mostrarProteccion(proteccion) {
    const disponible = Boolean(proteccion?.disponible);
    const sitio = proteccion?.sitio || "";
    sitioProteccionMostrado = sitio;
    if (errorProteccion && errorProteccion.sitio !== sitio) errorProteccion = null;
    const permitida = Boolean(proteccion?.permitida);
    tarjetaProteccion.classList.toggle("no-disponible", !disponible);
    tarjetaProteccion.classList.toggle("desactivada", disponible && permitida);
    botonSidebar.classList.toggle("proteccion-desactivada", disponible && permitida);
    estadoProteccion.textContent = !disponible ? "No disponible" : permitida ? "Desactivada" : "Activa";
    totalBloqueado.textContent = String(proteccion?.total || 0);
    anunciosBloqueados.textContent = String(proteccion?.anuncios || 0);
    rastreadoresBloqueados.textContent = String(proteccion?.rastreadores || 0);
    alternarProteccionSitio.disabled = cambiandoProteccion || !disponible || !sitio;
    alternarProteccionSitio.textContent = !sitio
        ? "Abrí una página web"
        : permitida ? `Activar en ${sitio}` : `Desactivar en ${sitio}`;
    detalleProteccion.textContent = !disponible
        ? "No se pudieron cargar las listas de protección."
        : permitida
            ? `Los anuncios están permitidos en ${sitio} hasta que vuelvas a activar la protección.`
            : sitio
                ? `Patagonia está protegiendo tu navegación en ${sitio}.`
                : "El bloqueo se aplicará cuando abras una página web.";
    if (errorProteccion) detalleProteccion.textContent = errorProteccion.mensaje;
}

alternarProteccionSitio?.addEventListener("click", async () => {
    if (alternarProteccionSitio.disabled) return;
    const sitioSolicitado = sitioProteccionMostrado;
    errorProteccion = null;
    cambiandoProteccion = true;
    alternarProteccionSitio.disabled = true;
    detalleProteccion.textContent = "Aplicando el cambio…";
    try {
        const resultado = await window.patagonia.alternarProteccionSitio();
        if (!resultado?.correcto) throw new Error(resultado?.error || "No se pudo cambiar la protección.");
        mostrarProteccion(resultado.proteccion);
    } catch (error) {
        errorProteccion = { sitio: sitioSolicitado, mensaje: error.message || "No se pudo cambiar la protección." };
        if (sitioProteccionMostrado === sitioSolicitado) detalleProteccion.textContent = errorProteccion.mensaje;
    } finally {
        cambiandoProteccion = false;
        const resultado = await window.patagonia.obtenerProteccion().catch(() => null);
        if (resultado?.correcto) mostrarProteccion(resultado.proteccion);
    }
});

window.patagonia.recibirProteccion?.(mostrarProteccion);
if (window.patagonia.obtenerProteccion) {
    window.patagonia.obtenerProteccion().then(resultado => {
        if (resultado?.correcto) mostrarProteccion(resultado.proteccion);
    }).catch(() => mostrarProteccion({ disponible: false }));
}

window.patagonia.recibirEnfoqueDireccion?.(() => {
    barraDireccion.focus();
    barraDireccion.select();
});

document.getElementById("accesoDescargas").addEventListener("click", () => {
    if (sidebar.classList.contains("abierta")) {
        window.dispatchEvent(new Event("abrir-descargas"));
    } else if (!descargasPendientes) {
        descargasPendientes = true;
        window.patagonia.alternarBarraLateral();
    }
});

function obtenerDominio(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

function actualizarBarraDireccion() {
    barraDireccion.value = direccionPendiente ?? (editandoDireccion
        ? urlActual
        : obtenerDominio(urlActual));
    const segura = /^https:\/\//i.test(urlActual);
    const interna = !urlActual;
    estadoConexion.classList.toggle("segura", segura);
    estadoConexion.classList.toggle("interna", interna);
    estadoConexion.title = interna
        ? "Inicio de Patagonia"
        : segura ? "Conexión segura" : "Conexión sin cifrar";
}

window.addEventListener("favorito-abierto", () => {
    direccionPendiente = null;
    actualizarBarraDireccion();
});
window.addEventListener("historial-abierto", () => {
    direccionPendiente = null;
    actualizarBarraDireccion();
});

function navegar() {
    const direccion = barraDireccion.value.trim();

    if (!direccion) {
        return;
    }

    window.patagonia.navegar(direccion);
    direccionPendiente = null;
    barraDireccion.blur();
    actualizarBarraDireccion();
}

function crearElementoPestana(pestana) {
    const elemento = document.createElement("div");
    elemento.className = "tab";
    elemento.dataset.id = pestana.id;
    const seleccionar = document.createElement("button");
    seleccionar.type = "button";
    seleccionar.className = "seleccionar-pestana";
    const titulo = document.createElement("span");
    titulo.className = "titulo-pestana";
    seleccionar.appendChild(titulo);
    const cerrar = document.createElement("button");
    cerrar.type = "button";
    cerrar.className = "cerrar-pestana";
    cerrar.textContent = "×";
    cerrar.title = "Cerrar pestaña";
    elemento.append(seleccionar, cerrar);
    seleccionar.addEventListener("click", () => window.patagonia.activarPestana(pestana.id));
    cerrar.addEventListener("click", () => window.patagonia.cerrarPestana(pestana.id));
    return { elemento, seleccionar, titulo, cerrar, icono: null, estadoIcono: "" };
}

function actualizarElementoPestana(vista, pestana) {
    const texto = pestana.titulo || "Nueva pestaña";
    vista.elemento.classList.toggle("activa", Boolean(pestana.activa));
    vista.seleccionar.setAttribute("aria-pressed", String(Boolean(pestana.activa)));
    vista.seleccionar.setAttribute("aria-label", `Abrir pestaña: ${texto}`);
    vista.seleccionar.title = texto;
    vista.cerrar.setAttribute("aria-label", `Cerrar pestaña: ${texto}`);
    if (vista.titulo.textContent !== texto) vista.titulo.textContent = texto;
    const estadoIcono = pestana.cargando ? "cargando" : pestana.favicon || "";
    if (vista.estadoIcono === estadoIcono) return;
    vista.estadoIcono = estadoIcono;
    vista.icono?.remove();
    vista.icono = null;
    if (!estadoIcono) return;
    const icono = document.createElement(pestana.cargando ? "span" : "img");
    if (pestana.cargando) {
        icono.className = "cargando-pestana";
        icono.title = "Cargando";
        icono.setAttribute("aria-hidden", "true");
    } else {
        icono.className = "favicon-pestana";
        icono.src = pestana.favicon;
        icono.alt = "";
        icono.addEventListener("error", () => icono.remove());
    }
    vista.seleccionar.insertBefore(icono, vista.titulo);
    vista.icono = icono;
}

function mostrarPestanas(pestanas) {
    const activa = pestanas.find(pestana => pestana.activa);
    const cambioActiva = activa && activa.id !== idPestanaMostrada;
    if (cambioActiva) {
        idPestanaMostrada = activa.id;
        direccionPendiente = null;
        urlActual = activa.url;
        actualizarBarraDireccion();
    }
    cargandoActiva = Boolean(activa?.cargando && !activa.errorCarga);
    botonAtras.disabled = !activa?.puedeRetroceder;
    botonAdelante.disabled = !activa?.puedeAvanzar;
    botonRecargar.disabled = !activa;
    botonRecargar.textContent = cargandoActiva ? "×" : "↻";
    botonRecargar.title = cargandoActiva ? "Detener carga" : "Recargar";
    botonRecargar.setAttribute("aria-label", botonRecargar.title);
    window.PatagoniaFavorites.actualizarPagina(activa);
    const error = pestanas.find((pestana) => pestana.activa)?.errorCarga;
    avisoCarga.hidden = !error;
    mensajeCarga.textContent = error?.mensaje || "";
    direccionCarga.textContent = error?.url || "";
    const focoAnterior = document.activeElement;
    const focoEnPestana = Boolean(focoAnterior?.closest(".tab"));
    const ids = new Set(pestanas.map(pestana => pestana.id));
    for (const [id, vista] of elementosPestanas) {
        if (!ids.has(id)) {
            vista.elemento.remove();
            elementosPestanas.delete(id);
        }
    }
    let siguienteElemento = contenedorPestanas.firstElementChild;
    for (const pestana of pestanas) {
        let vista = elementosPestanas.get(pestana.id);
        if (!vista) {
            vista = crearElementoPestana(pestana);
            elementosPestanas.set(pestana.id, vista);
        }
        actualizarElementoPestana(vista, pestana);
        if (vista.elemento !== siguienteElemento) contenedorPestanas.insertBefore(vista.elemento, siguienteElemento);
        siguienteElemento = vista.elemento.nextElementSibling;
    }
    const vistaActiva = elementosPestanas.get(activa?.id);
    if (focoEnPestana && document.activeElement !== focoAnterior) {
        const destino = focoAnterior.isConnected ? focoAnterior : vistaActiva?.seleccionar || botonNuevaPestana;
        destino.focus({ preventScroll: true });
    }
    if (cambioActiva) vistaActiva?.elemento.scrollIntoView?.({ block: "nearest", inline: "nearest" });
}

function iniciarAsistente() {
    if (
        !window.PatagoniaAssistant ||
        typeof window.PatagoniaAssistant.iniciar !==
            "function"
    ) {
        console.error(
            "No se encontró el módulo PatagoniaAssistant."
        );

        return;
    }

    const iniciado =
        window.PatagoniaAssistant.iniciar();

    if (!iniciado) {
        console.error(
            "Patagonia AI no pudo inicializarse."
        );
    }
}

botonAtras.addEventListener("click", () => {
    window.patagonia.atras();
});

botonAdelante.addEventListener("click", () => {
    window.patagonia.adelante();
});

botonRecargar.addEventListener("click", () => {
    if (cargandoActiva) window.patagonia.detener();
    else window.patagonia.recargar();
});

botonInicio.addEventListener("click", () => {
    window.patagonia.inicio();
});

botonIr.addEventListener(
    "click",
    navegar
);

botonNuevaPestana.addEventListener(
    "click",
    () => {
        window.patagonia.nuevaPestana();
    }
);

botonSidebar.addEventListener(
    "click",
    () => {
        window.patagonia
            .alternarBarraLateral();
    }
);

botonCerrarSidebar.addEventListener("click", () => {
    if (sidebar.classList.contains("abierta")) window.patagonia.alternarBarraLateral();
});

barraDireccion.addEventListener("input", () => {
    direccionPendiente = barraDireccion.value;
});

barraDireccion.addEventListener(
    "focus",
    () => {
        editandoDireccion = true;

        actualizarBarraDireccion();
        barraDireccion.select();
    }
);

barraDireccion.addEventListener(
    "blur",
    () => {
        editandoDireccion = false;
        actualizarBarraDireccion();
    }
);

barraDireccion.addEventListener(
    "keydown",
    (evento) => {
        if (evento.isComposing) return;
        if (evento.key === "Enter") {
            navegar();
        }

        if (evento.key === "Escape") {
            direccionPendiente = null;
            barraDireccion.blur();
        }
    }
);

window.patagonia.recibirURL(
    (url) => {
        urlActual = url;
        if (!editandoDireccion) direccionPendiente = null;
        actualizarBarraDireccion();
    }
);

window.patagonia.recibirPestanas(
    (pestanas) => {
        mostrarPestanas(pestanas);
    }
);

window.patagonia
    .recibirEstadoBarraLateral(
        (abierta) => {
            avisoCarga.style.right = abierta ? "320px" : "0";
            sidebar.classList.toggle(
                "abierta",
                abierta
            );

            botonSidebar.title =
                abierta
                    ? "Cerrar Centro de privacidad"
                    : "Abrir Centro de privacidad";
            botonSidebar.setAttribute("aria-label", botonSidebar.title);
            botonSidebar.setAttribute("aria-pressed", String(abierta));
            if (abierta && descargasPendientes) {
                descargasPendientes = false;
                window.dispatchEvent(new Event("abrir-descargas"));
            }
        }
    );

iniciarAsistente();
