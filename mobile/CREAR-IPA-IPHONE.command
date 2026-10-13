#!/bin/bash

set -euo pipefail
cd "$(dirname "$0")"

echo "Creando el paquete firmado de Patagonia Browser..."
flutter pub get
flutter build ipa --release

echo "El archivo IPA quedó en build/ios/ipa/."
open build/ios/ipa
