# Patagonia Browser — estado del proyecto

Actualizado: 30 de septiembre de 2026 (revisión documental del issue #10; no se ejecutaron nuevas pruebas del navegador).

## Estado actual

Prototipo funcional de escritorio en desarrollo. La base de navegación de Alpha 0.1 está implementada y hay funciones de Alpha 0.2. No se considera una versión estable ni una auditoría de seguridad completa.

## Distribución y firma

- Windows **1.0.4** es la versión vigente, publicada el 7 de septiembre de 2026. Ver [descargas](DOWNLOADS.md).
- La solicitud inicial a SignPath Foundation, enviada el 8 de septiembre de 2026, no fue aprobada porque el proyecto todavía no presenta suficientes señales públicas de adopción y colaboración. Actualmente no existe un certificado ni un servicio de firma activo para Patagonia Browser. No hay fechas ni aprobación futura garantizadas.
- El instalador Windows 1.0.4 está sin firma de un proveedor reconocido y Windows puede advertir o bloquear su ejecución. Ver [política de firma](CODE_SIGNING.md) y [registro de la solicitud](docs/SIGNPATH_APPLICATION.md).

## Edición móvil fuera de `main`

La carpeta `mobile/` todavía no está publicada en `main`. La [publicación móvil 1.0.0](https://github.com/christianwilliams2085-ops/Patagonia-Browser/releases/tag/mobile-v1.0.0) ofrece un APK Android y un ZIP del proyecto de iPhone para Mac; esos adjuntos no constituyen código móvil integrado en esta rama. El proyecto de iPhone requiere compilación y firma en macOS con Xcode y una cuenta Apple; no es un instalador de iPhone. La firma Android es independiente de la de Windows.

## Implementado en escritorio

- Ventana Electron con páginas en WebContentsView y pestañas independientes.
- Versión portátil para Windows x64 con ejecutable, icono propio, perfil estable y acceso directo en la carpeta principal del proyecto.
- Instalador Squirrel para Windows x64 que se ejecuta por usuario sin requerir permisos de administrador, más un ZIP portátil e instrucciones para pruebas familiares.
- Icono oficial aplicado al ejecutable, al instalador y a los accesos directos, con variantes de 16, 20, 24, 32, 40, 48, 64, 128 y 256 píxeles.
- Nueva pestaña local con paisaje patagónico propio, buscador web, accesos a Google, YouTube, GitHub y Reddit, y hasta cuatro accesos personalizados persistentes.
- Barra de título integrada, pestañas redondeadas, barra de direcciones translúcida y Centro de privacidad lateral con el estado de protecciones implementadas.
- Bloqueo de anuncios y rastreadores con filtros integrados, actualización automática cada siete días, estadísticas por pestaña y excepciones guardadas por sitio.
- Barra de direcciones, búsqueda, atrás, adelante, recarga e inicio.
- Controles Atrás/Adelante habilitados según el historial de la pestaña activa. Recargar cambia a Detener carga mientras la página está cargando.
- Actualización de pestañas sin reconstruir sus controles ni recargar los iconos que no cambiaron; conservación del foco y desplazamiento a la pestaña seleccionada. Los botones de selección y cierre tienen nombres accesibles.
- Direcciones locales HTTP: localhost, subdominios .localhost y loopback IPv4/IPv6.
- Pantalla de error de carga y recuperación de pestañas bloqueadas o sin memoria.
- Aviso al cerrar con descargas pendientes; la opción predeterminada mantiene la ventana abierta.
- Una sola instancia por perfil: las aperturas adicionales recuperan la ventana existente.
- Favoritos persistentes con estrella, listado y eliminación.
- Historial persistente con búsqueda, eliminación y confirmación de borrado total.
- Descargas con progreso, cancelación y acceso a la carpeta del archivo. El listado no persiste entre ejecuciones.
- Guardado automático de URLs, orden y pestaña activa; restauración al iniciar. No restaura formularios ni el historial de navegación interno de cada pestaña.
- El cierre normal espera las escrituras pendientes de favoritos, historial, configuración y sesión antes de destruir la ventana. Los cambios de pestañas que llegan durante una escritura se incluyen antes de terminar el guardado. Si falla la sesión, se ofrece reintentar, volver al navegador o cerrar sin guardar; la opción predeterminada mantiene el navegador abierto.
- Configuración persistente: página de inicio y recuperación de pestañas al abrir.
- Aperturas de enlaces y formularios en otras pestañas, conservando la navegación nativa, POST y referencia cuando corresponde.
- Menú del navegador en español; la recarga y los controles actúan sobre la pestaña activa.
- Recuperación en orden inverso de las últimas diez pestañas cerradas por el usuario, desde Archivo o con Ctrl/Cmd+Mayús+T. Los cierres iniciados por una página y las direcciones no recargables no entran en esa lista.
- Permisos de sitios controlados explícitamente. Los nuevos avisos solo se muestran para la página principal de la pestaña activa, con HTTPS —o un servidor local HTTP— y el mismo origen visible. La opción predeterminada es bloquear; las decisiones se recuerdan por origen hasta cerrar Patagonia y separan cámara de micrófono. Los avisos pendientes se cancelan al navegar, recargar, cambiar de pestaña o cerrar la página; esto no revoca una decisión anterior.
- Un solo diálogo de permiso visible a la vez, solicitudes repetidas agrupadas y límites para evitar acumulaciones. Las notificaciones pueden reutilizar una autorización explícita del mismo origen. Las solicitudes desconocidas, las de marcos secundarios y la apertura de aplicaciones externas se bloquean.
- Búsqueda dentro de la página con contador, siguiente/anterior y cierre al cambiar de pestaña o navegar. Los resultados atrasados se descartan.
- Atajos: Ctrl/Cmd+L, T, Mayús+T, W, R, F, Tab; F3 y Mayús+F3; F5; Alt+flechas e Inicio. Ctrl/Cmd+Mayús+T reabre la última pestaña cerrada. Enter/Mayús+Enter recorre las coincidencias desde el campo de búsqueda y Escape cierra la barra.
- Asistente local que extrae texto y genera respuestas por reglas. No usa un modelo de IA ni envía consultas a un proveedor externo.

## Tecnología real

Electron, JavaScript, HTML/CSS, Node.js, Ghostery Adblocker, Mozilla Readability y jsdom. Favoritos, historial, sesión y excepciones de protección se guardan dentro del perfil local. React, TypeScript y SQLite figuran en documentos de diseño, pero no están incorporados al código actual.

## Verificación de esta revisión

Las comprobaciones siguientes son registros históricos de escritorio del 3 de septiembre de 2026, no resultados de esta revisión documental. No se presenta el análisis ni las pruebas móviles como verificables desde `main`, porque su código aún no está publicado aquí.

La [compilación Windows en GitHub Actions](https://github.com/christianwilliams2085-ops/Patagonia-Browser/actions/runs/34228558369) registrada para la solicitud de SignPath terminó correctamente; el registro documenta 148 pruebas aprobadas y un candidato sin firma. Esto no acredita una aprobación ni un certificado activo.

101 pruebas automatizadas aprobadas. Cubren el motor de bloqueo integrado contra publicidad y seguimiento conocidos, sus excepciones por dominio, los conteos y su interfaz, además de favoritos, historial, descargas, errores de carga, sesiones, navegación, configuración, permisos, pestañas cerradas, nueva pestaña, validación de emisores, atajos, menú y búsqueda. Incluyen pruebas con DOM simulado y una prueba del arranque y restauración con Electron simulado. Los diálogos de permisos y de fallo del guardado todavía requieren validación manual en Electron.

Las pruebas de cierre y persistencia comprueban escrituras lentas, cambios recibidos durante el guardado, un favorito pendiente al cerrar la ventana, fallos del disco, reintentos, cancelación del cierre y elección explícita de cerrar sin guardar. La protección del cierre se aplica a la salida normal de Patagonia; no garantiza finalizar escrituras ante un corte de energía, una terminación forzada o el apagado de Windows.

Se comprobó el navegador real en Windows después de reiniciar la versión actualizada: restauró las cinco pestañas y la selección original, mostró el menú en español y renderizó la página activa. Ctrl+F abrió la búsqueda; buscar Google mostró dos coincidencias, Enter avanzó y Mayús+Enter retrocedió. Ctrl+Tab cambió de pestaña y cerró la búsqueda; Ctrl+Mayús+Tab volvió a la pestaña original. También se observaron los controles Atrás/Adelante desactivados en pestañas restauradas sin historial interno. La aplicación quedó abierta. Estas comprobaciones son parciales y no sustituyen la validación completa de todos los flujos.

Ejecutar `npm test`. Iniciar con `npm start` después de instalar las dependencias con `npm ci`.

Tras actualizar el cierre con espera de guardados, se inició esa versión en Windows, se cerró normalmente y se volvió a abrir desde el acceso directo. Recuperó las cinco pestañas en el mismo orden, mantuvo seleccionada la quinta y mostró la página activa. Los fallos de disco y sus opciones de recuperación se comprobaron mediante pruebas automatizadas sobre archivos temporales.

El 3 de septiembre se verificó en la aplicación real la recuperación de pestañas cerradas: Ctrl+W cerró la quinta pestaña, dejó activa la cuarta y Ctrl+Mayús+T recuperó la página cerrada al final de la barra y volvió a activarla. El menú Archivo mostró la misma función con su atajo. Patagonia quedó abierto con las cinco pestañas.

El 3 de septiembre también se reinició la aplicación con la nueva identidad visual. Se comprobó en Windows la barra de título integrada, las pestañas restauradas, la nueva pestaña con fondo patagónico, buscador y accesos rápidos, el diálogo para agregar un acceso y la apertura y cierre del Centro de privacidad. La aplicación quedó abierta mostrando la nueva pestaña y el panel de privacidad.

La versión portátil se generó con Electron 43.1.1 para Windows x64 y se comprobó con la aplicación real. Abrió Google, indicó una pestaña guardada, cerró normalmente y, al volver a iniciarse desde el ejecutable final, recuperó esa pestaña. Luego se abrió una nueva pestaña y Patagonia quedó listo para usar. El paquete contiene 1935 archivos y el acceso directo apunta al ejecutable final.

También se construyó y ejecutó `Patagonia-Browser-Setup-1.0.0-Windows-x64.exe`. El instalador completó la instalación por usuario, abrió Patagonia con la identidad visual correcta y, tras cerrar y volver a abrir el programa instalado, recuperó la sesión. La carpeta de entrega familiar incluye el instalador, un ZIP portátil, instrucciones y hashes SHA-256. El instalador aún no tiene una firma digital comercial.

Después se incorporó el icono oficial elegido por Roma. Se extrajo el icono incrustado del nuevo ejecutable y del nuevo instalador y se confirmó visualmente que ambos contienen el diseño correcto.

La versión vigente de Windows es 1.0.4 y su instalador público se enlaza desde [DOWNLOADS.md](DOWNLOADS.md). Las entregas familiares locales y los ZIP portátiles anteriores son registros históricos, no paquetes 1.0.4 disponibles en `main`.

## Correcciones de esta revisión

- El borrador de una dirección deja de mostrarse al cambiar de pestaña.
- La escritura en curso se conserva ante actualizaciones de URL de la misma pestaña.
- El botón Ir conserva el texto a enviar después de perder el foco; Escape cancela la edición.
- Enter y Escape no envían ni descartan una dirección mientras se compone un carácter.
- Los comandos de navegación ignoran pestañas cuyo contenido ya fue destruido.
- Detener la carga recupera la dirección de la página que queda visible, sin sustituir los errores de carga existentes.
- localhost y direcciones loopback sin protocolo se abren por HTTP.
- Se retiraron los registros de títulos y fragmentos extraídos por el asistente.
- Se agregó el comando npm test.

## Pendientes

- Validar la nueva interfaz y la navegación real en otras plataformas antes de anunciarlas.
- Configuración avanzada, temas y modo privado.
- Bloqueo y gestión de ventanas emergentes; panel para revisar o revocar permisos sin cerrar la aplicación.
- Ampliar y validar el bloqueo de anuncios/rastreadores y los controles de privacidad implementados.
- Auditoría del aislamiento, la navegación y todos los canales IPC.
- Integración opcional de IA: elegir proveedor, consentimiento para enviar contenido y gestión segura de credenciales.
- Habilitar firma digital sólo si se obtiene aprobación y se cumplen las condiciones de la política; no hay certificado activo ni fecha comprometida. Las compilaciones de candidatos sin firma ya cuentan con un flujo de GitHub Actions.
- Actualizaciones de la aplicación y ampliación de la automatización de pruebas.
- Publicar e integrar el código móvil en `main` antes de documentar su compilación y pruebas como disponibles desde esta rama.
- Reconciliar los documentos de arquitectura y planificación con la implementación actual.

Los porcentajes históricos de implementación y las afirmaciones de seguridad de los documentos de planificación no son evidencia del estado del producto.

## Diagnóstico del arranque

El fallo también se reproduce con una ventana mínima de Electron 43.1.1 que no carga código de Patagonia: proceso GPU con código -1073741515, proceso de página con launch-failed (49) y ERR_FAILED. Desactivar la aceleración gráfica solo en la prueba no lo resolvió. Esto aísla el fallo al motor o al entorno de ejecución; no identifica todavía una biblioteca concreta ni demuestra un fallo en el arranque habitual del usuario.

Se agregó npm run diagnostico para repetir la comprobación mínima desde una terminal normal. Usa una página local, un perfil temporal separado y mantiene el aislamiento de Electron. Devuelve un código de error cuando no puede completar la carga.

El 2 de septiembre se observó Patagonia iniciado por el usuario: páginas web renderizadas, pestañas y panel lateral funcionando. Posteriormente se reinició correctamente desde un acceso directo de Windows al Electron instalado, pasando la carpeta del proyecto como argumento. El fallo de lanzamiento descrito arriba se reproduce desde el entorno de ejecución del agente; no impide ese arranque desde el escritorio. El acceso directo no modifica los datos ni las opciones de aislamiento del navegador.

## Referencia de aperturas

La integración usa createWindow y adopta el WebContents proporcionado por Electron para conservar la navegación nativa. Las aperturas diferidas reciben URL, referencia y datos POST. Referencia: https://www.electronjs.org/docs/latest/api/structures/window-open-handler-response y comportamiento contrastado con Electron 43.1.1.
