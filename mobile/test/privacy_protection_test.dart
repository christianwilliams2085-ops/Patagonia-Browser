import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:patagonia_browser/src/privacy_protection.dart';

void main() {
  group('PrivacyProtection', () {
    test(
      'filtra anuncios de YouTube sin bloquear video, directos ni chats',
      () {
        for (final url in [
          'https://m.youtube.com/pagead/interaction/',
          'https://www.youtube.com/api/stats/ads?ad_id=1',
        ]) {
          expect(PrivacyProtection.classify(url), BlockedKind.advertisement);
          expect(
            PrivacyProtection.blockedRequest(url, isMainFrame: true),
            isNull,
          );
        }
        for (final url in [
          'https://m.youtube.com/youtubei/v1/player',
          'https://www.youtube.com/youtubei/v1/live_chat/get_live_chat',
          'https://rr1.googlevideo.com/videoplayback?live=1',
          'https://rr1.googlevideo.com/videoplayback?mime=audio%2Fwebm',
          'https://m.youtube.com/watch?v=abc',
          'https://youtube.com.example.org/pagead/interaction/',
          'https://example.com/pagead/interaction/',
          'https://chatgpt.com/backend-api/conversation',
        ]) {
          expect(PrivacyProtection.classify(url), isNull, reason: url);
        }
      },
    );

    test('limpieza de YouTube queda limitada al sitio correcto', () async {
      TestWidgetsFlutterBinding.ensureInitialized();
      final youtube = await PrivacyProtection.pageScript(
        Uri.parse('https://m.youtube.com/watch?v=a'),
      );
      expect(youtube, contains('__patagoniaYouTubeProtection'));
      for (final url in [
        'https://chatgpt.com',
        'https://youtube.com.other.org',
      ]) {
        final script = await PrivacyProtection.pageScript(Uri.parse(url));
        expect(script, isNot(contains('__patagoniaYouTubeProtection')));
      }
    });

    test(
      'prepara la protección preventiva al comienzo del documento',
      () async {
        TestWidgetsFlutterBinding.ensureInitialized();
        final source = await PrivacyProtection.youtubeProtectionScript;
        final script = PrivacyProtection.youtubeDocumentStartScript(source);

        expect(script.groupName, PrivacyProtection.youtubeScriptGroup);
        expect(script.source, contains('__patagoniaYouTubeProtection'));
        expect(script.injectionTime, UserScriptInjectionTime.AT_DOCUMENT_START);
        expect(script.contentWorld, ContentWorld.PAGE);
        expect(script.allowedOriginRules, {'*'});
      },
    );
    test('no bloquea páginas principales ni dominios parecidos', () {
      expect(
        PrivacyProtection.blockedRequest(
          'https://doubleclick.net/',
          isMainFrame: true,
        ),
        isNull,
      );
      expect(
        PrivacyProtection.classify('https://notdoubleclick.net/ad'),
        isNull,
      );
      expect(
        PrivacyProtection.classify('https://doubleclick.net.ejemplo.com/ad'),
        isNull,
      );
      expect(
        PrivacyProtection.classify('https://www.tiktok.com/video/1'),
        isNull,
      );
      expect(
        PrivacyProtection.classify('data:text/plain,https://doubleclick.net'),
        isNull,
      );
    });

    test('bloquea peticiones de rastreo con límite de dominio', () {
      expect(
        PrivacyProtection.blockedRequest(
          'https://metrics.google-analytics.com/collect',
          isMainFrame: false,
        ),
        BlockedKind.tracker,
      );
      final rule = RegExp(
        PrivacyProtection.rules().first.trigger.urlFilter,
        caseSensitive: false,
      );
      expect(rule.hasMatch('https://ads.doubleclick.net/ad'), isTrue);
      expect(rule.hasMatch('https://notdoubleclick.net/ad'), isFalse);
      expect(rule.hasMatch('https://doubleclick.net.example.com/ad'), isFalse);
    });

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

    test('genera solo reglas de red; la limpieza visual no es global', () {
      final rules = PrivacyProtection.rules();
      expect(rules, hasLength(2));
      expect(
        rules.map((rule) => rule.action.type),
        everyElement(ContentBlockerActionType.BLOCK),
      );
    });

    test('la limpieza CSS genérica no se aplica en YouTube', () async {
      TestWidgetsFlutterBinding.ensureInitialized();
      for (final url in [
        'https://m.youtube.com/watch?v=a',
        'https://www.youtube.com/',
        'https://music.youtube.com/',
      ]) {
        final script = await PrivacyProtection.pageScript(Uri.parse(url));
        expect(script, isNot(contains('patagonia-ad-style')), reason: url);
        expect(script, contains('__patagoniaYouTubeProtection'), reason: url);
      }
      for (final url in [
        'https://www.example.com/',
        'https://youtube.com.other.org/',
      ]) {
        final script = await PrivacyProtection.pageScript(Uri.parse(url));
        expect(script, contains('patagonia-ad-style'), reason: url);
      }
    });
  });
}
