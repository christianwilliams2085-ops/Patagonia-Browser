# Plan: pasar Patagonia móvil (Android) a GeckoView + uBlock Origin

Fecha: 31-10-2026 · Estado: **opción A hecha en la rama `motor/geckoview-android` (versión 1.1.0+9).** La prueba de fuego anduvo en el Motorola con el modo "Textura", que es el que quedó.

Punto de partida: la prueba `prueba-geckoview` (GeckoView 159 + uBlock Origin 1.75.0) anduvo en el
Motorola y YouTube se vio sin anuncios. En iPhone la app sigue con WebKit, porque Apple no deja usar
otro motor.

---

## 1. Cómo está hoy la app (lo que no queremos romper)

| Cosa | Dónde vive hoy | Comentario |
|---|---|---|
| Pestañas | Memoria, mientras la app está abierta | No se guardan al cerrar, así que no hay nada que migrar |
| Favoritos | `SharedPreferences`, clave `favorites` | Lista de `{title, url}` en JSON |
| Historial | `SharedPreferences`, clave `history` | Igual que favoritos |
| Protección por sitio | `SharedPreferences`, clave `unprotectedHosts` + bloqueador propio (fork de `flutter_inappwebview_android` en `mobile/vendor`) | Hoy la hace el bloqueador propio de Patagonia |
| Modo escritorio | `preferredContentMode` de InAppWebView, por pestaña | |
| Asistente | Dart (`local_assistant.dart`), lee el texto de la página con JavaScript | GeckoView **no tiene** un "ejecutar JavaScript" directo |
| Permisos (cámara, micrófono, ubicación) | `MainActivity.kt` + `web_permissions.dart` | |
| Audio de fondo | `allowBackgroundAudioPlaying` del WebView | |
| Interfaz | `browser_shell.dart` (~2000 líneas de Flutter) | Compartida con iPhone |

Datos de compilación hoy: paquete `com.patagoniabrowser.patagonia_browser`, versión `1.0.5+8`
(versionCode 8), `minSdk 24`, APK de unos **54 MB** con tres arquitecturas (arm64, arm 32 bits, x86_64).

---

## 2. Cosas que cambian SÍ O SÍ con GeckoView (en cualquier opción)

Esto conviene saberlo antes de comparar, porque pasa con A, con B y con C:

1. **Las sesiones de los sitios se pierden una vez.** GeckoView tiene su propio "cajón" de cookies,
   separado del WebView de Android. Después de actualizar, hay que volver a iniciar sesión en
   Gmail, YouTube, el banco, etc. **Favoritos e historial no se pierden** (están guardados aparte, ver punto 5).
2. **Android 8 como mínimo.** GeckoView pide `minSdk 26` (Android 8.0). Hoy la app acepta Android 7.
   *Confirmado el 31-10-2026: todos los celulares de la familia son de 2020 en adelante, con Android 10
   o más. Ninguno queda afuera.*
3. **Celulares de 32 bits.** La prueba se armó solo para arm64. *Confirmado: todos los de la familia
   son de 64 bits, así que alcanza con arm64 (y el APK pesa menos).*
4. **El bloqueador propio de Android se jubila.** El fork `mobile/vendor/flutter_inappwebview_android`,
   el script de YouTube y las reglas propias dejan de usarse en Android: el trabajo lo hace uBlock Origin.
   En iPhone se quedan como están.
5. **La protección por sitio pasa a ser la de uBlock Origin.** Como uBO va "tal cual" (sin tocarlo),
   el botón del escudo de Patagonia va a abrir el panelcito de uBO, con su botón grande de
   encendido/apagado para ese sitio. La lista vieja `unprotectedHosts` no se puede cargar sola en uBO
   sin modificarlo; la idea es mostrar una vez un aviso con los sitios que tenían la protección
   apagada, para volver a apagarla con un toque. (Normalmente son 2 o 3 sitios.)
6. **El asistente necesita una mini extensión propia.** Para leer el texto de la página, Patagonia
   trae una extensión chiquita suya (aparte de uBO) que le pasa el texto a la app. Es poco código.
