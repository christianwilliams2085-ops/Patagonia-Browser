# Patagonia Browser para móviles

Aplicación móvil de Patagonia Browser con un proyecto compartido para Android y iPhone.

## Funciones disponibles

- Pantalla de inicio con el paisaje y el icono oficial de Patagonia.
- Barra para buscar en Google o escribir una dirección.
- Pestañas que se pueden crear, seleccionar y cerrar.
- Atrás, adelante, inicio, recarga y detención de carga.
- Favoritos e historial guardados localmente en el teléfono.
- Patagonia AI para resumir la página abierta y consultar su título o dirección sin enviar su contenido fuera del teléfono.
- Modo de sitio de escritorio.
- Centro de Privacidad por sitio.
- Bloqueo de dominios publicitarios y rastreadores conocidos, bloqueo de cookies de terceros y limpieza visual de espacios publicitarios.
- Solicitud visible antes de conceder permisos web.

## Android

El APK familiar está en:

`../dist/PARA COMPARTIR - PATAGONIA MOVIL 1.0.0/Patagonia-Browser-Android-1.0.0.apk`

Es una compilación optimizada, compilación 3, firmada con la clave familiar de Patagonia y compatible con Android 7 o posterior. Para instalarla, copiá el APK al teléfono, abrilo y permití la instalación desde esa aplicación cuando Android lo solicite.

La clave privada usada para firmar esta edición permanece en `.signing/`, fuera del control de versiones. Debe conservarse para que futuras versiones puedan instalarse como actualización.

## iPhone

El proyecto de Xcode está preparado en `ios/` para iPhone con iOS 15 o posterior. Incluye el icono y la pantalla de inicio oficiales, permisos descriptivos, firma automática y el manifiesto de privacidad solicitado por Apple.

La guía completa para instalarlo desde una Mac y distribuirlo mediante TestFlight está en [`IOS_RELEASE_CHECKLIST.md`](IOS_RELEASE_CHECKLIST.md). El texto preparado para App Store Connect está en [`APP_STORE_TEXT_ES.md`](APP_STORE_TEXT_ES.md).

Apple exige macOS con Xcode para compilar y firmar la aplicación para un iPhone físico. Una cuenta personal permite pruebas en dispositivos propios; TestFlight y la App Store requieren una membresía activa del Apple Developer Program.

## Verificación histórica de 1.0.0+3

- `flutter analyze`: sin errores ni avisos del código de Patagonia.
- `flutter test`: 14 pruebas aprobadas, incluidas la alineación del emblema, la apertura de Patagonia AI y sus respuestas locales.
- APK compilado con SDK 36, versión 1.0.0 y Android mínimo 7.
- Firma APK v2 y v3 verificada con una clave RSA de 4096 bits.
- Nombre, icono, versión y permisos comprobados dentro del APK.
- Iconos de iPhone generados en todos los tamaños y `Info.plist` validado como XML.
- Manifiesto de privacidad y pantalla de lanzamiento de iPhone incorporados.
- Flujo de GitHub Actions preparado para compilar con Xcode 26 en un simulador.

La ejecución en un teléfono físico sigue siendo la comprobación final antes de compartirla ampliamente.

## Correcciones y pruebas de YouTube

El código incorpora las correcciones del issue #12; no cambia los APK ya
publicados. Ver [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md) para el origen del
proyecto y las limitaciones de la protección.

```sh
flutter pub get
flutter analyze
flutter test
```

Desde la raíz del repositorio, `npm ci` y `npm test` ejecutan también las
pruebas del script real y del motor Java Android. Se requiere Node compatible
con package.json y un JDK 17 o posterior. La prueba Java simula las clases
del framework Android y ejecuta las reglas reales; no sustituye un WebView.

Antes de distribuir una nueva versión, probar la matriz manual de
SOURCE_PROVENANCE.md en Android. Los anuncios sin botón de salto o integrados
en el flujo de video pueden requerir otra estrategia y registros reales.
