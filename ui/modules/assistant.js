(() => {
    let tarjetaIA;
    let botonAbrirAsistente;
    let botonCerrarAsistente;
    let panelAsistente;
    let formularioAsistente;
    let entradaAsistente;
    let mensajesAsistente;

    let procesandoMensaje = false;
    let inicializado = false;

    function obtenerElementos() {
        tarjetaIA = document.getElementById("tarjetaIA");

        botonAbrirAsistente =
            document.getElementById("abrirAsistente");

        botonCerrarAsistente =
            document.getElementById("cerrarAsistente");

        panelAsistente =
            document.getElementById("panelAsistente");

        formularioAsistente =
            document.getElementById("formularioAsistente");

        entradaAsistente =
            document.getElementById("entradaAsistente");

        mensajesAsistente =
            document.getElementById("mensajesAsistente");
    }

    function elementosDisponibles() {
        return Boolean(
            tarjetaIA &&
            botonAbrirAsistente &&
            botonCerrarAsistente &&
            panelAsistente &&
            formularioAsistente &&
            entradaAsistente &&
            mensajesAsistente
        );
    }

    function abrir() {
        tarjetaIA.classList.add("oculta");
        panelAsistente.classList.add("abierto");

        setTimeout(() => {
            entradaAsistente.focus();
        }, 100);
    }

    function cerrar() {
        panelAsistente.classList.remove("abierto");
        tarjetaIA.classList.remove("oculta");
    }

    function agregarMensaje(texto, tipo) {
        const mensaje = document.createElement("div");

        mensaje.className = `mensaje mensaje-${tipo}`;
        mensaje.textContent = texto;

        mensajesAsistente.appendChild(mensaje);
        desplazarAlFinal();

        return mensaje;
    }

    function desplazarAlFinal() {
        mensajesAsistente.scrollTop =
            mensajesAsistente.scrollHeight;
    }

    function ajustarAlturaEntrada() {
        entradaAsistente.style.height = "auto";

        entradaAsistente.style.height = `${Math.min(
            entradaAsistente.scrollHeight,
            100
        )}px`;
    }

    function establecerProcesando(estado) {
        procesandoMensaje = estado;

        entradaAsistente.disabled = estado;

        const botonEnviar = formularioAsistente.querySelector(
            ".enviar-asistente"
        );

        if (botonEnviar) {
            botonEnviar.disabled = estado;
        }
    }

    function obtenerMensajeError(resultado) {
        return (
            resultado?.error ||
            "No se pudo procesar la consulta."
        );
    }

    async function solicitarRespuesta(texto) {
        if (
            !window.patagonia ||
            typeof window.patagonia.procesarConsultaIA !== "function"
        ) {
            throw new Error(
                "El servicio de Patagonia AI no está disponible."
            );
        }

        const respuesta =
            await window.patagonia.procesarConsultaIA(texto);

        if (!respuesta?.correcto) {
            throw new Error(
                obtenerMensajeError(respuesta)
            );
        }

        const contenido =
            respuesta?.resultado?.respuesta;

        if (!contenido) {
            throw new Error(
                "El asistente devolvió una respuesta vacía."
            );
        }

        return contenido;
    }

    async function enviarMensaje() {
        const texto = entradaAsistente.value.trim();

        if (!texto || procesandoMensaje) {
            return;
        }

        agregarMensaje(texto, "usuario");

        entradaAsistente.value = "";
        ajustarAlturaEntrada();

        establecerProcesando(true);

        const indicador = agregarMensaje(
            "Leyendo y analizando la página…",
            "ia"
        );

        try {
            const respuesta =
                await solicitarRespuesta(texto);

            indicador.textContent = respuesta;
        } catch (error) {
            console.error(
                "Error de Patagonia AI:",
                error
            );

            indicador.textContent =
                `No pude responder: ${error.message}`;
        } finally {
            establecerProcesando(false);

            entradaAsistente.focus();
            desplazarAlFinal();
        }
    }

    function manejarEnvioFormulario(evento) {
        evento.preventDefault();
        enviarMensaje();
    }

    function manejarTeclado(evento) {
        if (
            evento.key === "Enter" &&
            !evento.shiftKey
        ) {
            evento.preventDefault();
            enviarMensaje();
        }
    }

    function registrarEventos() {
        botonAbrirAsistente.addEventListener(
            "click",
            abrir
        );

        botonCerrarAsistente.addEventListener(
            "click",
            cerrar
        );

        formularioAsistente.addEventListener(
            "submit",
            manejarEnvioFormulario
        );

        entradaAsistente.addEventListener(
            "keydown",
            manejarTeclado
        );

        entradaAsistente.addEventListener(
            "input",
            ajustarAlturaEntrada
        );
    }

    function iniciar() {
        if (inicializado) {
            return true;
        }

        obtenerElementos();

        if (!elementosDisponibles()) {
            console.error(
                "No se pudo iniciar Patagonia AI: faltan elementos del asistente en index.html."
            );

            return false;
        }

        registrarEventos();

        inicializado = true;

        return true;
    }

    window.PatagoniaAssistant = {
        iniciar,
        abrir,
        cerrar,
        enviarMensaje
    };
})();