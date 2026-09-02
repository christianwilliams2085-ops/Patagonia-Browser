const fs = require("node:fs/promises");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

function urlSegura(valor) {
    try {
        const url = new URL(valor);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}

function crearInstantanea(pestanas, idActiva) {
    const validas = pestanas.map(p => ({ id: p.id, url: urlSegura(p.url) })).filter(p => p.url);
    return { version: 1, pestanas: validas.map(p => ({ url: p.url })),
        activa: Math.max(0, validas.findIndex(p => p.id === idActiva)) };
}

function crearGestorSesion(archivo, notificar = () => {}) {
    let datos = crearInstantanea([], null);
    let inicializada = false;
    let bloqueada = false;
    let error = "";
    let pendiente = null;
    let temporizador;
    let cola = Promise.resolve();
    let ultimaGuardada = "";
    let revision = 0;
    const estado = () => ({ cantidad: datos.pestanas.length, guardada: ultimaGuardada === JSON.stringify(datos), error, bloqueada, revision });
    function avisar() { revision++; notificar(estado()); }

    async function iniciar() {
        try {
            const leida = JSON.parse(await fs.readFile(archivo, "utf8"));
            if (leida?.version !== 1 || !Array.isArray(leida.pestanas) ||
                !Number.isInteger(leida.activa) || leida.activa < 0 ||
                leida.activa >= Math.max(1, leida.pestanas.length) ||
                leida.pestanas.some(p => typeof p?.url !== "string" || urlSegura(p.url) !== p.url)) {
                throw new Error("Formato inválido");
            }
            datos = { version: 1, pestanas: leida.pestanas.map(p => ({ url: p.url })), activa: leida.activa };
            ultimaGuardada = JSON.stringify(datos);
        } catch (fallo) {
            if (fallo.code !== "ENOENT") {
                bloqueada = true;
                error = "No pudimos leer la sesión anterior. Conservamos el archivo original sin modificarlo.";
            }
        }
        inicializada = true;
        return JSON.parse(JSON.stringify(datos));
    }

    function actualizar(pestanas, idActiva) {
        if (!inicializada || bloqueada) return;
        const nueva = crearInstantanea(pestanas, idActiva);
        if (JSON.stringify(nueva) === JSON.stringify(datos) && !error) return;
        datos = nueva;
        pendiente = JSON.stringify(datos);
        clearTimeout(temporizador);
        temporizador = setTimeout(() => { guardarAhora().catch(() => {}); }, 300);
        avisar();
    }

    function guardarAhora() {
        clearTimeout(temporizador);
        if (bloqueada) return Promise.reject(new Error(error));
        const texto = pendiente;
        pendiente = null;
        const operacion = cola.then(async () => {
            if (texto === null) {
                if (error) throw new Error(error);
                return;
            }
            const temporal = `${archivo}.${randomUUID()}.tmp`;
            try {
                await fs.mkdir(path.dirname(archivo), { recursive: true });
                await fs.writeFile(temporal, texto, "utf8");
                await fs.rename(temporal, archivo);
                ultimaGuardada = texto;
                error = "";
            } catch {
                error = "No pudimos guardar las pestañas. Volvé a intentar con Guardar ahora.";
                if (pendiente === null) pendiente = JSON.stringify(datos);
                throw new Error(error);
            } finally {
                await fs.rm(temporal, { force: true }).catch(() => {});
                avisar();
            }
        });
        cola = operacion.catch(() => {});
        return operacion;
    }
    return { iniciar, actualizar, guardarAhora, estado };
}

function registrarSesiones({ ipcMain, archivo, obtenerVentana }) {
    const gestor = crearGestorSesion(archivo, estado => {
        const ventana = obtenerVentana();
        if (ventana && !ventana.isDestroyed()) ventana.webContents.send("sesion-actualizada", estado);
    });
    for (const canal of ["obtener-sesion", "guardar-sesion"]) {
        ipcMain.handle(canal, async evento => {
            const ventana = obtenerVentana();
            if (!ventana || ventana.isDestroyed() || evento.sender !== ventana.webContents ||
                evento.senderFrame !== ventana.webContents.mainFrame) return { correcto: false, error: "Acceso no permitido." };
            try {
                if (canal === "guardar-sesion") await gestor.guardarAhora();
                return { correcto: true, sesion: gestor.estado() };
            } catch (error) { return { correcto: false, error: error.message }; }
        });
    }
    return gestor;
}

module.exports = { crearInstantanea, crearGestorSesion, registrarSesiones };
