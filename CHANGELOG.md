# Changelog

Todos los cambios importantes de Patagonia Browser serán documentados en este archivo.

El formato está inspirado en "Keep a Changelog" y el proyecto seguirá Versionado Semántico cuando corresponda.

---

## [Sin publicar] - 2026-09-03

### Corregido

- El emblema de la pantalla principal queda centrado en computadora y celular, sin el borde duplicado de la edición móvil.
- El texto de privacidad se adapta a pantallas angostas sin desbordarse.
- El instalador de Windows excluye el proyecto móvil y su clave familiar.

- El cierre de pestañas y del navegador ya no intenta consultar el identificador de una página después de destruirla al usar el bloqueador.
- El cierre espera las escrituras pendientes de favoritos, historial, configuración y sesión antes de destruir la ventana. Las pulsaciones repetidas comparten el mismo guardado.
- El guardado de sesión incluye los cambios que llegan durante una escritura lenta y conserva los últimos cambios para reintentar después de un fallo.
- Los avisos de permisos se cancelan al recargar, navegar, cambiar de pestaña o cerrar la página. Los resultados atrasados no se guardan ni se responden dos veces.
- Los permisos se solicitan de uno en uno desde la pestaña activa, con límites para solicitudes repetidas y reintentos después de fallos del diálogo.
- Las comprobaciones de notificaciones sin pestaña asociada solo reutilizan decisiones explícitas del mismo origen. La apertura de aplicaciones externas, los permisos desconocidos y las solicitudes de marcos secundarios se bloquean.
- Las actualizaciones de títulos y carga conservan los controles, el foco y los iconos sin cambios de las pestañas.
- La barra de direcciones respeta la composición de caracteres antes de procesar Enter o Escape.
- Los comandos de navegación no acceden al contenido de pestañas destruidas.
- Recargar la interfaz vuelve a mostrar las pestañas existentes y el estado del panel lateral.
- La barra de direcciones descarta borradores al cambiar de pestaña y conserva la escritura en curso ante actualizaciones de la misma pestaña.
- Las direcciones locales sin protocolo usan HTTP en lugar de enviarse a una búsqueda.
- Se eliminaron los registros del contenido extraído por el asistente.

### Agregado

- Patagonia AI en Android y iPhone, accesible desde la barra superior y el menú, con resumen local de la página y consulta de título o dirección.
- Primera edición móvil compartida para Android y iPhone, con la identidad visual oficial, pestañas, favoritos, historial, modo de escritorio y Centro de Privacidad.
- APK Android 1.0.0 firmado para pruebas familiares y proyecto de iPhone preparado para compilar y firmar en Xcode.
- Protección móvil integrada contra dominios publicitarios, rastreadores, cookies de terceros y espacios publicitarios comunes.

- Bloqueador real de anuncios y rastreadores compatible con listas de EasyList y uBlock Origin, activo antes de abrir las páginas.
- Conteos reales por pestaña en el Centro de privacidad y control para activar o desactivar la protección en un sitio concreto.
- Motor de filtros integrado para proteger desde el primer inicio y actualización automática de sus listas cada siete días.
- Icono oficial elegido por Roma, generado en nueve resoluciones y aplicado al ejecutable, instalador y accesos directos de Windows.
- Instalador Squirrel para Windows x64, ejecutable por usuario sin permisos de administrador.
- Carpeta de entrega familiar con instalador, ZIP portátil, guía breve y hashes SHA-256.
- Integración reproducible con Electron Forge y NuGet 7.9.0 verificado por SHA-256.
- Versión portátil para Windows x64, icono propio, perfil estable y acceso directo en la carpeta principal del proyecto.
- Comando `npm run build:portable`, que crea el ejecutable y verifica los archivos esenciales del paquete.
- Nueva página de pestaña con paisaje patagónico propio, buscador, accesos rápidos y accesos personalizados persistentes.
- Nueva identidad visual azul oscuro con barra de título integrada, pestañas redondeadas, barra de direcciones translúcida y Centro de privacidad lateral.
- Reapertura de las últimas diez pestañas cerradas desde el menú Archivo o con Ctrl/Cmd+Mayús+T, sin registrar cierres iniciados por la página ni direcciones que no puedan volver a cargarse.
- Aviso ante un fallo al guardar las pestañas durante el cierre, con opciones de volver al navegador, reintentar o cerrar sin guardar.
- Control explícito de permisos de sitios con bloqueo predeterminado, validación de origen y confirmación temporal para cámara, micrófono, ubicación, notificaciones y otras capacidades conocidas.
- Botones Atrás/Adelante que reflejan el historial de la pestaña activa y opción de detener la carga desde la barra o el menú.
- Botones de selección y cierre de pestañas con nombres accesibles, recuperación de foco al cerrar y desplazamiento a la pestaña activa.
- Búsqueda dentro de la página con Ctrl+F, contador, botones y atajos para recorrer coincidencias. La barra se cierra con Escape, al cambiar de pestaña o navegar, y descarta resultados atrasados.
- Menú del navegador en español con recarga de la página activa y funciones de edición.
- Aperturas de enlaces y formularios dentro de la barra de pestañas, con soporte de segundo plano y conservación de POST/referencia.
- Eliminación del estado de pestañas cerradas por la propia página.
- Instancia única por perfil, con recuperación de la ventana al abrir otra vez.
- Confirmación de cierre si quedan descargas activas, evitando avisos duplicados.
- Recuperación manual de pestañas cuyo proceso falla, con mensaje específico de falta de memoria.
- Configuración persistente de página de inicio y restauración de pestañas.
- Atajos de teclado de navegación y pestañas, respetando la composición de caracteres.
- Validación de emisores en los canales IPC de navegación y asistente, CSP de la interfaz y bloqueo de navegación externa en la ventana principal.
- Diagnóstico de arranque independiente de Patagonia con perfil temporal y códigos de salida verificables.
- Comando npm test y cinco pruebas de regresión de navegación/barra de direcciones.

### Documentado

- Instalación real, primer inicio y reapertura del programa instalado comprobados en Windows. La firma digital comercial queda pendiente para la publicación general.
- Ejecución real del paquete portátil, navegación a Google y recuperación de la pestaña después de cerrar y volver a abrir.
- Nueva interfaz verificada en Electron sobre Windows: página de inicio, diálogo de accesos rápidos y apertura y cierre del Centro de privacidad.
- Recuperación de una pestaña cerrada comprobada en Windows mediante Ctrl+W y Ctrl+Mayús+T; la opción también se verificó en el menú Archivo.
- Cierre y reapertura de la versión con espera de guardados comprobados en Windows, conservando las cinco pestañas y la selección.
- Reinicio verificado en Windows desde un acceso directo, restauración de cinco pestañas y comprobación real del menú, búsqueda con coincidencias y cambio de pestañas por teclado.
- Estado real de navegación, favoritos, historial, descargas, sesiones y asistente local.
- 101 pruebas aprobadas; validación manual de diálogos de permisos y fallo del guardado, validación en otras plataformas y conexión a un modelo de IA pendientes.
 c
## [0.1.0] - En desarrollo

### Agregado

- Creación del repositorio oficial.
- README inicial del proyecto.
- Roadmap oficial.
- Definición de la visión del proyecto.
- Definición de la arquitectura inicial.
