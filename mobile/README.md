# Patagonia Browser móvil — revisión 1.0.4+7

Proyecto Flutter para Android y iPhone. Esta revisión se centra en Android.

## Funciones

Inicio y búsqueda; pestañas durante la sesión; atrás, adelante y recarga; favoritos e historial locales; asistente local para extraer un resumen, título o dirección; modo de escritorio; protección configurable por sitio.

## Protección preventiva de YouTube 1.0.4+7

La revisión 1.0.3 actuaba después de que YouTube ya había iniciado el anuncio. La prueba real del teléfono confirmó que eso no alcanzaba. En 1.0.4, el filtro se registra como `AT_DOCUMENT_START` en el mundo JavaScript principal del WebView, antes de que YouTube construya su reproductor.

En dominios reales de YouTube, la capa preventiva elimina `adPlacements`, `adSlots`, `playerAds` y otros metadatos publicitarios de los valores iniciales y de las respuestas del reproductor obtenidas por `JSON.parse`, `fetch` o `XMLHttpRequest`. También cubre respuestas clonadas y desactiva las dos variantes conocidas de *network machine*. No bloquea la API `/player` ni `googlevideo.com`, porque también transportan el video solicitado y las transmisiones en vivo.

Como respaldo, sigue reconociendo “Saltar/Omitir/Skip/Pular”, Shadow DOM y estados publicitarios visibles. Para anuncios insertados en la transmisión que el reproductor identifica como `SSAP, AD`, adelanta únicamente el tramo publicitario y conserva el estado normal del video. Nunca llama a `play()` ni anula una pausa manual.

Brave integra un motor nativo de bloqueo y listas actualizables dentro de Chromium. Patagonia continúa basado en Flutter WebView, por lo que no se afirma que ambos motores sean idénticos. Esta revisión aplica dentro de la arquitectura actual la misma clase de defensa preventiva —filtrado de respuestas y reglas tempranas— y requiere confirmación final en el teléfono.

## Reparación del proceso de compilación 1.0.2+5

Se conserva la versión de la app. Los dos lanzadores ejecutan `flutter clean` antes de resolver dependencias, analizar, probar y compilar. Esto evita reutilizar un bundle de pruebas anterior al parche. La limpieza se ejecuta aunque el aplicador indique 0 archivos actualizados. Una prueba inicial comprueba el manifiesto del bundle y la carga real de las imágenes y del script antes de ejecutar el resto de las pruebas.

En el entorno de revisión se reprodujo el mismo fallo manteniendo un bundle de la revisión anterior con una fecha más nueva que los archivos del parche. Los archivos fuente estaban presentes, pero faltaban en `build/unit_test_assets`. También apareció el desborde de 123 px: procedía del widget de error de la imagen ausente. La limpieza y regeneración de los recursos resolvió ambos errores en esa reproducción. Este resultado apoya el diagnóstico del registro de Windows; no supone acceso remoto a esa PC.

## Correcciones conservadas de 1.0.2+5

- Se habilita `allowBackgroundAudioPlaying` en Android para conservar el audio al minimizar, cambiar de aplicación o bloquear la pantalla. Sigue siendo obligatorio iniciar la reproducción mediante una acción del usuario. No se fuerza `play()` ni se anula una pausa manual. El ajuste de WebView no proporciona controles en la notificación ni garantiza que Android mantenga vivo el proceso bajo ahorro de batería o falta de memoria; hay que comprobar continuidad en el teléfono.
- YouTube: CSS específico para tarjetas patrocinadas de las versiones móvil y escritorio, observación de contenido agregado sin recargar y filtrado de rutas publicitarias del propio dominio, sin bloquear la API del reproductor ni `googlevideo.com`.
- La protección de YouTube se limita a sus dominios. Sus envoltorios de `fetch`, `JSON.parse` y `XMLHttpRequest` son reversibles; se eliminan al desactivar el escudo o destruir la página. Se verifica que una navegación o pestaña cerrada no reciba una inyección atrasada.
- Se reutiliza el emblema vectorial existente de Patagonia para el launcher, barra e inicio. Android recibe un vector centrado con un diámetro de 61 dp dentro de su zona segura de 66 dp. Ya no depende de los márgenes irregulares de la imagen anterior ni del aumento artificial en el inicio. `assets/patagonia-launcher.svg` es la fuente; `patagonia-emblema.png` es su render de 512 px para Flutter. Los recursos `patagonia_launcher` de Android son nativos; el generador de íconos se conserva solo para iOS.
- El lanzador CMD reutiliza las herramientas portátiles encontradas en esta PC (Flutter, Android SDK y JDK 17), sin modificar permanentemente las variables de Windows.

## Correcciones anteriores conservadas

