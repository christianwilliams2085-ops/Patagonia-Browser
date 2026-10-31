# 🏔️ Patagonia Browser

> Navegá libre. Navegá seguro.

Navegador para **Windows** (Electron) y **Android/iPhone** (Flutter), enfocado en una experiencia sencilla y en el control del usuario. Es un prototipo funcional en desarrollo, no una versión estable; los objetivos de privacidad y seguridad todavía requieren implementación y validación adicionales.

Todo el código está en este repositorio:

| Carpeta | Qué es | Versión |
|---|---|---|
| raíz (`main.js`, `src/`, `ui/`…) | Navegador de escritorio para Windows | 1.0.5 |
| `mobile/` | App de Android e iPhone | 1.0.5+8 |

Para armar el instalador de Windows o los APK, seguí **[COMO-ARMAR.md](COMO-ARMAR.md)**.

## En resumen: qué anda y qué no

| | Estado |
|---|---|
| Windows: navegación, pestañas, favoritos, historial, descargas, sesiones | ✅ Anda |
| Windows: bloqueo de anuncios y rastreadores (motor Ghostery) | ✅ Anda |
| Windows: instalador | ⚠️ Anda, pero **sin firma**: Windows avisa al instalarlo |
| Android: navegación, pestañas, favoritos, historial, privacidad por sitio | ✅ Anda (probado con pruebas automáticas; falta más prueba en teléfono) |
| Android: bloqueo de anuncios en sitios comunes | ✅ Anda (lista de dominios + limpieza visual) |
| **Android: anuncios de YouTube** | ❌ **No resuelto.** El script actual es conservador: no rompe el video, pero los anuncios siguen apareciendo |
| iPhone | ⚠️ Proyecto listo para compilar en una Mac; el chequeo automático todavía no corrió y no hay app publicada |

**Qué sigue:** probar en Android un motor alternativo, **GeckoView (Firefox) con uBlock Origin**, para ver si resuelve YouTube. Ver [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Disponible en Windows

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

La última versión **publicada** para Windows x64 es **1.0.4** (7 de septiembre de 2026). Descargá `Patagonia-Browser-Setup.exe` desde la [página de descargas](DOWNLOADS.md). El código de este repositorio ya está en **1.0.5**, que todavía no se publicó.

El instalador está **sin firma de un proveedor reconocido** y Windows puede mostrar una advertencia o bloquear su ejecución. La publicación 1.0.4 sólo incluye el instalador; no publica un ZIP portátil ni un archivo de hashes separado. La versión portátil puede generarse desde el código con el comando indicado arriba.

Para regenerar el instalador, ver [COMO-ARMAR.md](COMO-ARMAR.md) (`npm run make:windows`).

## Code signing policy

La solicitud inicial a SignPath Foundation, enviada el 8 de septiembre de 2026, no fue aprobada por falta de suficientes señales públicas de adopción y colaboración, según el [issue #10](https://github.com/christianwilliams2085-ops/Patagonia-Browser/issues/10). Actualmente no existe un certificado activo ni un servicio de firma de SignPath para Patagonia Browser. No hay fechas ni aprobación futura garantizadas.

La [política de firma](CODE_SIGNING.md) describe el responsable, la compilación verificable y las comprobaciones requeridas antes de publicar una versión firmada. El [registro de la solicitud](docs/SIGNPATH_APPLICATION.md) contiene los datos del proyecto, los textos enviados y los requisitos pendientes. La edición de Windows tiene una [política de privacidad específica](PRIVACY_WINDOWS.md).

## Android y iPhone

El código de la app móvil está en [`mobile/`](mobile/README.md) (Flutter 3.47.7). Con él se arman:

- **APK de prueba** ("Patagonia Pruebas"): se instala aparte de la app oficial, no necesita contraseña.
- **APK oficial firmado** ("Patagonia Browser"): actualiza la app instalada; necesita la clave original, que **no** está en Git.
- **iPhone**: proyecto para compilar en una Mac con Xcode y una cuenta Apple.

Los pasos están en [COMO-ARMAR.md](COMO-ARMAR.md). Los artefactos móviles 1.0.0 viejos siguen en la [publicación v1.0.3](https://github.com/christianwilliams2085-ops/Patagonia-Browser/releases/tag/v1.0.3). La firma de Android es independiente de la firma de Windows y de SignPath. Consultá la [política de privacidad móvil](PRIVACY.md).

**YouTube en Android no está resuelto**: ver [mobile/README.md](mobile/README.md).

## Ejecutar

Requiere Node.js y npm compatibles con las dependencias de package-lock.json.

```sh
npm ci
npm start
```

## Pruebas

```sh
npm test                                   # escritorio + motor Android + script de YouTube
cd mobile && flutter analyze && flutter test   # app móvil
```

Al 31 de octubre de 2026: `npm test` pasa **171 de 171** pruebas y `flutter test` pasa **36 de 36**, con `flutter analyze` sin problemas. La prueba del motor Android compila código Java: necesita `java` en el PATH o la variable `JAVA_HOME`. Las pruebas de interfaz usan un DOM simulado; no reemplazan probar la app en una PC o un teléfono reales.

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

[MIT](LICENSE). Excepción: `mobile/vendor/flutter_inappwebview_android` es una copia modificada de un plugin de terceros y conserva su propia licencia (Apache 2.0, ver su archivo `LICENSE`).
