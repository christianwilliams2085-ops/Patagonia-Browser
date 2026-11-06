(() => {
    const indicador = document.getElementById("indicadorZoom");
    window.patagonia.recibirZoom(porcentaje => {
        const valor = Number(porcentaje) || 100;
        indicador.textContent = `${valor}%`;
        indicador.hidden = valor === 100;
    });
    indicador.addEventListener("click", () => window.patagonia.zoomNormal());
})();
