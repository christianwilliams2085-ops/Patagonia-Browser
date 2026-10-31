import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/src/youtube_protection.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('incluye el script real como asset de Flutter', () async {
    final script = await YouTubeProtection.loadScript();
    expect(script, contains('__patagoniaYouTubeProtection'));
  });

  test('serializa excepciones sin convertirlas en código ejecutable', () {
    final host = 'm.youtube.com";window.injected=true;//';
    final configuration = YouTubeProtection.configuration([host]);
    final prefix = 'window.__patagoniaYouTubeConfig = ';
    final encoded = configuration.substring(
      prefix.length,
      configuration.indexOf(';window.__patagoniaYouTubeProtection'),
    );
    expect(jsonDecode(encoded), {
      'unprotectedHosts': [host],
    });
  });
}