7. **Hay que actualizar seguido.** GeckoView es el motor de Firefox: sale versión nueva más o menos
   cada 4 semanas, con arreglos de seguridad. Un navegador que se queda viejo es un riesgo. Hay que
   sacar una versión de Patagonia más o menos una vez por mes (cambiar un número y compilar, si no
   se rompió nada).
8. **Descargas de archivos y video en pantalla completa** hay que programarlos a mano en GeckoView
   (no vienen solos). Hoy la app no tiene descargas propias, así que no se pierde nada, pero hay que
   probarlo.
9. **Audio con la pantalla bloqueada**: en GeckoView no es un interruptor; hay que usar su
   `MediaSession` y probarlo bien en el teléfono.

---

## 3. Las opciones

### Opción A — Seguir con Flutter y meter GeckoView como vista nativa (plugin propio en Kotlin)

**En criollo:** la "carrocería" (barra, pestañas, menú, favoritos, inicio, asistente) sigue siendo la
misma app Flutter de hoy, para Android y para iPhone. Solo se cambia el "motor" en Android: en vez del
WebView de Chrome, adentro de la ventana va GeckoView. Para eso se escribe un plugin en Kotlin
(`patagonia_gecko`) que habla con Flutter por un "canal" (abrir página, atrás, adelante, recargar, avisar
el título, el progreso, la dirección, pedir permisos, etc.).

- **Cuánto trabajo:** medio-alto. Unas **3 a 5 semanas** de trabajo tranquilo (sesiones de a poco).
  - Plugin Kotlin con GeckoView: lo más grande.
  - En Dart, separar `browser_shell.dart` para que no dependa directo de InAppWebView: una "interfaz de
    motor" con dos versiones (WebKit para iPhone, Gecko para Android).
- **Qué se pierde o se rompe:**
  - Pestañas: se mantienen (cada pestaña = una `GeckoSession`). Gastan algo más de memoria.
  - Favoritos e historial: **se mantienen sin migrar nada**, porque siguen en el mismo `SharedPreferences`.
    Es la gran ventaja de esta opción.
  - Protección por sitio: cambia al panel de uBO (punto 2.5).
  - Modo escritorio: se mantiene (GeckoView lo trae: `USER_AGENT_MODE_DESKTOP`).
  - Asistente: se mantiene; cambia solo cómo lee el texto (punto 2.6). La lógica en Dart queda igual.
  - **Riesgo propio de esta opción:** meter una vista nativa pesada adentro de Flutter a veces trae
    mañas: tirones al hacer scroll, el teclado que no aparece, la pantalla completa del video que se ve
    mal, o problemas al girar el celular. GeckoView se puede configurar para dibujar en `TextureView`,
    que es lo que mejor se lleva con Flutter, pero **hay que probarlo antes de comprometerse** (ver Fase 1).
- **Mantenimiento a futuro:** una sola interfaz para Android y iPhone (un arreglo sirve para los dos).
  Pero hay dos idiomas (Dart y Kotlin) y un "puente" entre ellos que hay que cuidar cuando cambia
  Flutter o GeckoView. Hay que actualizar GeckoView todos los meses (punto 2.7).
- **Peso del APK:** Flutter (~12 MB) + GeckoView (~70–90 MB) + uBO (~4 MB). Solo arm64:
  **unos 85–105 MB**. La prueba en modo debug pesó 108 MB; la versión final (release, optimizada)
  debería quedar algo abajo. Si se agrega 32 bits, sube bastante.

### Opción B — Rehacer la app de Android en Kotlin nativo, Flutter solo para iPhone

**En criollo:** se hace una app de Android nueva desde cero, en Kotlin, como la prueba que ya anduvo
pero completa. La de iPhone sigue en Flutter, sola.

- **Cuánto trabajo:** alto. Unas **5 a 8 semanas**. Hay que volver a hacer toda la interfaz que hoy
  está en Flutter (las ~2000 líneas de `browser_shell.dart`: barra, pestañas, menú, inicio, favoritos,
  historial, centro de privacidad, asistente).
