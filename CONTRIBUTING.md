# Contribuir a Patagonia Browser

Gracias por ayudar a construir un navegador sencillo, privado y confiable. Se aceptan reportes, documentación, pruebas y código.

## Antes de empezar

1. Buscá si ya existe un Issue sobre el mismo tema.
2. Para un cambio importante, abrí primero un Issue y acordá el alcance.
3. No compartas contraseñas, claves de firma, perfiles de usuario, historiales ni otros datos privados.

## Flujo recomendado

1. Creá un fork o una rama con un nombre descriptivo, por ejemplo `fix/error-descargas`.
2. Hacé un cambio pequeño y enfocado.
3. Agregá o actualizá pruebas cuando cambie el comportamiento.
4. Actualizá la documentación afectada.
5. Abrí un Pull Request y vinculalo con su Issue.

## Preparar Windows

Requiere una versión de Node.js compatible con `package-lock.json`.

```powershell
npm ci
npm test
npm start
```

No incluyas `node_modules`, instaladores, carpetas de compilación, perfiles locales ni secretos en el commit.

## Preparar la edición móvil

Trabajá solamente con el código móvil que esté publicado en el repositorio. Antes de enviar un cambio ejecutá, desde su carpeta:

```powershell
flutter pub get
flutter analyze
flutter test
```

No incluyas `build`, `.dart_tool`, SDKs, emuladores, claves de firma ni APK generados en el commit.

## Pull Requests

Un Pull Request listo para revisar debe:

- explicar el problema y la solución;
- limitarse a un tema;
- pasar las pruebas aplicables;
- incluir evidencia cuando cambie la interfaz;
- conservar la privacidad y la seguridad del usuario;
- evitar afirmar que una función existe si todavía es solo un objetivo.

Las contribuciones aceptadas se atribuyen a su autor mediante el historial de Git y GitHub.
