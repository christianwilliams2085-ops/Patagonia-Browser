class NavigationInput {
  const NavigationInput._();

  static Uri resolve(String value) {
    final input = value.trim();
    if (input.isEmpty) {
      return Uri.parse('https://www.google.com/');
    }

    final parsed = Uri.tryParse(input);
    if (parsed != null &&
        (parsed.scheme == 'http' || parsed.scheme == 'https') &&
        parsed.host.isNotEmpty) {
      return parsed;
    }

    if (_looksLikeAddress(input)) {
      final scheme = _usesLocalHttp(input) ? 'http://' : 'https://';
      final address = Uri.tryParse('$scheme$input');
      if (address != null && address.host.isNotEmpty) {
        return address;
      }
    }

    return Uri.https('www.google.com', '/search', {'q': input});
  }

  static bool _looksLikeAddress(String value) {
    if (value.contains(RegExp(r'\s'))) return false;
    final host = value.split('/').first.split(':').first.toLowerCase();
    if (host == 'localhost') return true;
    if (RegExp(r'^\d{1,3}(\.\d{1,3}){3}$').hasMatch(host)) return true;
    return RegExp(
      r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$',
      caseSensitive: false,
    ).hasMatch(host);
  }

  static bool _usesLocalHttp(String value) {
    final host = value.split('/').first.split(':').first.toLowerCase();
    return host == 'localhost' ||
        host == '127.0.0.1' ||
        host.startsWith('192.168.') ||
        host.startsWith('10.');
  }
}
