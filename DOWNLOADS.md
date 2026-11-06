# Descargas de Patagonia Browser para Windows

Patagonia es un navegador de escritorio en desarrollo con navegación por pestañas, favoritos, historial local y bloqueo de anuncios y rastreadores.

## Windows x64

- [Descargar el instalador de Patagonia Browser 1.0.6](https://github.com/Roma-69/Patagonia-Browser/releases/download/v1.0.6/Patagonia-Browser-Setup.exe).
- [Ver la publicación 1.0.6](https://github.com/Roma-69/Patagonia-Browser/releases/tag/v1.0.6).
- [Consultar todas las versiones publicadas](https://github.com/Roma-69/Patagonia-Browser/releases).

La versión 1.0.6 fue publicada el 6 de noviembre de 2026. El instalador actual está **sin firma de un proveedor reconocido** y Windows puede bloquear su ejecución.

**Desde la 1.0.6, Patagonia se actualiza solo.** Si tenés la 1.0.5 o anterior, instalá la 1.0.6 a mano una única vez; las versiones siguientes llegan automáticamente.

La publicación 1.0.6 incluye `Patagonia-Browser-Setup.exe` y, para la actualización automática, `RELEASES` y `PatagoniaBrowser-1.0.6-full.nupkg`. Para verificar el instalador, su huella SHA-256 es:

`8aa86dd1e149f4c525de5086153b23792219998e7d9a56e5a4ef4d220b46e23a`

En PowerShell: `Get-FileHash .\Patagonia-Browser-Setup.exe -Algorithm SHA256`.

## Android

- [Descargar Patagonia Browser para Android 1.1.0 (APK)](https://github.com/Roma-69/Patagonia-Browser/releases/download/movil-v1.1.0/Patagonia-Android-1.1.0-Publicacion.apk).
- [Ver la publicación](https://github.com/Roma-69/Patagonia-Browser/releases/tag/movil-v1.1.0).

Requiere Android 8 o posterior en un teléfono de 64 bits (arm64). Si ya tenés Patagonia Browser instalado, este APK lo actualiza y conserva tus favoritos. Para instalarlo, Android puede pedirte permiso para "instalar apps de esta fuente".

SHA-256: `22bc9716829d06f5ec8a50cd54abd7919aff843355816e36aadaa22eff1aad28`

En PowerShell: `Get-FileHash .\Patagonia-Android-1.1.0-Publicacion.apk -Algorithm SHA256`

## Code signing policy

La solicitud inicial a SignPath Foundation, enviada el 8 de septiembre de 2026, no fue aprobada por falta de suficientes señales públicas de adopción y colaboración, según el [issue #10](https://github.com/Roma-69/Patagonia-Browser/issues/10). Actualmente no existe un certificado activo ni un servicio de firma de SignPath para Patagonia Browser. No hay fechas ni aprobación futura garantizadas.

El instalador de Windows 1.0.6 no está firmado por SignPath.

La [Code signing policy](CODE_SIGNING.md) identifica al mantenedor, las responsabilidades de firma, el origen verificable de las compilaciones y las condiciones pendientes. La atribución del proveedor sólo correspondería si se obtuviera aprobación y el servicio estuviera activo.

## Privacidad y desinstalación

Consultá la [política de privacidad de Windows](PRIVACY_WINDOWS.md) antes de instalar. Para desinstalar, abrí Configuración de Windows, buscá Patagonia Browser en las aplicaciones instaladas y seleccioná Desinstalar. El perfil local puede conservarse; la política explica cómo eliminar sus datos.
