import 'package:flutter_inappwebview/flutter_inappwebview.dart';

import 'youtube_protection.dart';

enum BlockedKind { advertisement, tracker }

class PrivacyProtection {
  const PrivacyProtection._();

  static const youtubeScriptGroup = 'patagonia-youtube-protection';

  static const advertisementDomains = <String>[
    '2mdn.net',
    'adform.net',
    'adnxs.com',
    'adroll.com',
    'adsrvr.org',
    'amazon-adsystem.com',
    'appnexus.com',
    'casalemedia.com',
    'criteo.com',
    'criteo.net',
    'doubleclick.net',
    'googleadservices.com',
    'googlesyndication.com',
    'googletagservices.com',
    'media.net',
    'openx.net',
    'outbrain.com',
    'pubmatic.com',
    'rubiconproject.com',
    'smartadserver.com',
    'taboola.com',
    'yieldmo.com',
  ];

  static const trackerDomains = <String>[
    'adobedtm.com',
    'amplitude.com',
    'branch.io',
    'chartbeat.com',
    'clarity.ms',
    'clicktale.net',
    'demdex.net',
    'facebook.net',
    'fullstory.com',
    'google-analytics.com',
    'googletagmanager.com',
    'hotjar.com',
    'hotjar.io',
    'mixpanel.com',
    'newrelic.com',
    'nr-data.net',
    'optimizely.com',
    'quantserve.com',
    'scorecardresearch.com',
    'segment.com',
    'sentry.io',
  ];

  static List<ContentBlocker> rules() {
    final resources = <ContentBlockerTriggerResourceType>[
      ContentBlockerTriggerResourceType.IMAGE,
      ContentBlockerTriggerResourceType.STYLE_SHEET,
      ContentBlockerTriggerResourceType.SCRIPT,
      ContentBlockerTriggerResourceType.FONT,
      ContentBlockerTriggerResourceType.MEDIA,
      ContentBlockerTriggerResourceType.RAW,
      ContentBlockerTriggerResourceType.SVG_DOCUMENT,
    ];

    ContentBlocker domainRule(List<String> domains) => ContentBlocker(
      trigger: ContentBlockerTrigger(
        // Match a complete host; '*domain' also matches unrelated hosts.
        urlFilter:
            '^https?://([a-z0-9-]+\\.)*(${domains.map(RegExp.escape).join('|')})(:[0-9]+)?(/|\\?|\$).*',
        urlFilterIsCaseSensitive: false,
        resourceType: resources,
      ),
      action: ContentBlockerAction(type: ContentBlockerActionType.BLOCK),
    );

    return [
      domainRule(advertisementDomains),
      domainRule(trackerDomains),
      ContentBlocker(
        trigger: ContentBlockerTrigger(urlFilter: '.*'),
        action: ContentBlockerAction(
          type: ContentBlockerActionType.CSS_DISPLAY_NONE,
          selector: cosmeticSelector,
        ),
      ),
    ];
  }

  static const cosmeticSelector =
      '.adsbygoogle, .ad-container, .ad-wrapper, .advertisement, '
      '[id^="google_ads"], [id^="div-gpt-ad"], [class*=" ad-slot"], '
      '[data-ad-slot], [data-testid="ad"], iframe[src*="doubleclick"]';

  static bool isYouTube(Uri? uri) =>
      uri != null &&
      {'https', 'http'}.contains(uri.scheme) &&
      _matches(uri.host.toLowerCase(), const ['youtube.com']);

  static String? _youtubeScriptCache;

  static Future<String> get youtubeProtectionScript async {
    final cached = _youtubeScriptCache;
    if (cached != null) return cached;
    // Conservative script from PR #16: removes player ad fields and clicks
    // enabled skip buttons; never mutes, seeks or changes playback speed.
    final source = await YouTubeProtection.loadScript();
    _youtubeScriptCache = source;
    return source;
  }

  static UserScript youtubeDocumentStartScript(String source) => UserScript(
    groupName: youtubeScriptGroup,
    source: source,
    injectionTime: UserScriptInjectionTime.AT_DOCUMENT_START,
    contentWorld: ContentWorld.PAGE,
    allowedOriginRules: const {'*'},
  );

  static Future<String> pageScript(Uri? uri) async {
    if (!isYouTube(uri)) return cosmeticScript;
    return '$cosmeticScript\n${await youtubeProtectionScript}';
  }

  // Generic cosmetic fallback for non-YouTube pages and late DOM nodes.
  static String get cosmeticScript =>
      """
    (() => {
      if (document.getElementById('patagonia-ad-style')) return;
      const style = document.createElement('style');
      style.id = 'patagonia-ad-style';
      style.textContent = '$cosmeticSelector { display: none !important; }';
      (document.head || document.documentElement).appendChild(style);
    })();
  """;

  static BlockedKind? blockedRequest(
    String value, {
    required bool isMainFrame,
  }) {
    return isMainFrame ? null : classify(value);
  }

  static BlockedKind? classify(String value) {
    final uri = Uri.tryParse(value);
    if (uri == null || !{'http', 'https'}.contains(uri.scheme)) return null;
    final host = uri.host.toLowerCase();
    if (host.isEmpty) return null;
    if (_matches(host, advertisementDomains)) return BlockedKind.advertisement;
    if (_matches(host, trackerDomains)) return BlockedKind.tracker;
    // YouTube also serves advertisements from its own host. Never block the
    // player API or googlevideo: they carry the requested video and live audio.
    if (isYouTube(uri) &&
        (uri.path.startsWith('/pagead/') || uri.path == '/api/stats/ads')) {
      return BlockedKind.advertisement;
    }
    return null;
  }

  static bool _matches(String host, List<String> domains) =>
      domains.any((domain) => host == domain || host.endsWith('.$domain'));
}
