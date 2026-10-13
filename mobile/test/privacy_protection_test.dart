import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/src/privacy_protection.dart';

void main() {
  group('PrivacyProtection', () {
    test('reconoce anuncios en dominios y subdominios', () {
      expect(
        PrivacyProtection.classify('https://pagead2.googlesyndication.com/ad'),
        BlockedKind.advertisement,
      );
    });

    test('reconoce rastreadores conocidos', () {
      expect(
        PrivacyProtection.classify('https://www.google-analytics.com/collect'),
        BlockedKind.tracker,
      );
    });

    test('no bloquea una dirección común', () {
      expect(PrivacyProtection.classify('https://www.wikipedia.org'), isNull);
    });

    test('genera reglas de red y limpieza visual', () {
      expect(PrivacyProtection.rules(), hasLength(3));
    });
  });
}