- **Qué se pierde o se rompe:**
  - Pestañas, modo escritorio, asistente: hay que rehacerlos, pero GeckoView los soporta bien.
  - **Favoritos e historial: hace falta un "mudador".** La app nueva tiene que leer, la primera vez que
    abre, el archivo donde Flutter los guardaba (`FlutterSharedPreferences.xml`, con las claves
    `flutter.favorites` y `flutter.history`, en el formato raro que usa el plugin) y pasarlos a su
    propio guardado. Se puede hacer bien, pero si sale mal **la familia pierde los favoritos**. Hay que
    probarlo con una copia real antes de repartir.
  - Protección por sitio: igual que en A (panel de uBO).
  - Se pierde que Android y iPhone se vean y anden igual: cada arreglo hay que hacerlo dos veces.
- **Mantenimiento a futuro:** es la forma "oficial" de usar GeckoView (como Firefox para Android), así
  que anda más fino y hay más ejemplos. Pero quedan **tres programas distintos** para mantener:
  escritorio (Electron), Android (Kotlin) e iPhone (Flutter). Para una sola persona es mucho.
- **Peso del APK:** sin Flutter, **unos 75–95 MB** solo arm64. Unos 10 MB menos que A.

### Opción C — Kotlin nativo usando los "Android Components" de Mozilla

**En criollo:** como la B, pero en vez de hacer todo a mano se usan las piezas armadas que Mozilla
publica para hacer navegadores (las mismas con las que está hecho Firefox para Android): barra de
direcciones, pestañas, historial, descargas, permisos, pantalla completa, extensiones.

- **Cuánto trabajo:** medio-alto (**4 a 6 semanas**), pero con una curva de aprendizaje empinada: son
  muchas piezas, con su forma de trabajar, y cambian seguido.
- **Qué se pierde:** lo mismo que en B (hay que mudar favoritos e historial y rehacer la interfaz para
  que se parezca a Patagonia). Ganás descargas, pantalla completa y permisos ya resueltos.
- **Mantenimiento:** depende mucho de Mozilla; cuando cambian sus piezas hay que adaptarse. Igual que
  B, quedan tres programas.
- **Peso:** el más pesado de los nativos, **unos 90–110 MB**.

> Descarté otras ideas, por ejemplo hacer el fork completo de Firefox para Android (Fenix): es
> enorme, compila durante horas y cambiarle la cara a Patagonia es un trabajo muy grande.

### Comparación rápida

| | A: Flutter + plugin Gecko | B: Kotlin a mano | C: Kotlin + piezas de Mozilla |
|---|---|---|---|
| Trabajo | Medio-alto (3–5 sem.) | Alto (5–8 sem.) | Medio-alto (4–6 sem.), cuesta aprender |
| Favoritos/historial | **Se quedan donde están** | Hay que mudarlos | Hay que mudarlos |
| Pestañas / escritorio / asistente | Se mantienen | Se rehacen | Se rehacen (más fácil) |
| Protección por sitio | Pasa al panel de uBO | Igual | Igual |
| Riesgo técnico principal | Vista nativa adentro de Flutter | Rehacer todo | Depender de Mozilla |
| Programas a mantener | 2 (escritorio + móvil) | 3 | 3 |
| APK (solo arm64) | ~85–105 MB | ~75–95 MB | ~90–110 MB |

---

## 4. Condiciones obligatorias (valen para cualquier opción)

### 4.1 Que actualice encima de la que tiene la familia
- Paquete: **`com.patagoniabrowser.patagonia_browser`**, igual que hoy. (Ojo: el modo "preview" le
  agrega `.preview` y firma con la clave de debug; esa NO sirve para actualizar.)
- Misma clave de firma: la de la familia. **Yo no toco `mobile/.signing` ni creo `key.properties`.**
  La firma final la hacés vos con el mismo mecanismo de siempre.
- Número de versión más alto: pasar a **`1.1.0+9`** (versionCode 9 o más). Hay que fijarlo a mano,
  porque Flutter a veces suma 1000/2000 según la arquitectura y después no se puede bajar.
