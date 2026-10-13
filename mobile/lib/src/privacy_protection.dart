import 'package:flutter_inappwebview/flutter_inappwebview.dart';

enum BlockedKind { advertisement, tracker }

class PrivacyProtection {
  const PrivacyProtection._();

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
    'tiktok.com',
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
        urlFilter: '.*',
        ifDomain: domains.map((domain) => '*$domain').toList(),
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
          selector:
              '.adsbygoogle, .ad-container, .ad-wrapper, .advertisement, '
              '[id^="google_ads"], [id^="div-gpt-ad"], [class*=" ad-slot"], '
              '[data-ad-slot], [data-testid="ad"], iframe[src*="doubleclick"]',
        ),
      ),
    ];
  }

  static BlockedKind? classify(String value) {
    final host = Uri.tryParse(value)?.host.toLowerCase();
    if (host == null || host.isEmpty) return null;
    if (_matches(host, advertisementDomains)) return BlockedKind.advertisement;
    if (_matches(host, trackerDomains)) return BlockedKind.tracker;
    return null;
  }

  static bool _matches(String host, List<String> domains) =>
      domains.any((domain) => host == domain || host.endsWith('.$domain'));
}
