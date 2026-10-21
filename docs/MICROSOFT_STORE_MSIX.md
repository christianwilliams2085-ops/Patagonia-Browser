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

## Identidad real confirmada en Partner Center

El producto **Patagonia Browser** figura como aplicacion **MSIX o PWA**, en estado **borrador**. Los siguientes valores se comprobaron visualmente en la pagina **Ver identidad del producto** de Partner Center:

| Campo | Valor |
|---|---|
| Package/Identity/Name | `Roma.69.PatagoniaBrowser` |
| Package/Identity/Publisher | `CN=75A3DDC1-A591-4D68-AB64-9F4514E0CA10` |
| Package/Properties/PublisherDisplayName | `Roma.69` |
| Id. de Store | `9NWL1WDZFJMD` |

Los primeros tres valores se conservan en `config/microsoft-store-identity.json`. Son **metadatos publicos del paquete**, no contraseñas, claves privadas ni tokens. No se incluyen Package SID ni credenciales de acceso.

Para generar el candidato con identidad real, desde PowerShell:

```powershell
npm ci
npm test
npm run make:msix
```

Resultado: `dist/msix/Patagonia-Browser-1.0.4-Windows-x64-STORE-UNSIGNED.msix` junto a su hash SHA256. Este candidato **no esta firmado**, no se distribuye directamente a usuarios y no representa una version publicada. Microsoft Store debe recibir el paquete, certificarlo y firmarlo antes de su distribucion.

Si Partner Center modifica alguno de los tres datos de identidad, actualizar **exactamente** `config/microsoft-store-identity.json` antes de compilar. El nombre visible en la tienda es `Patagonia Browser`, mientras que el publicador figura como `Roma.69`. Revisar que esa identidad publica sea la deseada antes de enviar.

El empaquetado toma la version del `package.json` y genera version MSIX de cuatro componentes (ejemplo: `1.0.4.0`). Para actualizaciones posteriores, incrementar la version: Microsoft Store requiere progresion y reserva su cuarto componente.

## Pruebas pendientes antes del envio

- Probar paquete con firma de desarrollo, certificado confiable **solo en una VM de pruebas**; no usar identidad de prueba ni certificados autogenerados para distribucion publica.
- Comprobar que inicia, navega HTTPS, abre varias pestañas, bloquea anuncios, descarga archivos y solicita permisos correctamente.
- Comprobar cierre y restauracion de sesion, favoritos e historial; verificar que MSIX escribe en el perfil de usuario y no en Program Files/WindowsApps.
- Comprobar instalacion junto al EXE Squirrel, posible migracion de datos y ausencia de doble proceso o conflictos de perfiles. No desinstalar el EXE hasta validar los datos.
- Probar instalacion, actualizacion, desinstalacion y permisos con usuarios estandar en Windows 10/11.
- Ejecutar Windows App Certification Kit sobre el paquete final y corregir los resultados antes de enviar.
- Confirmar iconos, pantallas de Store, descripcion, soporte, politica de privacidad y capacidades declaradas.
- Verificar el comportamiento en un equipo con Smart App Control activado **despues** de obtener una version certificada de Store.

El workflow `.github/workflows/windows-msix-candidate.yml` genera **dos candidatos sin firma** en GitHub Actions: uno de prueba con identidad ficticia y otro de Store con identidad real. Ninguno publica la aplicacion, reemplaza la certificacion o garantiza su funcionamiento al instalarla en Windows.

## Referencias oficiales

- Empaquetado de aplicaciones de escritorio: https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-manual-conversion
- Publicar Win32 con MSIX: https://learn.microsoft.com/en-us/windows/apps/distribute-through-store/how-to-distribute-your-win32-app-through-microsoft-store
- Firma de MSIX en Microsoft Store: https://learn.microsoft.com/en-us/windows/msix/package/sign-msix-package-guide
- Requisitos para los paquetes en Store: https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/package-version-numbering
