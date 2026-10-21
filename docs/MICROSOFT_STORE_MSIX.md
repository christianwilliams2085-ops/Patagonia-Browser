# Patagonia Browser en Microsoft Store (MSIX)

## Estado

Este flujo es un **candidato tecnico**, no una publicacion. La version Windows 1.0.4 existente se sigue distribuyendo como EXE independiente con Squirrel. El nuevo flujo produce un **MSIX sin firma** con herramientas oficiales del Windows SDK. No se requiere ni se incluye ningun certificado privado en GitHub.

La firma de confianza sera aplicada por Microsoft Store **despues** de aprobar el envio MSIX. No debe afirmarse que el EXE existente se vuelve confiable ni que Smart App Control dejara de bloquearlo.

## Requisitos de compilacion

- Windows 10/11 x64, Node.js compatible con package-lock.json, npm.
- Windows 10/11 SDK con MakeAppx.exe en Windows Kits\10\bin\<version>\x64.
- Ejecutar desde la raiz del repositorio: npm ci y npm test.
- No hace falta instalar otro maker experimental de Electron Forge: el script reutiliza npm run package:windows, que empaqueta Electron sin ejecutar Squirrel.

## Generar candidato de prueba (identidad ficticia)

Desde PowerShell, en la raiz del repositorio:

```powershell
npm ci
npm test
npm run make:msix:test
```

Resultado en dist/msix/Patagonia-Browser-1.0.4-Windows-x64-TEST-UNSIGNED.msix (junto con archivo .sha256). Se valida el desempaquetado con MakeAppx.

**No distribuir ni subir este candidato a Microsoft Store.** La identidad PatagoniaBrowser.Test es exclusivamente de demostracion. El archivo esta sin firma, por lo que no se puede instalar normalmente; para instalar un MSIX local es necesario firmarlo con un certificado confiable en el equipo de prueba. No desactivar Smart App Control para sortear ese requisito.

## Identidad real de Partner Center

1. Crear o ingresar a una cuenta de desarrollador de Microsoft Partner Center.
2. Reservar el nombre Patagonia Browser, sujeto a disponibilidad y aprobacion.
3. En la identidad de la aplicacion, copiar **Package/Identity/Name** y **Publisher** exactamente como figuran en Partner Center. Obtener tambien **PublisherDisplayName**.
4. Solo entonces, en PowerShell de compilacion:

```powershell
$env:PATAGONIA_MSIX_IDENTITY_NAME = "PEGAR_PACKAGE_IDENTITY_NAME"
$env:PATAGONIA_MSIX_PUBLISHER = "CN=PEGAR_PUBLISHER_REAL"
$env:PATAGONIA_MSIX_PUBLISHER_DISPLAY_NAME = "PEGAR_NOMBRE_PUBLICO_REAL"
npm run make:msix
```

Los valores mostrados arriba son marcadores explicativos y **no sirven para publicar**. El script se niega a generar un candidato de Store si faltan esas variables. El MSIX de salida sera STORE-UNSIGNED: sigue sin firma hasta pasar por el proceso de Microsoft Store.

El empaquetado toma la version del package.json y genera version MSIX de cuatro componentes (ejemplo: 1.0.4.0). Para actualizaciones posteriores, incrementar la version con cuidado: Microsoft Store requiere progresion de version y reserva su cuarto componente.

## Pruebas pendientes antes del envio

- Probar paquete con firma de desarrollo, certificado confiable **solo en una VM de pruebas**; no usar identidad de prueba ni certificados autogenerados para distribucion publica.
- Comprobar que inicia, navega HTTPS, abre varias pestañas, bloquea anuncios, descarga archivos y solicita permisos correctamente.
- Comprobar cierre y restauracion de sesion, favoritos e historial; verificar que MSIX escribe en el perfil de usuario y no en Program Files/WindowsApps.
- Comprobar instalacion junto al EXE Squirrel, posible migracion de datos y ausencia de doble proceso o conflictos de perfiles. No desinstalar el EXE hasta validar los datos.
- Probar instalacion, actualizacion, desinstalacion y permisos con usuarios estandar en Windows 10/11.
- Ejecutar Windows App Certification Kit sobre el paquete final y corregir los resultados antes de enviar.
- Confirmar iconos, pantallas de Store, descripcion, soporte, politica de privacidad y capacidades declaradas.
- Verificar el comportamiento en un equipo con Smart App Control activado **despues** de obtener una version certificada de Store.

El workflow .github/workflows/windows-msix-candidate.yml crea un artefacto de prueba *sin firma* en GitHub Actions. No publica en Store ni reemplaza una certificacion o prueba funcional en Windows.

## Referencias oficiales

- Empaquetado de aplicaciones de escritorio: https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion
- Publicar Win32 con MSIX: https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store
- Firma de MSIX en Microsoft Store: https://learn.microsoft.com/en-us/windows/msix/package/sign-msix-package-guide
- Requisitos para los paquetes en Store: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/package-version-numbering
