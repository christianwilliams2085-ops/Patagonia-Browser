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

    test('las reglas incluyen el dominio exacto y subdominios con límite', () {
      final domains = PrivacyProtection.rules().first.trigger.ifDomain;
      expect(domains, contains('doubleclick.net'));
      expect(domains, contains('*.doubleclick.net'));
      expect(domains, isNot(contains('*doubleclick.net')));
      expect(
        PrivacyProtection.classify('https://notdoubleclick.net/ad'),
        isNull,
      );
      expect(
        PrivacyProtection.classify('https://doubleclick.net.other.invalid/ad'),
        isNull,
      );
    });

    test('conserva los servidores de reproducción de YouTube', () {
      for (final url in [
        'https://m.youtube.com/watch?v=content',
        'https://www.youtube.com/youtubei/v1/player',
        'https://r1.googlevideo.com/videoplayback?range=0-1024',
        'https://i.ytimg.com/vi/content/default.jpg',
      ]) {
        expect(PrivacyProtection.classify(url), isNull);
      }
    });
  });
}
