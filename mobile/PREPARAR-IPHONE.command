#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v flutter >/dev/null 2>&1; then
  echo "No se encontró Flutter. Instalá Flutter 3.47.2 y volvé a abrir este archivo."
  read -r -p "Presioná Enter para cerrar..."
  exit 1
fi

echo "Preparando Patagonia Browser para iPhone..."
flutter config --enable-swift-package-manager
flutter pub get
dart format --output=none --set-exit-if-changed lib test
flutter analyze
flutter test
flutter build ios --simulator --release

echo "La comprobación terminó correctamente. Se abrirá el proyecto en Xcode."
open ios/Runner.xcworkspace
