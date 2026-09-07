const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { PAGINA_INICIO } = require("../shared/constants");
const { crearIPCInterfaz } = require("./security");

function validarConfiguracion(valor) {
    if (!valor || typeof valor.inicio !== "string" || valor.inicio.length > 2048 ||
        typeof valor.restaurar !== "boolean") throw new Error("Configuración inválida.");
    let url;
    try { url = new URL(valor.inicio); } catch { throw new Error("Escribí una dirección completa, por ejemplo https://example.com."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
        throw new Error("Usá una dirección HTTP o HTTPS sin usuario ni contraseña.");
    }
    return { inicio: url.href, restaurar: valor.restaurar };
}

function crearConfiguracion(archivo) {
    let datos = { inicio: PAGINA_INICIO, restaurar: true };
    let errorLectura = "";
    let cola = Promise.resolve();
    const estado = () => ({ ...datos, error: errorLectura });
    async function iniciar() {
        try {
            datos = validarConfiguracion(JSON.parse(await fs.readFile(archivo, "utf8")));
        } catch (error) {
            if (error.code !== "ENOENT") errorLectura = "No se pudo leer la configuración. Se usan los valores predeterminados y se conserva el archivo original.";
        }
        return estado();
    }
    function guardar(valor) {
        let nuevos;
        try { nuevos = validarConfiguracion(valor); } catch (error) { return Promise.reject(error); }
        const tarea = cola.then(async () => {
            if (errorLectura) throw new Error(errorLectura);
            const temporal = `${archivo}.${randomUUID()}.tmp`;
            try {
                await fs.mkdir(path.dirname(archivo), { recursive: true });
                await fs.writeFile(temporal, JSON.stringify(nuevos, null, 2), "utf8");
                await fs.rename(temporal, archivo);
                datos = nuevos;
                return estado();
            } catch {
                throw new Error("No pudimos guardar la configuración. Volvé a intentar.");
            } finally { await fs.rm(temporal, { force: true }).catch(() => {}); }
        });
        cola = tarea.catch(() => {});
        return tarea;
    }
    async function esperar() {
        let pendiente;
        do { pendiente = cola; await pendiente; } while (pendiente !== cola);
    }
    return { iniciar, estado, guardar, esperar };
}

function registrarConfiguracion({ ipcMain, archivo, obtenerVentana }) {
    const gestor = crearConfiguracion(archivo);
    const ipc = crearIPCInterfaz(ipcMain, obtenerVentana);
    ipc.handle("obtener-configuracion", async () => ({ correcto: true, configuracion: gestor.estado() }));
    ipc.handle("guardar-configuracion", async (_evento, datos) => {
        try { return { correcto: true, configuracion: await gestor.guardar(datos) }; }
        catch (error) { return { correcto: false, error: error.message }; }
    });
    return gestor;
}

module.exports = { validarConfiguracion, crearConfiguracion, registrarConfiguracion };
