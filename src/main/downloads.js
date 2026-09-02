const { randomUUID } = require("node:crypto");
const { stat } = require("node:fs/promises");
const path = require("node:path");

function registrarDescargas({ ipcMain, sesion, shell, obtenerVentana, esPestanaPropia, comprobarArchivo = stat }) {
    const registros = new Map();
    const activos = new Map();
    let revision = 0;
    let temporizador;

    function snapshot() {
        return { revision, descargas: [...registros.values()].reverse().map(({ ruta, ...dato }) => ({ ...dato })) };
    }
    function enviar() {
        clearTimeout(temporizador);
        temporizador = undefined;
        const ventana = obtenerVentana();
        if (ventana && !ventana.isDestroyed()) ventana.webContents.send("descargas-actualizadas", snapshot());
    }
    function actualizar(inmediato = false) {
        revision++;
        if (inmediato) enviar();
        else if (!temporizador) temporizador = setTimeout(enviar, 250);
    }
    function limitar() {
        const terminadas = [...registros.keys()].filter(id => !activos.has(id));
        for (const id of terminadas.slice(0, Math.max(0, terminadas.length - 100))) registros.delete(id);
    }
    sesion.on("will-download", (_evento, item, contenido) => {
        if (!esPestanaPropia(contenido)) return;
        const id = randomUUID();
        const dato = { id, nombre: item.getFilename(), estado: "descargando", recibidos: 0, total: 0, ruta: "" };
        registros.set(id, dato);
        activos.set(id, item);
        function leer() {
            dato.recibidos = Math.max(0, item.getReceivedBytes());
            dato.total = Math.max(0, item.getTotalBytes());
            dato.ruta = item.getSavePath();
            if (dato.ruta) dato.nombre = path.basename(dato.ruta);
        }
        function progreso(_evento, estado) {
            leer();
            dato.estado = estado === "interrupted" ? "interrumpida" : "descargando";
            actualizar();
        }
        item.on("updated", progreso);
        item.once("done", (_evento, estado) => {
            leer();
            dato.estado = estado === "completed" ? "completada" : estado === "cancelled" ? "cancelada" : "fallida";
            activos.delete(id);
            item.removeListener("updated", progreso);
            limitar();
            actualizar(true);
        });
        // Electron conserva el diálogo Guardar como y la elección de ubicación del usuario.
        leer();
        actualizar(true);
    });

    function registrar(canal, accion) {
        ipcMain.handle(canal, async (evento, id) => {
            try {
                const ventana = obtenerVentana();
                if (!ventana || ventana.isDestroyed() || evento.sender !== ventana.webContents ||
                    evento.senderFrame !== ventana.webContents.mainFrame) throw new Error("Acceso no permitido.");
                await accion(id);
                return { correcto: true, ...snapshot() };
            } catch (error) {
                return { correcto: false, error: error.message };
            }
        });
    }
    registrar("listar-descargas", () => {});
    registrar("cancelar-descarga", id => {
        const item = activos.get(id);
        if (!item) throw new Error("Esta descarga ya terminó o no está disponible.");
        item.cancel();
    });
    registrar("mostrar-descarga", async id => {
        const dato = registros.get(id);
        if (!dato || dato.estado !== "completada" || !dato.ruta) throw new Error("El archivo todavía no está disponible.");
        try {
            if (!(await comprobarArchivo(dato.ruta)).isFile()) throw new Error();
        } catch {
            throw new Error("No encontramos el archivo. Puede haberse movido o eliminado.");
        }
        shell.showItemInFolder(dato.ruta);
    });
    return { snapshot };
}

module.exports = { registrarDescargas };