- **Comprobaciones antes de repartir:**
  1. Ver en un celular de la familia qué paquete exacto y qué firma tiene instalada
     (con `adb shell pm list packages` y `apksigner verify --print-certs`).
  2. Comparar la huella SHA-256 del certificado del APK nuevo con la del 1.0.5 instalado. Si no son
     iguales, **no se reparte.**
  3. Anotar versión de Android y arquitectura de cada celular de la familia (puntos 2.2 y 2.3).
  4. Probar la actualización encima del 1.0.5 en **un celular de prueba con favoritos e historial
     cargados**, y ver que siguen ahí. Recién después, a la familia.

### 4.2 uBlock Origin tal cual, con créditos y licencia
- Se incluye el `.xpi` **oficial, sin modificar** (el firmado por Mozilla en addons.mozilla.org), con
  su número de versión en el nombre, como en la prueba.
- Pantalla nueva **"Acerca de > Licencias"** en la app, que muestre:
  - **uBlock Origin**: Raymond Hill y colaboradores, licencia **GPLv3**, texto completo de la licencia
    y enlace al código fuente de esa versión exacta (`github.com/gorhill/uBlock`, etiqueta de la versión).
  - **GeckoView**: Mozilla, licencia **MPL 2.0**.
  - Las listas de filtros que trae uBO (EasyList, etc.) con sus licencias.
- Se agrega lo mismo en un archivo del repo (`mobile/LICENCIAS-TERCEROS.md`) y en el README.
- No se usa el nombre "Firefox" ni su logo para Patagonia (son marcas de Mozilla). Decir "usa el motor
  GeckoView de Mozilla" está bien.
- Patagonia es MIT; meter uBO adentro sin modificarlo como un programa aparte es compatible, siempre
  que se muestre su licencia y dónde está su código.
- Para actualizar uBO: en cada versión de Patagonia se revisa si salió uBO nuevo y se cambia el `.xpi`.
  Las listas de filtros se actualizan solas por internet.

### 4.3 Aviso de actualización dentro de la app
Como GeckoView necesita actualizarse más o menos una vez por mes por seguridad, la app tiene que avisar
sola cuando hay versión nueva.

- **Qué revisa:** los Releases públicos del repo en GitHub
  (`api.github.com/repos/christianwilliams2085-ops/Patagonia-Browser/releases`). No necesita cuenta ni
  contraseña, y no manda ningún dato de la persona (GitHub solo ve la conexión, como cualquier página).
- **Cómo distingue móvil de escritorio:** el repo tiene versiones de las dos cosas. Los Releases de
  Android usan etiquetas que empiezan con **`mobile-v`** (como la `mobile-v1.0.0` que ya existe), por
  ejemplo `mobile-v1.1.0`. La app ignora las demás y también los Releases marcados como "borrador" o
  "pre-release".
- **Cuándo revisa:** al abrir la app, como mucho una vez por día. Sin internet, no pasa nada y no molesta.
- **Qué muestra:** una franja arriba: "Hay una versión nueva de Patagonia (1.1.1). Actualizá para
  seguir protegido." con dos botones: **Ver** (abre la página del Release en GitHub, donde está el APK
  y qué cambió) y **Más tarde** (no vuelve a avisar de esa misma versión hasta el día siguiente).
  Si es una actualización de seguridad marcada como importante en el texto del Release, se avisa con
  más fuerza.
- **Qué NO hace (a propósito):** no descarga ni instala sola. Instalar sola pide un permiso especial de
  Android y es más riesgoso; la persona baja el APK desde la página oficial y Android le pide confirmar.
  Como el APK nuevo tiene la misma firma, actualiza encima sin perder nada.
- **Seguridad:** solo abre direcciones de `github.com/christianwilliams2085-ops/Patagonia-Browser`.
  En cada Release se publica también la huella SHA-256 del APK.
- **Privacidad:** se puede apagar en el Centro de Privacidad ("Buscar actualizaciones"), y ahí se
  explica qué consulta hace.
- **Para iPhone:** se usa el mismo código, pero el aviso puede quedar apagado hasta que haya una forma
  de repartir la app en iPhone.
- **Proceso de cada versión** (para que el aviso funcione): compilar → firmar → crear el Release
  `mobile-vX.Y.Z` en GitHub con el APK, la huella SHA-256 y qué cambió.