- Android bloquea solicitudes de anuncios y rastreadores por dominio, sin las consultas HTTP HEAD del bloqueador nativo anterior. Los documentos principales se permiten. El contador usa solicitudes interceptadas; la limpieza visual no incrementa el contador.
- La excepción por sitio se aplica al navegar por enlaces y se comparte con las pestañas abiertas de ese mismo dominio. Las cookies de terceros se desactivan con la protección.
- Fuera de YouTube, la limpieza publicitaria continúa usando reglas de red y CSS. Se corrige la coincidencia de dominios y se retira el bloqueo global de tiktok.com.
- Los permisos de cámara, micrófono y ubicación solicitan primero consentimiento del sitio y después autorización del sistema. Solo se aceptan recursos reconocidos del origen HTTPS visible; navegar o cancelar invalida una solicitud pendiente.
- Se descartan callbacks de vistas cerradas; las ventanas nuevas conservan su windowId; un proceso WebView terminado puede recrearse desde el mensaje de error.
- Se corrigen direcciones con query, fragmento e IPv6 local. Se ordenan las escrituras de preferencias y se filtran entradas guardadas inválidas.
- El Centro de Privacidad se puede desplazar en pantallas pequeñas y ya no muestra un porcentaje fijo sin medición.

## Crear un APK de prueba en Windows

Con Flutter, el SDK Android y Java disponibles (o las herramientas portátiles de esta PC), abrir `CREAR-APK-PRUEBA.cmd` con doble clic. Ejecuta dependencias, análisis, pruebas y compilación; se detiene ante un error.

Resultado: `entrega-android/Patagonia-Android-1.0.4-Prueba.apk`.

Se instala como **Patagonia Pruebas**, identificador `com.patagoniabrowser.patagonia_browser.preview`. Usa la firma de desarrollo local en una compilación optimizada. No sustituye la aplicación familiar ni comparte su historial o sesiones. No publicar este APK como actualización oficial.

La alternativa PowerShell es `./VALIDAR-Y-CREAR-APK.ps1`.

## Actualización oficial

Se conserva el identificador `com.patagoniabrowser.patagonia_browser`. Para actualizar el APK familiar hace falta la misma clave privada de la versión anterior, que permanece en `.signing/` en tu computadora.

`VALIDAR-Y-CREAR-APK.ps1 -Modo Publicacion` exige `android/key.properties`, con las propiedades estándar `storeFile`, `storePassword`, `keyAlias` y `keyPassword`. `storeFile` se resuelve desde la carpeta android. Las claves y ese archivo se excluyen de Git. No se generó ni reemplazó una clave oficial durante esta revisión. El flujo previo de firma externa sigue disponible: sin key.properties y sin modo prueba, Gradle genera el APK sin firmar.

## Validación realizada

Flutter 3.47.2 y Dart 3.13.2 (misma revisión de Flutter que figura en el proyecto original). `flutter analyze --no-pub`: sin incidencias. `flutter test --no-pub`: 33 pruebas aprobadas. No se actualizaron dependencias.

Además: 14 pruebas DOM de YouTube con Node.js y jsdom 29.1.1. Verifican limpieza preventiva del valor inicial, `JSON.parse`, `fetch`, clones y XHR; respuesta SSAP sin botón; anuncios del feed; etiquetas en español/inglés/portugués; Shadow DOM; restauración del medio; idempotencia; aislamiento de dominios y reversión de APIs.

Para las pruebas DOM, con jsdom instalado en el entorno de desarrollo: `node --test test/youtube-protection.test.cjs`. jsdom no forma parte de la aplicación Android.

La versión 1.0.3+6 se compiló e instaló en Android, pero su reacción tardía no bloqueó el formato mostrado en la prueba real. La nueva 1.0.4+7 todavía requiere generar el APK con el lanzador incluido y comprobar exactamente ese anuncio previo en el teléfono.

Validación pendiente en el dispositivo: actualizar Patagonia Pruebas sin desinstalarla; abrir varios videos hasta provocar un anuncio; confirmar que “Saltar” se activa automáticamente o que el tramo termina enseguida; comprobar que el video solicitado conserva audio y velocidad; repetir con el escudo desactivado para confirmar la diferencia. YouTube cambia sus formatos con frecuencia, por lo que ningún filtro incorporado puede garantizar todos los anuncios futuros.

Referencias técnicas: [filtros rápidos actuales de uBlock Origin](https://github.com/uBlockOrigin/uAssets/blob/master/filters/quick-fixes.txt), [motor de bloqueo de Brave](https://github.com/brave/adblock-rust), [política de bloqueo de Brave](https://github.com/brave/brave-browser/wiki/Blocking-goals-and-policy), [audio de WebView](https://pub.dev/documentation/flutter_inappwebview/latest/flutter_inappwebview/InAppWebViewSettings/allowBackgroundAudioPlaying.html), [zona segura de íconos Android](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive).

## iPhone

Se conservan el proyecto iOS y las guías `IOS_RELEASE_CHECKLIST.md` y `APP_STORE_TEXT_ES.md`. Esta revisión contiene cambios Dart compartidos pero no se compiló ni probó iOS.
