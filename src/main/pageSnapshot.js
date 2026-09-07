const MAX_HTML = 2_000_000;
const MAX_ELEMENTOS = 50_000;

function obtenerHTMLPagina(contenido, { tiempoLimite = 5000 } = {}) {
    if (!contenido || contenido.isDestroyed()) return Promise.reject(new Error("La pestaña ya no está disponible."));
    const marco = contenido.mainFrame;
    const url = contenido.getURL();
    if (!/^https?:\/\//i.test(url) || !marco || marco.isDestroyed()) {
        return Promise.reject(new Error("Abrí una página web para usar el asistente."));
    }
    const codigo = `(() => {
        if (!document.documentElement) throw new Error("La página todavía no está lista.");
        if (document.getElementsByTagName("*").length > ${MAX_ELEMENTOS}) {
            throw new Error("La página es demasiado grande para extraer su contenido.");
        }
        const copia = document.documentElement.cloneNode(true);
        copia.querySelectorAll("script, style, noscript, iframe, canvas, svg").forEach(nodo => nodo.remove());
        const html = "<!doctype html>" + copia.outerHTML;
        if (html.length > ${MAX_HTML}) throw new Error("La página es demasiado grande para extraer su contenido.");
        return { titulo: document.title || "", url: window.location.href, html };
    })();`;

    return new Promise((resolver, rechazar) => {
        let terminada = false;
        const finalizar = (error, datos) => {
            if (terminada) return;
            terminada = true;
            clearTimeout(temporizador);
            contenido.removeListener("did-start-navigation", alNavegar);
            contenido.removeListener("destroyed", alCerrar);
            contenido.removeListener("render-process-gone", alCerrar);
            if (error) rechazar(error);
            else resolver(datos);
        };
        const alCerrar = () => finalizar(new Error("La pestaña ya no está disponible."));
        const alNavegar = (_evento, _url, _mismaPagina, principal) => {
            if (principal) finalizar(new Error("La página cambió durante la lectura. Volvé a intentarlo."));
        };
        const temporizador = setTimeout(() => finalizar(new Error("La página no respondió a tiempo. Volvé a intentarlo.")), tiempoLimite);
        contenido.on("did-start-navigation", alNavegar);
        contenido.once("destroyed", alCerrar);
        contenido.once("render-process-gone", alCerrar);
        // Se dirige al documento solicitado, sin esperar a que todas las
        // conexiones de la página finalicen ni reutilizar un documento posterior.
        Promise.resolve().then(() => {
            if (!terminada) return marco.executeJavaScript(codigo);
        }).then(datos => {
            if (terminada) return;
            if (contenido.isDestroyed() || marco.isDestroyed() || marco.detached ||
                contenido.mainFrame !== marco || contenido.getURL() !== url) {
                throw new Error("La página cambió durante la lectura. Volvé a intentarlo.");
            }
            if (!datos || datos.url !== url || typeof datos.html !== "string" ||
                datos.html.length > MAX_HTML || typeof datos.titulo !== "string") {
                throw new Error("No se pudo obtener un contenido de página válido.");
            }
            finalizar(null, { url, html: datos.html, titulo: datos.titulo.slice(0, 1000) });
        }).catch(error => finalizar(error));
    });
}

module.exports = { obtenerHTMLPagina, MAX_ELEMENTOS };
