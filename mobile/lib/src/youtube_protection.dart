import 'dart:convert';

import 'package:flutter/services.dart';

class YouTubeProtection {
  const YouTubeProtection._();

  static const scriptGroup = 'patagonia-youtube';

  static Future<String> loadScript() =>
      rootBundle.loadString('assets/youtube-protection.js');

  static String configuration(Iterable<String> unprotectedHosts) =>
      'window.__patagoniaYouTubeConfig = '
      '${jsonEncode({'unprotectedHosts': unprotectedHosts.toList()})};'
      'window.__patagoniaYouTubeProtection?.configure('
      'window.__patagoniaYouTubeConfig);';
}
