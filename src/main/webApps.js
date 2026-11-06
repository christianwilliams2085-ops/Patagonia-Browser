// Apps de sitio: una página abierta en su propia ventana, sin pestañas ni barra,
// con un acceso directo de Windows que la abre con un clic.
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");

const ARGUMENTO_APP = "--patagonia-app=";
const MAX_ICONO = 256;

function urlAppValida(valor) {
    try {
        const url = new URL(String(valor || ""));
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
        return url.href;
    } catch { return null; }
}

function extraerURLApp(argv = []) {
    for (const argumento of argv) {
        if (typeof argumento !== "string" || !argumento.startsWith(ARGUMENTO_APP)) continue;
        return urlAppValida(argumento.slice(ARGUMENTO_APP.length).replace(/^"|"$/g, ""));
    }
    return null;
}

function nombreArchivoSeguro(titulo, url) {
    const respaldo = (() => { try { return new URL(url).hostname; } catch { return "Sitio"; } })();
    const limpio = String(titulo || "")
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/, "")
        .slice(0, 60)
        .trim();
    const nombre = limpio || respaldo;
    // Nombres reservados de Windows (CON, PRN, AUX, NUL, COM1...).
    return /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(nombre) ? `${nombre} (app)` : nombre;
}

// Envuelve un PNG en un contenedor ICO (Windows lo acepta desde Vista).
function pngAIco(png, ancho, alto) {
    const cabecera = Buffer.alloc(6 + 16);
    cabecera.writeUInt16LE(0, 0);
    cabecera.writeUInt16LE(1, 2);
    cabecera.writeUInt16LE(1, 4);
    cabecera.writeUInt8(ancho >= 256 ? 0 : ancho, 6);
    cabecera.writeUInt8(alto >= 256 ? 0 : alto, 7);
    cabecera.writeUInt8(0, 8);
    cabecera.writeUInt8(0, 9);
    cabecera.writeUInt16LE(1, 10);
    cabecera.writeUInt16LE(32, 12);
    cabecera.writeUInt32LE(png.length, 14);
    cabecera.writeUInt32LE(22, 18);
    return Buffer.concat([cabecera, png]);
}

function esIco(datos) {
    return datos.length > 6 && datos.readUInt16LE(0) === 0 && datos.readUInt16LE(2) === 1 && datos.readUInt16LE(4) > 0;
}

async function prepararIcono({ favicon, descargar, nativeImage, carpeta, url, iconoRespaldo }) {
    if (!favicon || !/^(https?:|data:image\/)/i.test(favicon)) return iconoRespaldo;
    try {
        const datos = await descargar(favicon);
        if (!datos?.length || datos.length > 2 * 1024 * 1024) return iconoRespaldo;
        let ico;
        if (esIco(datos)) ico = datos;
        else {
            let imagen = nativeImage.createFromBuffer(datos);
            if (imagen.isEmpty()) return iconoRespaldo;
            const { width, height } = imagen.getSize();
            if (width > MAX_ICONO || height > MAX_ICONO) imagen = imagen.resize({ width: MAX_ICONO, height: MAX_ICONO, quality: "best" });
            const tamano = imagen.getSize();
            ico = pngAIco(imagen.toPNG(), tamano.width, tamano.height);
        }
        await fs.mkdir(carpeta, { recursive: true });
        const nombre = createHash("sha256").update(new URL(url).origin).digest("hex").slice(0, 16);
        const ruta = path.join(carpeta, `${nombre}.ico`);
        await fs.writeFile(ruta, ico);
        return ruta;
    } catch {
        return iconoRespaldo;
    }
}

// En las instalaciones de Squirrel, el ejecutable de la versión cambia con cada
// actualización; el lanzador de la carpeta raíz es estable y reenvía los argumentos.
function ejecutableEstable(execPath, existe = fsSync.existsSync) {
    const carpetaVersion = path.dirname(execPath);
    const raiz = path.dirname(carpetaVersion);
    const lanzador = path.join(raiz, path.basename(execPath));
    if (/^app-\d/i.test(path.basename(carpetaVersion)) && existe(path.join(raiz, "Update.exe")) && existe(lanzador)) {
        return lanzador;
    }
    return execPath;
}

async function crearAccesoDirecto({ shell, escritorio, ejecutable, argumentosBase = "", url, titulo, icono }) {
    const destino = urlAppValida(url);
    if (!destino) throw new Error("Solo se pueden crear apps de páginas web (http o https).");
    const nombre = nombreArchivoSeguro(titulo, destino);
    const ruta = path.join(escritorio, `${nombre}.lnk`);
    const argumentos = `${argumentosBase ? `${argumentosBase} ` : ""}${ARGUMENTO_APP}"${destino}"`;
    const correcto = shell.writeShortcutLink(ruta, "create", {
        target: ejecutable,
        args: argumentos,
        description: `${nombre} — app de Patagonia Browser`,
        icon: icono,
        iconIndex: 0
    });
    if (!correcto) throw new Error("Windows no dejó crear el acceso directo en el escritorio.");
    return { nombre, ruta };
}

function crearVentanaApp({ BrowserWindow, url, icono, preferencias, abrirEnNavegador }) {
    const ventana = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 400,
        minHeight: 300,
        show: false,
        title: "Patagonia Browser",
        autoHideMenuBar: true,
        backgroundColor: "#ffffff",
        icon: icono,
        webPreferences: { ...preferencias }
    });
    ventana.setMenuBarVisibility?.(false);
    const contenido = ventana.webContents;
    const origen = new URL(url).origin;

    // Las ventanas emergentes y los enlaces a otros sitios se abren en Patagonia.
    contenido.setWindowOpenHandler(({ url: destino }) => {
        const valida = urlAppValida(destino);
        if (valida) abrirEnNavegador(valida);
        return { action: "deny" };
    });
    contenido.on("will-navigate", (evento, destino) => {
        if (!urlAppValida(destino)) { evento.preventDefault(); return; }
        try {
            if (new URL(destino).origin !== origen) {
                evento.preventDefault();
                abrirEnNavegador(destino);
            }
        } catch { evento.preventDefault(); }
    });
    contenido.on("before-input-event", (evento, tecla) => {
        if (tecla.type !== "keyDown") return;
        const control = tecla.control || tecla.meta;
        const clave = String(tecla.key || "").toLowerCase();
        if (clave === "f5" || (control && clave === "r")) { evento.preventDefault(); contenido.reload(); }
        else if (tecla.alt && clave === "arrowleft" && contenido.navigationHistory?.canGoBack()) { evento.preventDefault(); contenido.navigationHistory.goBack(); }
        else if (tecla.alt && clave === "arrowright" && contenido.navigationHistory?.canGoForward()) { evento.preventDefault(); contenido.navigationHistory.goForward(); }
        else if (control && clave === "w") { evento.preventDefault(); ventana.close(); }
    });
    contenido.on("page-title-updated", (evento, titulo) => {
        evento.preventDefault();
        if (!ventana.isDestroyed()) ventana.setTitle(titulo || new URL(url).hostname);
    });
    ventana.once("ready-to-show", () => ventana.show());
    contenido.loadURL(url).catch(() => {
        if (!ventana.isDestroyed()) ventana.show();
    });
    return ventana;
}

module.exports = {
    ARGUMENTO_APP,
    urlAppValida,
    extraerURLApp,
    nombreArchivoSeguro,
    pngAIco,
    esIco,
    prepararIcono,
    ejecutableEstable,
    crearAccesoDirecto,
    crearVentanaApp
};
