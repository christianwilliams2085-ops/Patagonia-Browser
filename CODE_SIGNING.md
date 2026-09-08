# Code signing policy

## Estado

La solicitud al programa de SignPath Foundation fue enviada el 8 de septiembre de 2026. El formulario confirmó su recepción. Está pendiente de evaluación y todavía no existe una aprobación ni una firma de SignPath para Patagonia Browser.

Los instaladores actuales de Windows siguen sin firma de un proveedor reconocido. Esta política y la compilación de candidatos no cambian esa situación por sí solas.

## Responsable propuesto

Christian Williams, propietario del repositorio [christianwilliams2085-ops/Patagonia-Browser](https://github.com/christianwilliams2085-ops/Patagonia-Browser), será el autor, revisor y aprobador de las solicitudes de firma. Las contribuciones de terceros deberán ser revisadas por el mantenedor antes de incorporarse a una versión firmada.

Antes de habilitar firmas se deberá verificar la autenticación multifactor del responsable en GitHub y SignPath. Este documento no acredita que ese requisito ya esté configurado.

## Origen de los artefactos

El flujo [Windows - candidato para firma](.github/workflows/windows-candidate.yml) instala las dependencias de `package-lock.json`, ejecuta las pruebas y genera un instalador Windows x64 a partir del código del repositorio. GitHub registra el commit, el flujo y el resultado de cada ejecución.

Los artefactos se identifican expresamente como **sin firma**. Los candidatos producidos en una solicitud de cambios sirven para revisión y no se enviarán a producción ni a firma automáticamente. Para solicitar una firma de publicación se utilizará una compilación de una versión revisada en la rama principal o en una etiqueta de publicación.

## Condiciones para habilitar SignPath

1. Obtener la aceptación explícita de SignPath Foundation.
2. Configurar el repositorio, el flujo de compilación confiable, el alcance de los archivos y una política de firma en SignPath.
3. Definir con SignPath el tratamiento del ejecutable empaquetado con Electron y sus componentes de terceros. Sólo se firmarán artefactos autorizados para este proyecto; los componentes de terceros conservarán sus firmas de origen cuando las tengan.
4. Mantener las credenciales fuera del repositorio, usando los mecanismos de secretos de GitHub y SignPath.
5. Requerir la aprobación manual del mantenedor para cada solicitud de firma.
6. Verificar las firmas del instalador y de los ejecutables que contiene, y probar la instalación y el arranque en Windows con Control inteligente de aplicaciones activado, antes de anunciar una versión firmada.
7. Publicar la atribución y enlazar esta política desde la página de descargas cuando el servicio esté aprobado y en uso.

La atribución prevista, **sólo después de la aprobación y activación**, es:

> Free code signing provided by SignPath.io, certificate by SignPath Foundation.

El certificado del programa se emite a nombre de SignPath Foundation; no se debe presentar como un certificado emitido personalmente al mantenedor. Las condiciones y decisiones del proveedor determinan qué puede firmarse.

## Privacidad

La edición de Windows tiene una [política de privacidad específica](PRIVACY_WINDOWS.md). El navegador realiza conexiones a los sitios visitados, al buscador elegido y a los servicios de actualización de las listas de bloqueo. Por esa razón no se declara que toda conexión de red dependa de una orden manual individual.

## Referencias

- [Condiciones de SignPath Foundation](https://signpath.org/terms)
- [Solicitud al programa](https://signpath.org/apply)
- [Firmar aplicaciones para Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control)
