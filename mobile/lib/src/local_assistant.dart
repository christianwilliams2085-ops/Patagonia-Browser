class AssistantPageContext {
  const AssistantPageContext({
    required this.title,
    required this.url,
    required this.text,
  });

  final String title;
  final String url;
  final String text;
}

String buildLocalAssistantResponse({
  required String message,
  required AssistantPageContext context,
}) {
  final question = _normalize(message).toLowerCase();
  final title = _normalize(context.title);
  final url = _normalize(context.url);
  final pageText = _normalize(context.text);

  if (_asksForUrl(question)) {
    if (url.isEmpty) {
      return 'Abrí una página y te mostraré su dirección.';
    }
    return [
      'Título: ${title.isEmpty ? 'Sin título' : title}',
      'Dirección: $url',
    ].join('\n');
  }

  if (_asksForTitle(question)) {
    return title.isEmpty
        ? 'Abrí una página y te diré su título.'
        : 'El título de la página es: $title';
  }

  if (_asksForSummary(question)) {
    if (pageText.isEmpty) {
      return 'No encontré texto visible para resumir. Abrí una página y volvé a intentarlo.';
    }
    final sentences = _importantSentences(pageText, 5);
    final summary = sentences.isEmpty
        ? _shorten(pageText, 900)
        : sentences.join(' ');
    return [
      'Resumen',
      '',
      summary,
      '',
      'Fuente: ${title.isEmpty ? (url.isEmpty ? 'página abierta' : url) : title}',
    ].join('\n');
  }

  if (pageText.isEmpty) {
    return [
      'Soy el asistente privado de Patagonia.',
      '',
      'Abrí una página y pedime que la resuma, que te diga su título o que te muestre su dirección.',
    ].join('\n');
  }

  return [
    'Puedo ayudarte con la página abierta sin enviar su contenido fuera del teléfono.',
    '',
    'Probá escribiendo:',
    '• Resumí esta página',
    '• ¿Cuál es el título?',
    '• Mostrame la dirección',
  ].join('\n');
}

bool _asksForSummary(String value) =>
    value.contains('resum') ||
    value.contains('de qué trata') ||
    value.contains('de que trata') ||
    value.contains('qué dice') ||
    value.contains('que dice');

bool _asksForUrl(String value) =>
    value.contains('url') ||
    value.contains('dirección') ||
    value.contains('direccion') ||
    value.contains('enlace');

bool _asksForTitle(String value) =>
    value.contains('título') || value.contains('titulo');

String _normalize(String value) => value
    .replaceAll('\r', ' ')
    .replaceAll(RegExp(r'\n+'), ' ')
    .replaceAll(RegExp(r'\t+'), ' ')
    .replaceAll(RegExp(r'\s{2,}'), ' ')
    .trim();

List<String> _importantSentences(String text, int count) {
  const noise = [
    'skip to content',
    'sign in',
    'subscribe',
    'privacy',
    'cookies',
    'terms',
    'advertisement',
  ];
  return text
      .split(RegExp(r'(?<=[.!?])\s+'))
      .map((sentence) => sentence.trim())
      .where((sentence) => sentence.length >= 35 && sentence.length <= 260)
      .where((sentence) {
        final lower = sentence.toLowerCase();
        return !noise.any(lower.contains);
      })
      .take(count)
      .toList();
}

String _shorten(String value, int limit) {
  if (value.length <= limit) return value;
  return '${value.substring(0, limit).trim()}…';
}
