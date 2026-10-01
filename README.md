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

La versión vigente para Windows x64 es **1.0.4**, publicada el 7 de septiembre de 2026. Descargá `Patagonia-Browser-Setup.exe` desde la [página de descargas](DOWNLOADS.md).

El instalador está **sin firma de un proveedor reconocido** y Windows puede mostrar una advertencia o bloquear su ejecución. La publicación 1.0.4 sólo incluye el instalador; no publica un ZIP portátil ni un archivo de hashes separado. La versión portátil puede generarse desde el código con el comando indicado arriba.

Para regenerar el instalador:

```sh
npm run make:windows
```

## Code signing policy

La solicitud inicial a SignPath Foundation, enviada el 8 de septiembre de 2026, no fue aprobada por falta de suficientes señales públicas de adopción y colaboración, según el [issue #10](https://github.com/christianwilliams2085-ops/Patagonia-Browser/issues/10). Actualmente no existe un certificado activo ni un servicio de firma de SignPath para Patagonia Browser. No hay fechas ni aprobación futura garantizadas.

La [política de firma](CODE_SIGNING.md) describe el responsable, la compilación verificable y las comprobaciones requeridas antes de publicar una versión firmada. El [registro de la solicitud](docs/SIGNPATH_APPLICATION.md) contiene los datos del proyecto, los textos enviados y los requisitos pendientes. La edición de Windows tiene una [política de privacidad específica](PRIVACY_WINDOWS.md).

## Android y iPhone

El código fuente de `mobile/` todavía **no está publicado en `main`**. Por lo tanto, clonar esta rama no proporciona `mobile/ios` ni `mobile/IOS_RELEASE_CHECKLIST.md`.

Los artefactos móviles 1.0.0 para pruebas familiares están disponibles en la [publicación v1.0.3](https://github.com/christianwilliams2085-ops/Patagonia-Browser/releases/tag/v1.0.3): APK Android y ZIP del proyecto para iPhone. Esa etiqueta corresponde a la publicación que los contiene; la versión vigente de Windows es 1.0.4.

El APK Android se describe en esa publicación como firmado y compatible con Android 7 o posterior. Esa firma de Android es independiente de la firma de Windows y de SignPath. El ZIP de iPhone es un proyecto para compilar y firmar en una Mac con Xcode y una cuenta Apple; no es una app instalable directamente. Consultá la [política de privacidad móvil](PRIVACY.md).

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
