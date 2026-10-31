import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/main.dart';
import 'package:patagonia_browser/src/browser_shell.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Simula las vistas nativas GeckoView (GeckoPlatformView.kt) para probar la interfaz
/// de Patagonia con el motor de Android.
class FakeGecko {
  final views = <int, Map<String, Object?>>{};
  final calls = <int, List<MethodCall>>{};
  final engineCalls = <MethodCall>[];
  final permissionRequests = <List<Object?>>[];
  final disposed = <int>[];
  Map<String, Object?>? pageText;

  int get lastId => views.keys.last;
  List<String> methods(int id) => (calls[id] ?? []).map((c) => c.method).toList();

  void install(WidgetTester tester) {
    final messenger = tester.binding.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(SystemChannels.platform_views, (call) async {
      final args = call.arguments;
      switch (call.method) {
        case 'create':
          final map = args as Map;
          final id = map['id'] as int;
          final raw = map['params'] as Uint8List;
          final params = const StandardMessageCodec().decodeMessage(
            ByteData.sublistView(raw),
          ) as Map;
          views[id] = params.cast<String, Object?>();
          calls[id] = [];
          messenger.setMockMethodCallHandler(
            MethodChannel('patagonia/gecko_view_$id'),
            (viewCall) async {
              calls[id]!.add(viewCall);
              if (viewCall.method == 'readPage') return pageText;
              return null;
            },
          );
          return id;
        case 'resize':
          final map = args as Map;
          return {'width': map['width'], 'height': map['height']};
        case 'dispose':
          final id = args is Map ? args['id'] : args;
          if (id is int) disposed.add(id);
          return null;
      }
      return null;
    });
    messenger.setMockMethodCallHandler(
      const MethodChannel('patagonia/gecko_engine'),
      (call) async {
        engineCalls.add(call);
        if (call.method == 'ensureUBlock') return '1.75.0';
        if (call.method == 'openUBlockPanel') return true;
        return null;
      },
    );
    messenger.setMockMethodCallHandler(
      const MethodChannel('com.patagoniabrowser/permissions'),
      (call) async {
        permissionRequests.add(call.arguments as List<Object?>);
        return true;
      },
    );
  }

  /// La vista nativa le avisa algo a Dart. Devuelve la respuesta de Dart (si la hay).
  Future<Object?> emit(
    WidgetTester tester,
    int id,
    String method, [
    Object? arguments,
  ]) {
    const codec = StandardMethodCodec();
    final reply = Completer<Object?>();
    tester.binding.defaultBinaryMessenger.handlePlatformMessage(
      'patagonia/gecko_view_$id',
      codec.encodeMethodCall(MethodCall(method, arguments)),
      (data) => reply.complete(data == null ? null : codec.decodeEnvelope(data)),
    );
    return reply.future;
  }
}