### 4.4 Rama nueva, nunca directo a main
- Rama: **`motor/geckoview-android`**, creada desde `main` actualizado.
- Commits chicos, uno por paso, con explicación.
- Nada de push sin tu OK. Al final, Pull Request para que lo revises antes de juntarlo con `main`.

---

## 5. Pasos (para la opción recomendada, A)

**Fase 0 — Verificaciones (½ día, sin código)**
- Revisar paquete, firma, versión de Android y arquitectura de los celulares de la familia (4.1).
- Crear la rama `motor/geckoview-android`.

**Fase 1 — Prueba de fuego: GeckoView adentro de Flutter (2–3 días) → SÍ o NO**
- Un plugin mínimo que muestre GeckoView en una pantalla Flutter, con uBO.
- Probar en el Motorola: scroll, teclado, YouTube en pantalla completa, girar el celular, audio con
  pantalla bloqueada, abrir y cerrar 5 pestañas.
- **Si algo de eso no tiene arreglo, se para acá y se pasa a la opción B**, sin haber perdido mucho.

**Fase 2 — "Interfaz de motor" en Dart (3–5 días)**
- Separar `browser_shell.dart` para que hable con un "motor" abstracto. iPhone sigue con InAppWebView;
  Android usa el plugin Gecko. Correr `flutter test` para confirmar que iPhone no cambió.

**Fase 3 — Funciones una por una en el plugin (1–2 semanas)**
- Navegar, atrás/adelante, recargar, título, progreso, dirección → pestañas → modo escritorio →
  permisos (reutilizando el código de `MainActivity.kt`) → ventanas nuevas → pantalla completa →
  audio de fondo → descargas.

**Fase 4 — uBO, escudo y asistente (3–5 días)**
- uBO instalado al primer arranque; botón del escudo abre su panel.
- Aviso único con los sitios de `unprotectedHosts`.
- Mini extensión propia para que el asistente lea el texto de la página.
- Pantalla "Acerca de > Licencias".
- Aviso de actualización con los Releases de GitHub (punto 4.3).

**Fase 5 — Limpieza (1–2 días)**
- Sacar de Android el bloqueador propio y el script de YouTube (quedan para iPhone).
- Actualizar README, pruebas y `minSdk 26`.

**Fase 6 — Entrega (1–2 días)**
- Versión `1.1.0+9`, compilar, firmar (vos), comparar huella de firma, probar actualización encima del
  1.0.5 en un celular de prueba, después familia. Pull Request a `main` con tu OK.

---

## 6. Recomendación

**Opción A (seguir con Flutter + plugin GeckoView), con la Fase 1 como "prueba de fuego", y la
opción B como plan de reserva si esa prueba sale mal.**

Por qué:
1. **Es la más segura para los favoritos y el historial de la familia**: quedan exactamente donde
   están, no hay que mudar nada. Es la condición más delicada que pusiste, y A la cumple sin riesgo.
2. **Una sola interfaz para Android y iPhone.** Un arreglo o una función nueva se hace una vez. Con B
   o C pasarías a mantener tres programas (escritorio, Android, iPhone), que para una persona es mucho,
   sobre todo sumando la actualización mensual de GeckoView.
3. **Menos trabajo** que rehacer todo, y la mayor parte de lo que ya anda (pestañas, modo escritorio,
   asistente, inicio, centro de privacidad) se aprovecha.
4. **El riesgo principal de A se mide rápido y barato:** en 2–3 días de la Fase 1 sabemos si GeckoView
   se lleva bien con Flutter en tu Motorola. Si no, pasamos a B sabiendo exactamente por qué, y lo
   hecho en la Fase 0 sirve igual.

Lo que hay que aceptar con cualquier opción: el APK sube de ~54 MB a ~90–100 MB, hay que volver a
iniciar sesión en los sitios una vez, y hay que sacar versión más o menos una vez por mes para seguir
seguro (para eso está el aviso de actualización del punto 4.3). Los celulares de la familia (Android 10
o más, 64 bits) entran todos.
