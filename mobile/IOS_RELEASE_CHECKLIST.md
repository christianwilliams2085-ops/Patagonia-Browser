# Preparación de Patagonia Browser para iPhone

El proyecto está preparado para iPhone con Flutter 3.47.2, iOS 15 como versión mínima y el identificador `com.patagoniabrowser.patagoniaBrowser`.

## Comprobaciones ya incorporadas

- Nombre e icono oficial de Patagonia Browser.
- Pantalla de inicio de iOS con la identidad visual del proyecto.
- Descripciones en español para cámara, micrófono y ubicación.
- Manifiesto de privacidad de Apple con uso local de `UserDefaults`.
- Declaración de que la aplicación no usa cifrado no exento.
- Firma automática preparada para elegir el equipo de Apple en Xcode.
- Compatibilidad configurada específicamente para iPhone.
- Compilación automática sin firma en un simulador con Xcode 26.

## Primera instalación en un iPhone desde una Mac

1. Instalar Xcode 26 o posterior y Flutter 3.47.2.
2. Ejecutar `PREPARAR-IPHONE.command` para revisar el proyecto y abrir Xcode.
3. Seleccionar **Runner**, abrir **Signing & Capabilities** y elegir el equipo de la cuenta de Apple.
4. Conectar el iPhone, confiar en la Mac y habilitar el modo Desarrollador en el teléfono.
5. Seleccionar el iPhone como destino y pulsar **Run**.

Una cuenta personal gratuita permite probar la aplicación en dispositivos propios. Para compartirla mediante TestFlight se necesita una membresía activa del Apple Developer Program.

## Distribución familiar con TestFlight

1. Registrar en Apple el Bundle ID `com.patagoniabrowser.patagoniaBrowser`.
2. Crear la aplicación **Patagonia Browser** en App Store Connect.
3. Ejecutar `CREAR-IPA-IPHONE.command` desde la Mac.
4. Validar y subir el archivo desde Xcode Organizer o Transporter.
5. Completar la información de prueba y añadir familiares como testers de TestFlight.

Cada nueva carga debe incrementar el número situado después del signo `+` en `version:` dentro de `pubspec.yaml`.

## Información preparada para App Store Connect

- **Nombre:** Patagonia Browser
- **Bundle ID:** `com.patagoniabrowser.patagoniaBrowser`
- **SKU sugerido:** `PATAGONIA-BROWSER-IOS-001`
- **Categoría principal sugerida:** Utilidades
- **Acceso web sin restricciones:** Sí
- **URL de soporte:** `https://github.com/christianwilliams2085-ops/Patagonia-Browser/issues`
- **Política de privacidad:** `https://github.com/christianwilliams2085-ops/Patagonia-Browser/blob/main/PRIVACY.md`

Apple exige revisar y completar en App Store Connect los datos de contacto, la clasificación por edades, las capturas y la información de privacidad antes de enviar la aplicación.
