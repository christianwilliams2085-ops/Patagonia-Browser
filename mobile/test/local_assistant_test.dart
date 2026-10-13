import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/src/local_assistant.dart';

void main() {
  const page = AssistantPageContext(
    title: 'Noticias de la Patagonia',
    url: 'https://example.com/patagonia',
    text:
        'La Patagonia reúne paisajes de montaña, estepa y costa en el sur de América. '
        'Sus parques nacionales protegen glaciares, bosques y una gran variedad de animales. '
        'La región recibe visitantes durante todo el año por sus rutas y actividades al aire libre.',
  );

  test('resume el texto visible de la página', () {
    final response = buildLocalAssistantResponse(
      message: 'Resumí esta página',
      context: page,
    );

    expect(response, contains('Resumen'));
    expect(response, contains('La Patagonia reúne paisajes'));
    expect(response, contains('Noticias de la Patagonia'));
  });

  test('informa el título y la dirección', () {
    final response = buildLocalAssistantResponse(
      message: '¿Cuál es la URL?',
      context: page,
    );

    expect(response, contains('Noticias de la Patagonia'));
    expect(response, contains('https://example.com/patagonia'));
  });
}
