// Niveles de zoom iguales a los de Chrome, para que se sientan familiares.
const NIVELES = [0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5];

function siguienteNivel(actual, direccion) {
    const valor = Number.isFinite(actual) && actual > 0 ? actual : 1;
    if (direccion > 0) return NIVELES.find(nivel => nivel > valor + 0.001) ?? NIVELES.at(-1);
    return [...NIVELES].reverse().find(nivel => nivel < valor - 0.001) ?? NIVELES[0];
}

function porcentaje(factor) {
    return Math.round((Number.isFinite(factor) && factor > 0 ? factor : 1) * 100);
}

function cambiarZoom(contenido, direccion) {
    if (!contenido || contenido.isDestroyed()) return null;
    const nuevo = direccion === 0 ? 1 : siguienteNivel(contenido.getZoomFactor(), direccion);
    contenido.setZoomFactor(nuevo);
    return porcentaje(nuevo);
}

// Atajos de zoom e impresión compartidos por pestañas y ventanas de app.
function accionTeclado(entrada) {
    if (entrada.type !== "keyDown" || entrada.alt || !(entrada.control || entrada.meta)) return null;
    const tecla = String(entrada.key || "");
    if (tecla === "+" || tecla === "=") return "zoomMas";
    if (tecla === "-" || tecla === "_") return "zoomMenos";
    if (tecla === "0" && !entrada.shift) return "zoomNormal";
    if (tecla.toLowerCase() === "p" && !entrada.shift) return "imprimir";
    return null;
}

function imprimir(contenido) {
    if (!contenido || contenido.isDestroyed()) return;
    contenido.print({}, () => {});
}

module.exports = { NIVELES, siguienteNivel, porcentaje, cambiarZoom, accionTeclado, imprimir };
