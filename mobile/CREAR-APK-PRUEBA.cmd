@echo off
setlocal
chcp 65001 >nul
pushd "%~dp0"
rem Reuse the portable tools already found on this PC, within this process.
set "PATAGONIA_TOOLS=%USERPROFILE%\Documents\Codex\2026-09-02\re\.mobile-tools"
if exist "%PATAGONIA_TOOLS%\flutter\bin\flutter.bat" set "PATH=%PATAGONIA_TOOLS%\flutter\bin;%PATH%"
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" if exist "%PATAGONIA_TOOLS%\android-sdk\platform-tools\adb.exe" set "ANDROID_HOME=%PATAGONIA_TOOLS%\android-sdk"
if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not exist "%JAVA_HOME%\bin\java.exe" if exist "%PATAGONIA_TOOLS%\jdk\jdk-17.0.20.1+1\bin\java.exe" set "JAVA_HOME=%PATAGONIA_TOOLS%\jdk\jdk-17.0.20.1+1"
if exist "%JAVA_HOME%\bin\java.exe" set "PATH=%JAVA_HOME%\bin;%PATH%"
where flutter >nul 2>nul
if errorlevel 1 (
  echo No se encontro Flutter. Abri la terminal donde compilaste el APK anterior y ejecuta este archivo desde alli.
  goto fallo
)
set "CI=true"
set "PATAGONIA_PREVIEW=1"
rem Rebuild assets after applying a patch, including when it changed 0 files.
echo Preparando una compilacion limpia...
call flutter --no-version-check --suppress-analytics clean
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics pub get --enforce-lockfile
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics analyze --no-pub
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics test --no-pub test/packaged_assets_test.dart
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics test --no-pub
if errorlevel 1 goto fallo
call flutter --no-version-check --suppress-analytics build apk --release --no-pub
if errorlevel 1 goto fallo
if not exist "entrega-android" mkdir "entrega-android"
copy /y "build\app\outputs\flutter-apk\app-release.apk" "entrega-android\Patagonia-Android-1.0.5-Prueba.apk" >nul
if errorlevel 1 goto fallo
echo.
echo LISTO. Se creo Patagonia Pruebas. Se instala separada de la version anterior.
explorer /select,"%CD%\entrega-android\Patagonia-Android-1.0.5-Prueba.apk"
popd
pause
exit /b 0
:fallo
echo.
echo No se pudo generar el APK. Envia una captura del error que aparece arriba.
popd
pause
exit /b 1
