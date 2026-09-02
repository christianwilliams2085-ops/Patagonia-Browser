const botonAtras = document.getElementById("atras");
const botonAdelante = document.getElementById("adelante");
const botonRecargar = document.getElementById("recargar");
const botonInicio = document.getElementById("inicio");
const botonIr = document.getElementById("ir");
const botonNuevaPestana = document.getElementById("nuevaPestana");
const botonSidebar = document.getElementById("alternarSidebar");

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
}

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

    elemento.className = pestana.activa
        ? "tab activa"
        : "tab";

    elemento.dataset.id = pestana.id;

    if (pestana.cargando) {
        const spinner = document.createElement("span");

        spinner.className = "cargando-pestana";
        spinner.title = "Cargando";

        elemento.appendChild(spinner);
    } else if (pestana.favicon) {
        const favicon = document.createElement("img");

        favicon.className = "favicon-pestana";
        favicon.src = pestana.favicon;
        favicon.alt = "";

        favicon.addEventListener("error", () => {
            favicon.remove();
        });

        elemento.appendChild(favicon);
    }

    const titulo = document.createElement("span");

    titulo.className = "titulo-pestana";
    titulo.textContent =
        pestana.titulo || "Nueva pestaña";

    titulo.title =
        pestana.titulo || "Nueva pestaña";

    const cerrar = document.createElement("button");

    cerrar.className = "cerrar-pestana";
    cerrar.textContent = "×";
    cerrar.title = "Cerrar pestaña";

    elemento.appendChild(titulo);
    elemento.appendChild(cerrar);

    elemento.addEventListener("click", () => {
        window.patagonia.activarPestana(
            pestana.id
        );
    });

    cerrar.addEventListener("click", (evento) => {
        evento.stopPropagation();

        window.patagonia.cerrarPestana(
            pestana.id
        );
    });

    return elemento;
}

function mostrarPestanas(pestanas) {
    const error = pestanas.find((pestana) => pestana.activa)?.errorCarga;
    avisoCarga.hidden = !error;
    mensajeCarga.textContent = error?.mensaje || "";
    direccionCarga.textContent = error?.url || "";
    contenedorPestanas
        .querySelectorAll(".tab")
        .forEach((pestana) => {
            pestana.remove();
        });

    pestanas.forEach((pestana) => {
        contenedorPestanas.insertBefore(
            crearElementoPestana(pestana),
            botonNuevaPestana
        );
    });
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
    window.patagonia.recargar();
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

            botonSidebar.textContent =
                abierta ? "×" : "☰";

            botonSidebar.title =
                abierta
                    ? "Cerrar barra lateral"
                    : "Abrir barra lateral";
        }
    );

iniciarAsistente();
