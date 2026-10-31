@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0"
rem Prueba de fuego GeckoView + uBlock Origin dentro de Flutter (ver PLAN-GECKOVIEW.md).
rem Crea "Patagonia Gecko Prueba": se instala APARTE, firmada con la clave de debug.
rem No reemplaza ni toca la app de la familia.
set "PATAGONIA_TOOLS=%USERPROFILE%\Documents\Codex\2026-09-02\re\.mobile-tools"
if exist "C:\src\flutter\bin\flutter.bat" (
  set "PATH=C:\src\flutter\bin;%PATH%"
) else if exist "%PATAGONIA_TOOLS%\flutter\bin\flutter.bat" (
  set "PATH=%PATAGONIA_TOOLS%\flutter\bin;%PATH%"
)
rem GeckoView 159 necesita la plataforma Android 37.2, que esta en el SDK de Android Studio.
if exist "%LOCALAPPDATA%\Android\Sdk\platforms\android-37.2" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not exist "%JAVA_HOME%\bin\java.exe" if exist "%PATAGONIA_TOOLS%\jdk\jdk-17.0.20.1+1\bin\java.exe" set "JAVA_HOME=%PATAGONIA_TOOLS%\jdk\jdk-17.0.20.1+1"
if exist "%JAVA_HOME%\bin\java.exe" set "PATH=%JAVA_HOME%\bin;%PATH%"
where flutter >nul 2>nul
if errorlevel 1 (
  echo No se encontro Flutter.
  goto fallo
)
set "CI=true"
set "PATAGONIA_GECKO_SPIKE=1"
set "PATAGONIA_PREVIEW="
call flutter --no-version-check --suppress-analytics pub get --enforce-lockfile
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics analyze --no-pub
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics test --no-pub
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics build apk --release --no-pub --target-platform android-arm64 --dart-define=PATAGONIA_GECKO_SPIKE=true
if errorlevel 1 goto fallo
if not exist "entrega-android" mkdir "entrega-android"
copy /y "build\app\outputs\flutter-apk\app-release.apk" "entrega-android\Patagonia-Android-Gecko-Prueba-1.apk" >nul
if errorlevel 1 goto fallo
echo.
echo LISTO. Se creo Patagonia Gecko Prueba. Se instala separada de la app de la familia.
explorer /select,"%CD%\entrega-android\Patagonia-Android-Gecko-Prueba-1.apk"
popd
pause
exit /b 0
:fallo
echo.
echo No se pudo generar el APK. Envia una captura del error que aparece arriba.
popd
pause
exit /b 1
