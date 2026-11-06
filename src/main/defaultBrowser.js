// Registro de Patagonia como navegador en Windows (sólo para el usuario actual,
// sin permisos de administrador) y apertura de enlaces que mandan otros programas.
const { execFile, execFileSync } = require("node:child_process");

const NOMBRE_APP = "Patagonia Browser";
const CLAVE_CLIENTE = "Software\\Clients\\StartMenuInternet\\PatagoniaBrowser";
const PROGID = "PatagoniaBrowserURL";
const CLAVE_PROGID = `Software\\Classes\\${PROGID}`;
const MAX_ENLACES = 20;

function enlaceExterno(valor) {
    if (typeof valor !== "string" || valor.startsWith("-")) return null;
    try {
        const url = new URL(valor.replace(/^"|"$/g, ""));
        if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
        return url.href;
    } catch { return null; }
}

function extraerEnlaces(argv = []) {
    // argv[0] es el ejecutable; en desarrollo también llega la carpeta de la app.
    return argv.slice(1).map(enlaceExterno).filter(Boolean).slice(0, MAX_ENLACES);
}

function entradasRegistro(ejecutable) {
    const icono = `"${ejecutable}",0`;
    const abrir = `"${ejecutable}" "%1"`;
    const hkcu = clave => `HKCU\\${clave}`;
    return [
        [hkcu(CLAVE_CLIENTE), "", NOMBRE_APP],
        [hkcu(`${CLAVE_CLIENTE}\\DefaultIcon`), "", icono],
        [hkcu(`${CLAVE_CLIENTE}\\shell\\open\\command`), "", `"${ejecutable}"`],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities`), "ApplicationName", NOMBRE_APP],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities`), "ApplicationDescription", "Navegador rápido, privado y sencillo."],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities`), "ApplicationIcon", icono],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities\\StartMenu`), "StartMenuInternet", "PatagoniaBrowser"],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities\\URLAssociations`), "http", PROGID],
        [hkcu(`${CLAVE_CLIENTE}\\Capabilities\\URLAssociations`), "https", PROGID],
        [hkcu(CLAVE_PROGID), "", "Página web de Patagonia Browser"],
        [hkcu(`${CLAVE_PROGID}\\DefaultIcon`), "", icono],
        [hkcu(`${CLAVE_PROGID}\\Application`), "ApplicationName", NOMBRE_APP],
        [hkcu(`${CLAVE_PROGID}\\Application`), "ApplicationIcon", icono],
        [hkcu(`${CLAVE_PROGID}\\shell\\open\\command`), "", abrir],
        [hkcu("Software\\RegisteredApplications"), NOMBRE_APP, `${CLAVE_CLIENTE}\\Capabilities`]
    ];
}

function argumentosAgregar([clave, nombre, dato]) {
    return ["add", clave, ...(nombre ? ["/v", nombre] : ["/ve"]), "/t", "REG_SZ", "/d", dato, "/f"];
}

function comandosRegistrar(ejecutable) {
    return entradasRegistro(ejecutable).map(argumentosAgregar);
}

function comandosQuitar() {
    return [
        ["delete", "HKCU\\Software\\RegisteredApplications", "/v", NOMBRE_APP, "/f"],
        ["delete", `HKCU\\${CLAVE_CLIENTE}`, "/f"],
        ["delete", `HKCU\\${CLAVE_PROGID}`, "/f"]
    ];
}

function ejecutarSincronico(comandos, ejecutar = execFileSync) {
    for (const args of comandos) {
        try { ejecutar("reg.exe", args, { windowsHide: true, stdio: "ignore" }); }
        catch { /* Una clave ausente no debe frenar la instalación ni la desinstalación. */ }
    }
}

function ejecutarEnSegundoPlano(comandos, ejecutar = execFile) {
    return comandos.reduce((anterior, args) => anterior.then(() => new Promise(resolve => {
        ejecutar("reg.exe", args, { windowsHide: true }, () => resolve());
    })), Promise.resolve());
}

// Eventos del instalador Squirrel: registrar al instalar o actualizar, limpiar al desinstalar.
function atenderEventoInstalador(argv, ejecutable, ejecutar) {
    const evento = argv[1];
    if (evento === "--squirrel-install" || evento === "--squirrel-updated") {
        ejecutarSincronico(comandosRegistrar(ejecutable), ejecutar);
        return true;
    }
    if (evento === "--squirrel-uninstall") {
        ejecutarSincronico(comandosQuitar(), ejecutar);
        return true;
    }
    return false;
}

function abrirConfiguracionWindows(shell) {
    const nombre = encodeURIComponent(NOMBRE_APP);
    return shell.openExternal(`ms-settings:defaultapps?registeredAppUser=${nombre}`)
        .catch(() => shell.openExternal("ms-settings:defaultapps"));
}

module.exports = {
    NOMBRE_APP,
    enlaceExterno,
    extraerEnlaces,
    entradasRegistro,
    comandosRegistrar,
    comandosQuitar,
    ejecutarSincronico,
    ejecutarEnSegundoPlano,
    atenderEventoInstalador,
    abrirConfiguracionWindows
};
