# Cómo armar Patagonia Browser

Guía paso a paso para generar los tres entregables desde este repositorio:

1. El **instalador de Windows** (`Patagonia-Browser-Setup.exe`).
2. El **APK de prueba** de Android ("Patagonia Pruebas", se instala aparte).
3. El **APK oficial firmado** ("Patagonia Browser", actualiza la app ya instalada).

Todos los comandos se escriben en **PowerShell**, parados en la carpeta del repositorio
(`Patagonia-Browser-Git`), salvo que se indique otra cosa.

> Versión actual: **1.0.5** en escritorio (`package.json`) y **1.0.5+8** en móvil
> (`mobile/pubspec.yaml`). Si cambiás la versión, cambiala en los dos lugares.

---

## Antes de empezar (una sola vez)

| Herramienta | Para qué | Cómo comprobarla |
|---|---|---|
| Node.js 22.12 o más nuevo | Escritorio | `node --version` |
| Flutter 3.47.7 | Android | `flutter --version` |
| JDK 17 (el de Android Studio sirve) | Android y la prueba del motor Java | `flutter doctor -v` muestra la ruta |
| Android SDK 36 | Android | `flutter doctor` |

Si `java` no está en el PATH, definí `JAVA_HOME` en la terminal antes de las pruebas:

```powershell
$env:JAVA_HOME = "C:\ruta\al\jdk-17"   # la que muestra flutter doctor -v
```

---

## 1. Instalador de Windows

```powershell
npm ci                 # instala las dependencias exactas del package-lock.json
npm test               # tienen que pasar todas
npm run make:windows   # arma el instalador
```

Resultado:

```
out-oficial\make\squirrel.windows\x64\Patagonia-Browser-Setup.exe
```

Junto al `.exe` quedan `PatagoniaBrowser-1.0.5-full.nupkg` y `RELEASES`, que Squirrel usa
para actualizaciones. Para compartir con la familia alcanza con el `.exe`.

El instalador **no está firmado** por un proveedor reconocido: Windows puede mostrar
"Windows protegió tu PC". Ver [CODE_SIGNING.md](CODE_SIGNING.md).

**Versión portátil** (sin instalar, una carpeta que se copia entera):

```powershell
npm run build:portable
```

Queda en `dist\Patagonia Browser-win32-x64\Patagonia Browser.exe`.

> Los `.exe`, `.nupkg` y `.zip` **nunca** se suben a Git (están en `.gitignore`).
> Se publican en GitHub → Releases.

---

## 2. APK de prueba (Android)

Se instala como **"Patagonia Pruebas"** (`com.patagoniabrowser.patagonia_browser.preview`),
separado de la app oficial, y se firma con la clave de depuración de Android Studio.
No necesita ninguna contraseña.

Opción fácil: doble clic en `mobile\CREAR-APK-PRUEBA.cmd`.

Opción a mano:

```powershell
cd mobile
.\VALIDAR-Y-CREAR-APK.ps1 -Modo Prueba
```

El script limpia, descarga dependencias, corre `flutter analyze` y `flutter test`, y arma el APK
con `PATAGONIA_PREVIEW=1`. Resultado:

```
mobile\entrega-android\Patagonia-Android-1.0.5-Prueba.apk
```

---

## 3. APK oficial firmado (Android)

Este APK **actualiza** la app "Patagonia Browser" que ya está instalada en los teléfonos.
Para eso tiene que firmarse **siempre con la misma clave original**, que está en
`mobile\.signing\` (fuera de Git). Si se pierde esa clave o su contraseña, no hay forma de
publicar actualizaciones: los teléfonos tendrían que desinstalar e instalar de nuevo.

> **Nunca** crees una clave nueva, **nunca** subas `mobile\.signing\` ni `key.properties` a Git
> y **nunca** pegues la contraseña en un chat, un issue o un commit.

### Paso a paso

1. Abrí **Bitwarden** y buscá la entrada de la clave de Android de Patagonia
   (contraseña del almacén, contraseña de la clave y alias).

2. Creá el archivo **temporal** `mobile\android\key.properties` con este contenido
   (reemplazá lo que está entre `<...>`; el archivo `.jks` es el que está en `mobile\.signing\`):

   ```properties
   storeFile=../.signing/<nombre-del-archivo>.jks
   storePassword=<contraseña del almacén, de Bitwarden>
   keyAlias=<alias, de Bitwarden>
   keyPassword=<contraseña de la clave, de Bitwarden>
   ```

   La ruta de `storeFile` se resuelve desde `mobile\android`, por eso sube un nivel
   (`..`) para llegar a `mobile\.signing`.

   Para crearlo sin que la contraseña quede en el historial de PowerShell, usá el Bloc de notas:

   ```powershell
   notepad mobile\android\key.properties
   ```

3. Comprobá que Git **no** lo ve (tiene que decir que está ignorado):

   ```powershell
   git check-ignore -v mobile\android\key.properties
   ```

4. Armá el APK oficial:

   ```powershell
   cd mobile
   .\VALIDAR-Y-CREAR-APK.ps1 -Modo Publicacion
   cd ..
   ```

   Resultado: `mobile\entrega-android\Patagonia-Android-1.0.5-Publicacion.apk`.

5. **Borrá el archivo temporal** apenas termina (aunque haya fallado):

   ```powershell
   Remove-Item mobile\android\key.properties
   Test-Path mobile\android\key.properties   # tiene que decir False
   ```

6. (Opcional) Verificá que se firmó con la clave original. El certificado tiene que ser
   **el mismo** que el de la versión anterior, no "CN=Android Debug":

   ```powershell
   & "$env:LOCALAPPDATA\Android\sdk\build-tools\36.0.0\apksigner.bat" verify --print-certs `
       mobile\entrega-android\Patagonia-Android-1.0.5-Publicacion.apk
   ```

---

## Pruebas que tienen que pasar antes de entregar

```powershell
npm test                         # escritorio + motor Android + script de YouTube
cd mobile
flutter analyze                  # sin problemas
flutter test                     # todas en verde
dart format --output=none --set-exit-if-changed lib test
cd ..
```

GitHub corre las mismas pruebas solo en cada Pull Request
(`.github/workflows/tests.yml`, `mobile-tests.yml` e `ios-validate.yml`).

## iPhone

No se puede compilar en Windows. El proyecto está en `mobile\ios` y se arma en una Mac con
Xcode (ver `mobile\IOS_RELEASE_CHECKLIST.md`). GitHub lo compila para el simulador en cada
Pull Request que toca `mobile/`.
