const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function normalizarURL(valor) {
    const url = new URL(valor);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Solo se pueden guardar páginas web sin credenciales en la dirección.");
    }
    return url.href;
}

function crearAlmacenFavoritos(archivo) {
    let cola = Promise.resolve();

    async function leer() {
        try {
            const datos = JSON.parse(await fs.readFile(archivo, "utf8"));
            if (!Array.isArray(datos) || datos.some(item =>
                !item || typeof item.id !== "string" || typeof item.titulo !== "string" ||
                typeof item.url !== "string" || normalizarURL(item.url) !== item.url
            )) throw new Error("Formato inválido");
            return datos;
        } catch (error) {
            if (error.code === "ENOENT") return [];
            throw new Error("No se pudieron leer tus favoritos. El archivo original se conservó.");
        }
    }

    async function guardar(datos) {
        const temporal = `${archivo}.${randomUUID()}.tmp`;
        try {
            await fs.mkdir(path.dirname(archivo), { recursive: true });
            await fs.writeFile(temporal, JSON.stringify(datos, null, 2), "utf8");
            await fs.rename(temporal, archivo);
        } catch {
            throw new Error("No se pudieron guardar los favoritos. Volvé a intentar.");
        } finally {
            await fs.rm(temporal, { force: true }).catch(() => {});
        }
    }

    function ejecutar(operacion) {
        const resultado = cola.then(operacion);
        cola = resultado.catch(() => {});
        return resultado;
    }

    return {
        listar: () => ejecutar(leer),
        alternar: (pagina) => ejecutar(async () => {
            const url = normalizarURL(pagina.url);
            const favoritos = await leer();
            const existe = favoritos.some(item => item.url === url);
            const nuevos = existe
                ? favoritos.filter(item => item.url !== url)
                : [...favoritos, {
                    id: randomUUID(), url,
                    titulo: String(pagina.titulo || new URL(url).hostname).slice(0, 300)
                }];
            await guardar(nuevos);
            return nuevos;
        }),
        eliminar: (id) => ejecutar(async () => {
            const favoritos = await leer();
            const nuevos = favoritos.filter(item => item.id !== id);
            if (nuevos.length !== favoritos.length) await guardar(nuevos);
            return nuevos;
        })
    };
}

function registrarFavoritos({ ipcMain, archivo, obtenerVentana, obtenerPestana, navegar }) {
    const almacen = crearAlmacenFavoritos(archivo);
    function registrar(canal, accion) {
        ipcMain.handle(canal, async (evento, valor) => {
            try {
                const ventana = obtenerVentana();
                if (!ventana || ventana.isDestroyed() ||
                    evento.sender !== ventana.webContents ||
                    evento.senderFrame !== ventana.webContents.mainFrame) {
                    throw new Error("Solicitud de favoritos no autorizada.");
                }
                return { correcto: true, favoritos: await accion(valor) };
            } catch (error) {
                return { correcto: false, error: error.message };
            }
        });
    }
    registrar("listar-favoritos", () => almacen.listar());
    registrar("alternar-favorito", () => {
        const pestana = obtenerPestana();
        if (!pestana || pestana.errorCarga || pestana.cargando || pestana.vista.webContents.isDestroyed()) {
            throw new Error("Esperá a que la página termine de cargar.");
        }
        return almacen.alternar({
            url: pestana.vista.webContents.getURL(),
            titulo: pestana.vista.webContents.getTitle()
        });
    });
    registrar("eliminar-favorito", id => almacen.eliminar(id));
    registrar("abrir-favorito", async id => {
        const favoritos = await almacen.listar();
        const favorito = favoritos.find(item => item.id === id);
        if (!favorito) throw new Error("Este favorito ya no está disponible.");
        navegar(obtenerPestana(), favorito.url);
        return favoritos;
    });
}

module.exports = { crearAlmacenFavoritos, registrarFavoritos };
