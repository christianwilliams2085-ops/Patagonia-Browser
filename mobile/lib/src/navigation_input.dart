class NavigationInput {
  const NavigationInput._();

  static bool isWebUri(Uri? uri) =>
      uri != null &&
      {'http', 'https'}.contains(uri.scheme) &&
      uri.host.isNotEmpty &&
      uri.userInfo.isEmpty;

  static Uri resolve(String value) {
    final input = value.trim();
    if (input.isEmpty) return Uri.parse('https://www.google.com/');
    final parsed = Uri.tryParse(input);
    if (isWebUri(parsed)) return parsed!;

    if (!input.contains(RegExp(r'\s')) && !input.contains('://')) {
      final address = Uri.tryParse('https://$input');
      if (address != null &&
          address.userInfo.isEmpty &&
          _looksLikeHost(address.host)) {
        return _usesLocalHttp(address.host)
            ? address.replace(scheme: 'http')
            : address;
      }
    }
    return Uri.https('www.google.com', '/search', {'q': input});
  }

  static bool _looksLikeHost(String host) {
    if (host == 'localhost' || host == '::1') return true;
    if (RegExp(r'^\d+(\.\d+){3}$').hasMatch(host)) {
      return host.split('.').every((part) => int.parse(part) <= 255);
    }
    return RegExp(
      r'^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$',
      caseSensitive: false,
    ).hasMatch(host);
  }

  static bool _usesLocalHttp(String host) {
    final parts = host.split('.');
    final private172 =
        parts.length == 4 &&
        parts[0] == '172' &&
        (int.tryParse(parts[1]) ?? 0) >= 16 &&
        (int.tryParse(parts[1]) ?? 99) <= 31;
    return host == 'localhost' ||
        host == '::1' ||
        host.startsWith('127.') ||
        host.startsWith('192.168.') ||
        host.startsWith('10.') ||
        host.startsWith('169.254.') ||
        private172;
  }
}
