# Origen del código móvil

La base de este directorio es el proyecto compartido Flutter 1.0.0+3 del
archivo `Patagonia-Browser-iPhone-PROYECTO-PARA-MAC-1.0.0.zip`, publicado como
asset en [v1.0.3](https://github.com/christianwilliams2085-ops/Patagonia-Browser/releases/tag/v1.0.3).
El ZIP también contiene `android/`, las fuentes Dart, los assets, las pruebas
y la implementación Android vendorizada de `flutter_inappwebview`.

SHA-256 del ZIP original:
`9eab0ff1a20b1352e6a0c468b42a323f1253935d43eb69a5a3404517953e08a7`.

La importación conserva el proyecto móvil; omite el ejemplo del plugin
vendorizado. No incorpora APK, claves de firma ni directorios de compilación.
El commit de importación se mantiene separado de las correcciones del issue #12.

El proyecto requiere Dart >=3.13.2. El flujo de pruebas utiliza Flutter 3.47.7
(Dart 3.13.5), fijado al commit oficial
`abaf9c523780a608bd46686fd5e53740a07077f8`.

## Alcance de la protección de YouTube

- Filtra exclusivamente `playerAds`, `adPlacements` y `adSlots` en la respuesta
  inicial y las respuestas JSON de `/youtubei/v1/player` y `/youtubei/v1/next`
  obtenidas mediante fetch o XMLHttpRequest del mismo origen.
- Conserva `streamingData`, `videoDetails`, subtítulos y estado de reproducción.
- Pulsa botones de salto visibles y habilitados solamente dentro de un
  reproductor marcado como anuncio activo.
- No fuerza el tiempo, velocidad, volumen, silencio ni reproducción automática.
- Respeta excepciones por host, cambios de video sin recarga y cierres de página.

No garantiza eliminar anuncios integrados en el propio flujo de video,
respuestas con otro formato ni anuncios ya cargados sin botón de salto.
Esos casos requieren evidencia del dispositivo y no deben resolverse
bloqueando todos los servidores `youtube.com` o `googlevideo.com`.

## Comprobación manual pendiente antes de publicar un APK

En Android, registrar versión de WebView, compilación de Patagonia, URL del
video y si hay sesión iniciada. Comparar el mismo video con protección activa
y desactivada; confirmar primero que el control desactivado recibe publicidad.

Probar acceso directo y selección desde `m.youtube.com`, un segundo video sin
recargar, atrás/adelante, recarga, dos pestañas y cambio de protección. Verificar
que se reproduce el video solicitado, que avanza su tiempo, hay audio, y
funcionan pausa, búsqueda, volumen y pantalla completa. Repetir con anuncio
saltable, no saltable y un video sin anuncios. No usar solamente el contador
como evidencia de bloqueo.
