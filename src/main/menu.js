function registrarMenu(Menu, acciones, plataforma = process.platform) {
    const plantilla = [
        { label: "Archivo", submenu: [
            { label: "Nueva pestaña", accelerator: "CmdOrCtrl+T", click: acciones.nueva },
            { label: "Reabrir pestaña cerrada", accelerator: "CmdOrCtrl+Shift+T", click: acciones.reabrir },
            { label: "Cerrar pestaña", accelerator: "CmdOrCtrl+W", click: acciones.cerrar },
            { type: "separator" },
            { label: "Salir de Patagonia", role: "quit" }
        ] },
        { label: "Editar", submenu: [
            { label: "Deshacer", role: "undo" }, { label: "Rehacer", role: "redo" },
            { type: "separator" },
            { label: "Cortar", role: "cut" }, { label: "Copiar", role: "copy" },
            { label: "Pegar", role: "paste" }, { label: "Seleccionar todo", role: "selectAll" },
            { type: "separator" },
            { label: "Buscar en la página", accelerator: "CmdOrCtrl+F", click: acciones.buscar }
        ] },
        { label: "Navegación", submenu: [
            { label: "Escribir una dirección", accelerator: "CmdOrCtrl+L", click: acciones.direccion },
            { label: "Atrás", accelerator: "Alt+Left", click: acciones.atras },
            { label: "Adelante", accelerator: "Alt+Right", click: acciones.adelante },
            { label: "Recargar página", accelerator: "CmdOrCtrl+R", click: acciones.recargar },
            { label: "Detener carga", click: acciones.detener },
            { label: "Página de inicio", accelerator: "Alt+Home", click: acciones.inicio }
        ] },
        { label: "Ventana", submenu: [
            { label: "Minimizar", role: "minimize" },
            { label: "Cerrar ventana", click: acciones.cerrarVentana }
        ] }
    ];
    if (plataforma === "darwin") plantilla.unshift({ role: "appMenu" });
    Menu.setApplicationMenu(Menu.buildFromTemplate(plantilla));
}

module.exports = { registrarMenu };
