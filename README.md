# 🏔️ Patagonia Browser

> Navegá libre. Navegá seguro.

Proyecto de navegador de escritorio enfocado en una experiencia sencilla y en el control del usuario. Actualmente es un prototipo funcional en desarrollo; los objetivos de privacidad y seguridad todavía requieren implementación y validación adicionales.

## Disponible

- Navegación por pestañas, búsqueda y controles de navegación.
- Nueva pestaña propia con paisaje patagónico, buscador, accesos rápidos incorporados y accesos personalizados guardados en el equipo.
- Icono oficial con montañas blancas y azules sobre un paisaje desenfocado, preparado en nueve tamaños para Windows.
- Interfaz azul oscuro con pestañas redondeadas, barra de título integrada y Centro de privacidad lateral.
- Bloqueo real de anuncios y rastreadores, con listas integradas, actualización automática, conteos por pestaña y una excepción opcional por sitio.
- Botones Atrás/Adelante según el historial de la pestaña y opción de detener la carga.
- Pestañas que conservan sus controles y el foco al actualizar títulos o indicadores de carga.
- Servidores locales como `localhost:3000`.
- Favoritos e historial persistentes.
- Descargas con progreso, cancelación y acceso a la carpeta.
- Guardado y restauración de las pestañas al iniciar.
- Configuración de página de inicio y restauración al abrir.
- Búsqueda dentro de la página con Ctrl+F, contador y recorrido de coincidencias.
- Menú en español y atajos para dirección, pestañas, recarga y navegación.
- Recuperación de las últimas diez pestañas cerradas con Ctrl+Mayús+T o desde el menú Archivo.
- Mensajes de error de carga y recuperación de pestañas bloqueadas con reintento.
- Aviso al cerrar con descargas activas.
- Cierre que espera los guardados pendientes de favoritos, historial, configuración y pestañas. Si falla el guardado de las pestañas, permite reintentar, volver al navegador o cerrar sin guardar.
- Una sola instancia para evitar escrituras simultáneas sobre el mismo perfil.
- Los permisos de sitios admitidos, como cámara, micrófono y ubicación, requieren una confirmación visible. Las decisiones duran hasta cerrar Patagonia. Los avisos aparecen de uno en uno y se cancelan al navegar o cambiar de pestaña; las solicitudes desconocidas, inseguras o de apertura de aplicaciones externas se bloquean.
- Asistente local para extraer texto y resumir mediante reglas; todavía sin modelo de IA conectado.

## Usarlo en Windows

Los instaladores publicados y su estado de firma están en la [página de descargas de Windows](DOWNLOADS.md).

La versión portátil queda en `dist/Patagonia Browser-win32-x64`. Abrí `Patagonia Browser.exe` o usá el acceso directo `Patagonia Browser` creado en la carpeta principal del proyecto en el Escritorio. Para trasladarla a otro lugar, copiá la carpeta portátil completa.

Patagonia conserva sus pestañas, preferencias, favoritos e historial en el perfil de Windows del usuario. El cierre normal espera a que se guarden los cambios.

Para volver a crear la versión portátil desde el código:

```sh
npm run build:portable
```

## Compartir con la familia

La carpeta `dist/PARA COMPARTIR - PATAGONIA 1.0.3` contiene el icono elegido por Roma y dos opciones para Windows de 64 bits:

- `Patagonia-Browser-Setup-1.0.3-Windows-x64.exe`: instalador recomendado, sin permisos de administrador.
- `Patagonia-Browser-Portable-1.0.3-Windows-x64.zip`: edición que funciona después de extraer la carpeta completa.

También incluye instrucciones y hashes SHA-256 para comprobar la integridad. Esta edición familiar todavía no posee una firma digital comercial, por lo que Windows puede mostrar una advertencia de aplicación desconocida. La firma será necesaria antes de la publicación general.

Para regenerar el instalador:

```sh
npm run make:windows
```

## Code signing policy

La firma de Windows está en preparación para solicitar el programa de SignPath Foundation. Todavía no hay una solicitud enviada, aprobación ni certificado activo.

La [política de firma](CODE_SIGNING.md) describe el responsable, la compilación verificable y las comprobaciones requeridas antes de publicar una versión firmada. La [guía de solicitud](docs/SIGNPATH_APPLICATION.md) contiene los datos y textos preparados para el formulario. La edición de Windows tiene una [política de privacidad específica](PRIVACY_WINDOWS.md).

## Android y iPhone

La carpeta `mobile/` contiene la nueva edición para teléfonos. Incluye la pantalla de inicio de Patagonia, navegación por pestañas, favoritos, historial, modo de escritorio y protección integrada contra publicidad y rastreadores.

El APK firmado para compartir con la familia está en `dist/PARA COMPARTIR - PATAGONIA MOVIL 1.0.0`. Es compatible con Android 7 o posterior e incluye Patagonia AI para resumir localmente la página abierta. El proyecto de iPhone y todos sus iconos están preparados en `mobile/ios`; Apple exige una Mac con Xcode y una cuenta Apple para producir el archivo instalable de iPhone.

La guía para preparar y publicar la edición de iPhone está en mobile/IOS_RELEASE_CHECKLIST.md y la política pública en PRIVACY.md.

## Ejecutar

Requiere Node.js y npm compatibles con las dependencias de package-lock.json.

```sh
npm ci
npm start
```

## Pruebas

```sh
npm test
```

La revisión del 3 de septiembre de 2026 pasa 101 pruebas automatizadas. Incluyen comprobaciones del motor integrado contra publicidad y seguimiento conocidos, además de las pruebas de navegación, interfaz, guardado y seguridad. Las pruebas automatizadas de interfaz utilizan un DOM simulado. También se comprobó en Electron sobre Windows el reinicio, la restauración de pestañas, el menú, la búsqueda, la nueva página de inicio y el Centro de privacidad.

Para buscar texto en una página, usá Ctrl+F. Enter o F3 avanza a la siguiente coincidencia; Mayús+Enter o Mayús+F3 retrocede. Escape cierra la barra. La búsqueda se cierra al cambiar de pestaña o navegar a otra página.

Mientras una página carga, el botón Recargar cambia a Detener carga. También podés detenerla desde el menú Navegación.

## Tecnología

Electron/Chromium, JavaScript, HTML/CSS, Node.js, Ghostery Adblocker, Mozilla Readability y jsdom. Los datos de favoritos, historial, sesión y excepciones de protección se almacenan localmente. React, TypeScript y SQLite son propuestas de diseño, no dependencias implementadas.

## Próximos pasos

Configuración avanzada, panel para revisar o revocar permisos, modo privado, integración opcional de IA, instalador firmado y actualizaciones de la aplicación. Estas capacidades no deben considerarse disponibles todavía.

Consultá [PROJECT_STATUS.md](PROJECT_STATUS.md) para conocer el estado real y sus limitaciones. Los demás documentos de arquitectura y roadmap incluyen objetivos futuros.

## Contribuir

Ver [CONTRIBUTING.md](CONTRIBUTING.md). Las correcciones deben incluir las comprobaciones necesarias y actualizar el estado del proyecto cuando corresponda.

## Licencia

Consultar [LICENSE](LICENSE).
