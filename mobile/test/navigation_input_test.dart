import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/src/navigation_input.dart';

void main() {
  group('NavigationInput', () {
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
