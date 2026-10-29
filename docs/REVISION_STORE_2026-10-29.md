# Revision del candidato Windows para Microsoft Store

Base: `feat/microsoft-store-msix`, commit `660a72562bf2d7036d87cb76a8c9b5eb08aef063` (PR #17).

## Correcciones

- El constructor portable omitía `bootstrap.js`, aunque `package.json` lo declara como entrada. Ahora lo copia y una prueba comprueba que la entrada declarada existe en el resultado. El fallo se reprodujo antes de corregirlo.
- El arranque real cargaba Ghostery antes de atender los eventos de instalacion/desinstalacion de Squirrel. Ahora los atiende primero. MSIX omite Squirrel tanto en bootstrap como en main.
- MSIX ya no reemplaza su identidad de Windows por `com.squirrel.PatagoniaBrowser.PatagoniaBrowser`. El EXE conserva ese identificador.
- Si la interfaz local no carga o falla la inicializacion asincrona, se informa el error y se termina la instancia. Antes solo se registraba en consola y podia quedar un proceso con ventana oculta.
- MSIX valida el contenido real de `resources/app.asar` antes del empaquetado y despues de desempaquetar: entrada, interfaz, modulo de compatibilidad, recursos y metadatos de dependencias directas. No equivale a ejecutar la aplicacion ni a una auditoria de dependencias transitivas.
- Los workflows de pruebas y EXE incluyen cambios de bootstrap; las pruebas tambien incluyen scripts/configuracion.
- Metadatos npm alineados con la licencia MIT ya existente en LICENSE, sin cambiar su texto.

## Validacion local

- 162 pruebas aprobadas, 0 fallos. Incluyen navegacion, pestañas, permisos, IPC, descargas, persistencia, cierre, bloqueador y empaquetado.
- Pruebas nuevas del arranque, identidad MSIX, fallo de carga de index.html y contenido de ASAR real.
- `git diff --check` y analisis sintactico PowerShell correctos.
- Se reutilizaron dependencias locales: cinco dependencias auxiliares tenian 1.0.2 en lugar de 1.0.3 del lock (balanced-match, has-property-descriptors, minipass-collect, util-deprecate, wrappy). GitHub Actions debe confirmar con `npm ci` y el lock exacto.
- El diagnostico minimo de Electron fallo sin cargar Patagonia: proceso de pagina `launch-failed` (49), GPU `-1073741515`. Esta sesion restringida no permite dar por validada la interfaz grafica. No se desactivo el sandbox ni la seguridad del navegador.
- Windows SDK/MakeAppx no disponible en la sesion local. La generacion MSIX corresponde al workflow Windows del PR.

## Antes de enviar a Store

1. Exigir pruebas y compilaciones correctas del ultimo commit del PR; descargar el candidato STORE-UNSIGNED de esa ejecucion.
2. Instalar en un entorno Windows de prueba con firma de desarrollo apropiada. Probar inicio, segunda apertura, navegacion HTTPS, ChatGPT/YouTube, ventanas emergentes y formularios, descarga/cancelacion, camara/microfono, favoritos y restauracion de pestañas.
3. Probar instalacion, actualizacion y desinstalacion como usuario estandar, y convivencia con EXE sin perder datos. La identidad de prueba no demuestra por si sola aislamiento de perfiles.
4. Ejecutar Windows App Certification Kit sobre el paquete final y revisar los resultados.
5. Revisar privacidad, capturas, descripcion, clasificacion por edad y datos de soporte de Partner Center. Subir exclusivamente el candidato con identidad oficial.

La revision de fuentes y las pruebas automatizadas no certifican ausencia total de errores, compatibilidad con todos los sitios ni aprobacion de Microsoft Store. No se ha publicado ni enviado la aplicacion.

Referencias: [process.windowsStore](https://www.electronjs.org/docs/latest/api/process), [requisitos MSIX de Microsoft Store](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements).
