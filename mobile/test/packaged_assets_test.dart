import 'dart:ui' as ui;

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('el bundle incluye y puede abrir todos los recursos de Patagonia', () async {
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    final bundled = manifest.listAssets();
    const images = [
      'assets/patagonia-icon.png',
      'assets/patagonia-emblema.png',
      'assets/patagonia-start.png',
    ];
    const script = 'assets/youtube-protection.js';
    for (final name in [...images, script]) {
      expect(
        bundled,
        contains(name),
        reason:
            'Recurso ausente del bundle: $name. Ejecutá flutter clean y volvé a compilar.',
      );
      final data = await rootBundle.load(name);
      expect(
        data.lengthInBytes,
        greaterThan(0),
        reason: 'Recurso vacío: $name',
      );
      if (images.contains(name)) {
        final codec = await ui.instantiateImageCodec(
          data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
        );
        try {
          final frame = await codec.getNextFrame();
          expect(frame.image.width, greaterThan(0));
          expect(frame.image.height, greaterThan(0));
          frame.image.dispose();
        } finally {
          codec.dispose();
        }
      }
    }
    expect((await rootBundle.loadString(script)).trim(), isNotEmpty);
  });
}
