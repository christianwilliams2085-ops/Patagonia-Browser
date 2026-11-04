# Descargas de Patagonia Browser para Windows

Patagonia es un navegador de escritorio en desarrollo con navegación por pestañas, favoritos, historial local y bloqueo de anuncios y rastreadores.

## Windows x64

- [Descargar el instalador de Patagonia Browser 1.0.5](https://github.com/Roma-69/Patagonia-Browser/releases/download/v1.0.5/Patagonia-Browser-Setup.exe).
- [Ver la publicación 1.0.5](https://github.com/Roma-69/Patagonia-Browser/releases/tag/v1.0.5).
- [Consultar todas las versiones publicadas](https://github.com/Roma-69/Patagonia-Browser/releases).

La versión 1.0.5 fue publicada el 3 de noviembre de 2026. El instalador actual está **sin firma de un proveedor reconocido** y Windows puede bloquear su ejecución.

La publicación 1.0.5 sólo incluye `Patagonia-Browser-Setup.exe`; no contiene un ZIP portátil ni un archivo de hashes separado. Para verificar la descarga, su huella SHA-256 es:

`166416e088e31d07e743bf62f209c113094c81c6515ca7296dab6c1fd913cc3f`

En PowerShell: `Get-FileHash .\Patagonia-Browser-Setup.exe -Algorithm SHA256`.

## Android

- [Descargar Patagonia Browser para Android 1.1.0 (APK)](https://github.com/Roma-69/Patagonia-Browser/releases/download/movil-v1.1.0/Patagonia-Android-1.1.0-Publicacion.apk).
- [Ver la publicación](https://github.com/Roma-69/Patagonia-Browser/releases/tag/movil-v1.1.0).

Requiere Android 8 o posterior en un teléfono de 64 bits (arm64). Si ya tenés Patagonia Browser instalado, este APK lo actualiza y conserva tus favoritos. Para instalarlo, Android puede pedirte permiso para "instalar apps de esta fuente".

SHA-256: `22bc9716829d06f5ec8a50cd54abd7919aff843355816e36aadaa22eff1aad28`

En PowerShell: `Get-FileHash .\Patagonia-Android-1.1.0-Publicacion.apk -Algorithm SHA256`

## Code signing policy

La solicitud inicial a SignPath Foundation, enviada el 8 de septiembre de 2026, no fue aprobada por falta de suficientes señales públicas de adopción y colaboración, según el [issue #10](https://github.com/Roma-69/Patagonia-Browser/issues/10). Actualmente no existe un certificado activo ni un servicio de firma de SignPath para Patagonia Browser. No hay fechas ni aprobación futura garantizadas.

El instalador de Windows 1.0.5 no está firmado por SignPath.

La [Code signing policy](CODE_SIGNING.md) identifica al mantenedor, las responsabilidades de firma, el origen verificable de las compilaciones y las condiciones pendientes. La atribución del proveedor sólo correspondería si se obtuviera aprobación y el servicio estuviera activo.

## Privacidad y desinstalación

Consultá la [política de privacidad de Windows](PRIVACY_WINDOWS.md) antes de instalar. Para desinstalar, abrí Configuración de Windows, buscá Patagonia Browser en las aplicaciones instaladas y seleccioná Desinstalar. El perfil local puede conservarse; la política explica cómo eliminar sus datos.