void main() {
  late FakeGecko gecko;

  setUp(() {
    BrowserShell.debugUseGecko = true;
    gecko = FakeGecko();
  });
  tearDown(() => BrowserShell.debugUseGecko = null);

  Future<int> open(
    WidgetTester tester,
    String url, {
    Map<String, Object> preferences = const {},
  }) async {
    SharedPreferences.setMockInitialValues(preferences);
    gecko.install(tester);
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, url);
    await tester.testTextInput.receiveAction(TextInputAction.go);
    await tester.pumpAndSettle();
    return gecko.lastId;
  }

  Future<void> loadPage(
    WidgetTester tester,
    int id,
    String url,
    String title,
  ) async {
    await gecko.emit(tester, id, 'pageStart', url);
    await gecko.emit(tester, id, 'location', url);
    await gecko.emit(tester, id, 'title', title);
    await gecko.emit(tester, id, 'pageStop', true);
    await tester.pumpAndSettle();
  }

  testWidgets('abre la página en GeckoView y la guarda en el historial', (
    tester,
  ) async {
    final id = await open(tester, 'example.com');
    expect(gecko.views[id]!['url'], 'https://example.com');
    expect(gecko.views[id]!['active'], isTrue);
    expect(gecko.views[id]!['desktop'], isFalse);

    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getStringList('history')!.single, contains('Ejemplo'));
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      'https://example.com/',
    );

    await tester.tap(find.byTooltip('Agregar a favoritos'));
    await tester.pumpAndSettle();
    expect(
      preferences.getStringList('favorites')!.single,
      contains('https://example.com/'),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('mantiene favoritos e historial guardados por la versión anterior', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'favorites': ['{"title":"Diario","url":"https://diario.com.ar/"}'],
      'history': ['{"title":"Clima","url":"https://clima.com/"}'],
    });
    gecko.install(tester);
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Menú'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Favoritos'));
    await tester.pumpAndSettle();
    expect(find.text('Diario'), findsOneWidget);
    await tester.tap(find.text('Diario'));
    await tester.pumpAndSettle();
    expect(gecko.views[gecko.lastId]!['url'], 'https://diario.com.ar/');

    await tester.tap(find.byTooltip('Menú'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Historial'));
    await tester.pumpAndSettle();
    expect(find.text('Clima'), findsOneWidget);
  });

  testWidgets('atrás, adelante, recargar y el botón Atrás del teléfono', (
    tester,
  ) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');

    await tester.tap(find.byTooltip('Atrás'));
    await tester.pumpAndSettle();
    expect(gecko.methods(id), isNot(contains('back')));

    await gecko.emit(tester, id, 'canGoBack', true);
    await gecko.emit(tester, id, 'canGoForward', true);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Atrás'));
    await tester.tap(find.byTooltip('Adelante'));
    await tester.tap(find.byTooltip('Recargar'));
    await tester.pumpAndSettle();
    expect(gecko.methods(id), containsAll(['back', 'forward', 'reload']));

    // Atrás del teléfono: primero navega hacia atrás en la página...
    gecko.calls[id]!.clear();
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(gecko.methods(id), contains('back'));

    // ...y si no hay a dónde volver, vuelve al inicio de Patagonia.
    await gecko.emit(tester, id, 'canGoBack', false);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(find.text('Navegá libre. Navegá seguro.'), findsOneWidget);
  });

  testWidgets('modo escritorio por pestaña', (tester) async {
    final id = await open(tester, 'https://example.com');
    await tester.tap(find.byTooltip('Menú'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sitio de escritorio'));
    await tester.pumpAndSettle();
    final call = gecko.calls[id]!.lastWhere((c) => c.method == 'setDesktop');
    expect(call.arguments, isTrue);
  });

  testWidgets('una ventana nueva abre una pestaña y la anterior queda en pausa', (
    tester,
  ) async {
    final first = await open(tester, 'https://example.com');
    final accepted = gecko.emit(tester, first, 'newWindow', {
      'id': 7,
      'url': 'https://login.example.com/',
    });
    await tester.pumpAndSettle();
    expect(await accepted, isTrue);
    final second = gecko.lastId;
    expect(second, isNot(first));
    expect(gecko.views[second]!['windowId'], 7);
    expect(gecko.views[second]!['url'], isNull);
    expect(find.text('2'), findsOneWidget);
    final setActive = gecko.calls[first]!.lastWhere((c) => c.method == 'setActive');
    expect(setActive.arguments, isFalse);

    // La página de la ventana pide cerrarse (por ejemplo, al terminar de iniciar sesión).
    await gecko.emit(tester, second, 'closeRequest');
    await tester.pumpAndSettle();
    expect(find.text('1'), findsOneWidget);
    expect(
      gecko.calls[first]!.lastWhere((c) => c.method == 'setActive').arguments,
      isTrue,
    );
  });

  testWidgets('no abre ventanas de esquemas raros', (tester) async {
    final id = await open(tester, 'https://example.com');
    final accepted = gecko.emit(tester, id, 'newWindow', {
      'id': 8,
      'url': 'javascript:alert(1)',
    });
    await tester.pumpAndSettle();
    expect(await accepted, isFalse);
    expect(find.text('1'), findsOneWidget);
  });

  testWidgets('pregunta antes de dar la cámara y pide el permiso de Android', (
    tester,
  ) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    final answer = gecko.emit(tester, id, 'permission', {
      'origin': 'https://example.com/videollamada',
      'kinds': ['camera', 'microphone'],
    });
    await tester.pumpAndSettle();
    expect(find.text('Permitir cámara y micrófono'), findsOneWidget);
    await tester.tap(find.text('Permitir'));
    await tester.pumpAndSettle();
    expect(await answer, isTrue);
    expect(gecko.permissionRequests.single, ['camera', 'microphone']);
  });

  testWidgets('niega el permiso si la página cambia mientras pregunta', (
    tester,
  ) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    final answer = gecko.emit(tester, id, 'permission', {
      'origin': 'https://example.com/',
      'kinds': ['location'],
    });
    await tester.pumpAndSettle();
    expect(find.text('Permitir tu ubicación'), findsOneWidget);
    await gecko.emit(tester, id, 'pageStart', 'https://other.com/');
    await tester.tap(find.text('Permitir'));
    await tester.pumpAndSettle();
    expect(await answer, isFalse);
  });

  testWidgets('niega permisos de otro sitio o sin https', (tester) async {
    final id = await open(tester, 'http://example.com');
    await loadPage(tester, id, 'http://example.com/', 'Ejemplo');
    final answer = gecko.emit(tester, id, 'permission', {
      'origin': 'http://example.com/',
      'kinds': ['camera'],
    });
    await tester.pumpAndSettle();
    expect(await answer, isFalse);
    expect(find.text('Permitir cámara'), findsNothing);
  });

  testWidgets('el escudo abre el panel de uBlock Origin', (tester) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    await tester.tap(find.byTooltip('Centro de Privacidad'));
    await tester.pumpAndSettle();
    expect(find.byType(Switch), findsNothing);
    expect(find.textContaining('uBlock Origin'), findsWidgets);
    await tester.tap(find.text('Protección en este sitio'));
    await tester.pumpAndSettle();
    expect(gecko.engineCalls.map((c) => c.method), contains('openUBlockPanel'));
  });

  testWidgets('avisa una vez los sitios que tenían la protección apagada', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'unprotectedHosts': ['banco.com.ar'],
    });
    gecko.install(tester);
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
    expect(find.text('Nueva protección'), findsOneWidget);
    expect(find.textContaining('banco.com.ar'), findsOneWidget);
    await tester.tap(find.text('Entendido'));
    await tester.pumpAndSettle();
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getBool('geckoProtectionNoticeShown'), isTrue);
    expect(preferences.getStringList('unprotectedHosts'), ['banco.com.ar']);
  });

  testWidgets('muestra el error de Patagonia y vuelve a intentar', (tester) async {
    final id = await open(tester, 'https://example.com');
    await gecko.emit(tester, id, 'pageStart', 'https://example.com/');
    await gecko.emit(tester, id, 'loadError', 'https://example.com/');
    // Gecko carga una página vacía en lugar de su página de error.
    await gecko.emit(tester, id, 'pageStart', 'about:blank');
    await gecko.emit(tester, id, 'pageStop', false);
    await tester.pumpAndSettle();
    expect(find.text('Volver a intentar'), findsOneWidget);
    await tester.tap(find.text('Volver a intentar'));
    await tester.pumpAndSettle();
    expect(find.text('Volver a intentar'), findsNothing);
    expect(gecko.calls[id]!.last.method, 'load');
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getStringList('history'), isNull);
  });

  testWidgets('si la pestaña se cierra sola, Volver a intentar arma otra', (
    tester,
  ) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    await gecko.emit(tester, id, 'crash');
    await tester.pumpAndSettle();
    expect(find.textContaining('La página se cerró'), findsOneWidget);
    await tester.tap(find.text('Volver a intentar'));
    await tester.pumpAndSettle();
    expect(gecko.lastId, isNot(id));
    expect(gecko.views[gecko.lastId]!['url'], 'https://example.com/');
  });

  testWidgets('pantalla completa esconde las barras y Atrás la cierra', (
    tester,
  ) async {
    final id = await open(tester, 'https://m.youtube.com');
    await gecko.emit(tester, id, 'fullScreen', true);
    await tester.pumpAndSettle();
    expect(find.byTooltip('Menú'), findsNothing);
    // La página sigue siendo la misma vista (el video no se corta).
    expect(gecko.lastId, id);
    expect(gecko.disposed, isEmpty);
    await tester.binding.handlePopRoute();
    await tester.pumpAndSettle();
    expect(gecko.methods(id), contains('exitFullScreen'));
    await gecko.emit(tester, id, 'fullScreen', false);
    await tester.pumpAndSettle();
    expect(find.byTooltip('Menú'), findsOneWidget);
  });

  testWidgets('Patagonia AI lee el texto con el lector de Gecko', (tester) async {
    final id = await open(tester, 'https://example.com');
    await loadPage(tester, id, 'https://example.com/', 'Ejemplo');
    gecko.pageText = {
      'title': 'Ejemplo',
      'url': 'https://example.com/',
      'text':
          'La Patagonia es una región geográfica del extremo sur de América. Tiene lagos, montañas y glaciares enormes.',
    };
    await tester.tap(find.byTooltip('Patagonia AI'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const ValueKey('assistant-input')),
      'Resumí esta página',
    );
    await tester.tap(find.byTooltip('Enviar mensaje'));
    await tester.pumpAndSettle();
    expect(gecko.methods(id), contains('readPage'));
    expect(find.textContaining('región geográfica'), findsOneWidget);
  });

  testWidgets('muestra licencias de uBlock Origin y GeckoView', (tester) async {
    SharedPreferences.setMockInitialValues({});
    gecko.install(tester);
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Menú'));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Acerca de y licencias'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Acerca de y licencias'));
    await tester.pumpAndSettle();
    expect(find.text('uBlock Origin 1.75.0'), findsOneWidget);
    expect(find.text('GeckoView 159'), findsOneWidget);
    await tester.tap(find.text('Ver licencia (GPLv3)'));
    await tester.pumpAndSettle();
    expect(find.textContaining('GNU GENERAL PUBLIC LICENSE'), findsOneWidget);
  });

  testWidgets('avisa las descargas', (tester) async {
    final id = await open(tester, 'https://example.com');
    await gecko.emit(tester, id, 'download', {'status': 'done', 'name': 'boleta.pdf'});
    await tester.pump();
    expect(find.text('Descarga lista: boleta.pdf (carpeta Descargas).'), findsOneWidget);
  });
}
