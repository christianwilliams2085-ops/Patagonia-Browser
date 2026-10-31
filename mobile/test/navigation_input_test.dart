import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/src/navigation_input.dart';

void main() {
  group('NavigationInput', () {
    test('conserva query y fragmento de un dominio sin esquema', () {
      expect(
        NavigationInput.resolve('example.com?q=patagonia#resultado').toString(),
        'https://example.com?q=patagonia#resultado',
      );
    });

    test('usa HTTP para redes privadas 172 y direcciones IPv6 locales', () {
      expect(NavigationInput.resolve('172.20.0.1:8080').scheme, 'http');
      expect(NavigationInput.resolve('[::1]:8080').scheme, 'http');
      expect(NavigationInput.resolve('172.32.0.1').scheme, 'https');
    });

    test(
      'no convierte protocolos ejecutables ni credenciales en navegación',
      () {
        for (final input in [
          'javascript:alert(1)',
          'file:///sdcard/data',
          'https://user:secret@example.com',
          '999.1.1.1',
        ]) {
          expect(NavigationInput.resolve(input).host, 'www.google.com');
        }
      },
    );

    test('conserva direcciones HTTPS completas', () {
      expect(
        NavigationInput.resolve('https://example.com/path?q=1').toString(),
        'https://example.com/path?q=1',
      );
    });

    test('agrega HTTPS a un dominio', () {
      expect(
        NavigationInput.resolve('example.com/noticias').toString(),
        'https://example.com/noticias',
      );
    });

    test('usa HTTP local para desarrollo', () {
      expect(
        NavigationInput.resolve('localhost:8080').toString(),
        'http://localhost:8080',
      );
    });

    test('convierte texto en una búsqueda segura', () {
      final uri = NavigationInput.resolve('clima en Bariloche');
      expect(uri.host, 'www.google.com');
      expect(uri.path, '/search');
      expect(uri.queryParameters['q'], 'clima en Bariloche');
    });
  });
}
