const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function urlWeb(valor) {
    try {
        const url = new URL(valor);
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
        return url.href;
    } catch { return null; }
}

function crearHistorial(archivo, limite = 1000) {
    let cola = Promise.resolve();
    async function leer() {
        try {
            const datos = JSON.parse(await fs.readFile(archivo, "utf8"));
            if (!Array.isArray(datos) || datos.some(item => !item ||
                typeof item.id !== "string" || typeof item.titulo !== "string" ||
                !urlWeb(item.url) || !Number.isFinite(Date.parse(item.fecha)))) {
                throw new Error("Formato inválido");
            }
            return datos;
        } catch (error) {
            if (error.code === "ENOENT") return [];
            throw new Error("No se pudo leer el historial. El archivo original se conservó.");
        }
    }
    async function guardar(datos) {
        const temporal = `${archivo}.${randomUUID()}.tmp`;
        try {
            await fs.mkdir(path.dirname(archivo), { recursive: true });
            await fs.writeFile(temporal, JSON.stringify(datos, null, 2), "utf8");
            await fs.rename(temporal, archivo);
        } catch {
            throw new Error("No se pudo guardar el historial. Volvé a intentar.");
        } finally {
            await fs.rm(temporal, { force: true }).catch(() => {});
        }
        return datos;
    }
    function ejecutar(accion) {
        const resultado = cola.then(accion);
        cola = resultado.catch(() => {});
        return resultado;
    }
    return {
        esperar: () => cola,
        listar: () => ejecutar(leer),
        agregar: pagina => ejecutar(async () => {
            const url = urlWeb(pagina.url);
            if (!url) return leer();
            const datos = await leer();
            return guardar([{
                id: pagina.id || randomUUID(), url,
                titulo: String(pagina.titulo || new URL(url).hostname).slice(0, 300),
                fecha: new Date().toISOString()
            }, ...datos].slice(0, limite));
        }),
        titular: (id, titulo) => ejecutar(async () => {
            const datos = await leer();
            const visita = datos.find(item => item.id === id);
            if (!visita || !titulo || visita.titulo === titulo) return datos;
            visita.titulo = String(titulo).slice(0, 300);
            return guardar(datos);
        }),
        eliminar: id => ejecutar(async () => guardar((await leer()).filter(item => item.id !== id))),
        vaciar: () => ejecutar(() => guardar([]))
    };
}

function observarHistorial(contenido, almacen, notificar) {
    let visitaId = null;
    let ultimaURL = null;
    let destino = null;
    const finalizar = promesa => promesa.then(() => notificar()).catch(error => notificar(error.message));
    contenido.on("did-start-navigation", (_evento, _url, mismaPagina, principal) => {
        if (principal && !mismaPagina) visitaId = null;
    });
    function registrar(url) {
        const limpia = urlWeb(url);
        if (!limpia) { visitaId = null; ultimaURL = null; return; }
        if (limpia === ultimaURL && visitaId) return;
        ultimaURL = limpia;
        destino = limpia;
        visitaId = randomUUID();
        finalizar(almacen.agregar({ id: visitaId, url: limpia, titulo: new URL(limpia).hostname }));
    }
    contenido.on("did-navigate", (_evento, url, codigo) => {
        if (codigo < 0) return;
        registrar(url);
    });
    contenido.on("did-navigate-in-page", (_evento, url, principal) => {
        if (principal) { registrar(url); titulo(contenido.getTitle()); }
    });
    function titulo(valor) {
        if (visitaId && contenido.getURL() === destino) finalizar(almacen.titular(visitaId, valor));
    }
    contenido.on("page-title-updated", (_evento, valor) => titulo(valor));
    contenido.on("did-finish-load", () => titulo(contenido.getTitle()));
}

function registrarHistorial({ ipcMain, archivo, obtenerVentana, obtenerPestana, navegar }) {
    const almacen = crearHistorial(archivo);
    function notificar(error = null) {
        const ventana = obtenerVentana();
        if (ventana && !ventana.isDestroyed()) ventana.webContents.send("historial-actualizado", error);
    }
    function manejar(canal, accion) {
        ipcMain.handle(canal, async (evento, valor) => {
            try {
                const ventana = obtenerVentana();
                if (!ventana || ventana.isDestroyed() || evento.sender !== ventana.webContents ||
                    evento.senderFrame !== ventana.webContents.mainFrame) throw new Error("Solicitud no autorizada.");
                return { correcto: true, historial: await accion(valor) };
            } catch (error) { return { correcto: false, error: error.message }; }
        });
    }
    manejar("listar-historial", () => almacen.listar());
    manejar("eliminar-visita", id => almacen.eliminar(id));
    manejar("vaciar-historial", () => almacen.vaciar());
    manejar("abrir-visita", async id => {
        const datos = await almacen.listar();
        const visita = datos.find(item => item.id === id);
        if (!visita) throw new Error("Esta visita ya no está en el historial.");
        navegar(obtenerPestana(), visita.url);
        return datos;
    });
    const observar = contenido => observarHistorial(contenido, almacen, notificar);
    observar.esperar = almacen.esperar;
    return observar;
}

module.exports = { crearHistorial, observarHistorial, registrarHistorial };
