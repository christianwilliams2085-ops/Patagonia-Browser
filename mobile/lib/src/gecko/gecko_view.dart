import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Lo que avisa una pestaña Gecko (ver GeckoPlatformView.kt). Todo es opcional.
class GeckoEvents {
  const GeckoEvents({
    this.onLocation,
    this.onTitle,
    this.onProgress,
    this.onCanGoBack,
    this.onCanGoForward,
    this.onPageStart,
    this.onPageStop,
    this.onLoadError,
    this.onFullScreen,
    this.onCrash,
    this.onCloseRequest,
    this.onNewWindow,
    this.onPermission,
    this.onDownload,
  });

  final ValueChanged<String>? onLocation;
  final ValueChanged<String>? onTitle;
  final ValueChanged<int>? onProgress;
  final ValueChanged<bool>? onCanGoBack;
  final ValueChanged<bool>? onCanGoForward;
  final ValueChanged<String>? onPageStart;
  final ValueChanged<bool>? onPageStop;
  final ValueChanged<String>? onLoadError;
  final ValueChanged<bool>? onFullScreen;
  final VoidCallback? onCrash;
  final VoidCallback? onCloseRequest;

  /// Una página abre una ventana nueva. Devolver true la muestra en una pestaña nueva
  /// con `windowId: id`; false la cancela.
  final Future<bool> Function(int id, String url)? onNewWindow;

  /// La página pide `kinds` ('camera', 'microphone', 'location') para `origin`.
  final Future<bool> Function(String origin, List<String> kinds)? onPermission;

  /// status: 'start' | 'done' | 'error'.
  final void Function(String status, String name)? onDownload;
}

/// Texto de la página para el asistente, leído por la extensión patagonia_lector.
class GeckoPageText {
  const GeckoPageText({required this.title, required this.url, required this.text});

  final String title;
  final String url;
  final String text;
}

/// Habla con una pestaña GeckoView nativa.
class GeckoController {
  GeckoController(int id, this.events)
    : _channel = MethodChannel('patagonia/gecko_view_$id') {
    _channel.setMethodCallHandler(_onEvent);
  }

  final MethodChannel _channel;
  final GeckoEvents events;
  bool _disposed = false;

  static String _text(Object? value) => value is String ? value : '';

  Future<Object?> _onEvent(MethodCall call) async {
    if (_disposed) return null;
    final value = call.arguments;
    switch (call.method) {
      case 'location':
        events.onLocation?.call(_text(value));
      case 'title':
        events.onTitle?.call(_text(value));
      case 'progress':
        events.onProgress?.call(value is int ? value : 0);
      case 'canGoBack':
        events.onCanGoBack?.call(value == true);
      case 'canGoForward':
        events.onCanGoForward?.call(value == true);
      case 'pageStart':
        events.onPageStart?.call(_text(value));
      case 'pageStop':
        events.onPageStop?.call(value == true);
      case 'loadError':
        events.onLoadError?.call(_text(value));
      case 'fullScreen':
        events.onFullScreen?.call(value == true);
      case 'crash':
        events.onCrash?.call();
      case 'closeRequest':
        events.onCloseRequest?.call();
      case 'newWindow':
        final map = value is Map ? value : const {};
        final id = map['id'];
        if (id is! int) return false;
        return await events.onNewWindow?.call(id, _text(map['url'])) ?? false;
      case 'permission':
        final map = value is Map ? value : const {};
        final kinds = (map['kinds'] as List? ?? const [])
            .whereType<String>()
            .toList();
        return await events.onPermission?.call(_text(map['origin']), kinds) ??
            false;
      case 'download':
        final map = value is Map ? value : const {};
        events.onDownload?.call(_text(map['status']), _text(map['name']));
    }
    return null;
  }

  Future<void> _call(String method, [Object? arguments]) async {
    if (_disposed) return;
    try {
      await _channel.invokeMethod<void>(method, arguments);
    } on MissingPluginException {
      // La vista nativa ya se cerró.
    }
  }

  Future<void> load(String url) => _call('load', url);
  Future<void> back() => _call('back');
  Future<void> forward() => _call('forward');
  Future<void> reload() => _call('reload');
  Future<void> stop() => _call('stop');
  Future<void> exitFullScreen() => _call('exitFullScreen');
  Future<void> setDesktop(bool enabled) => _call('setDesktop', enabled);
  Future<void> setActive(bool active) => _call('setActive', active);

  /// null si la página no se puede leer (o no contesta a tiempo).
  Future<GeckoPageText?> readPage() async {
    if (_disposed) return null;
    try {
      final value = await _channel.invokeMethod<Object?>('readPage');
      if (value is! Map) return null;
      return GeckoPageText(
        title: _text(value['title']),
        url: _text(value['url']),
        text: _text(value['text']),
      );
    } on PlatformException {
      return null;
    } on MissingPluginException {
      return null;
    }
  }

  void dispose() {
    _disposed = true;
    _channel.setMethodCallHandler(null);
  }
}

/// Canal general del motor: uBlock Origin y pestañas que abre uBO por su cuenta.
class GeckoEngineInfo {
  const GeckoEngineInfo._();

  static const channel = MethodChannel('patagonia/gecko_engine');

  /// Avisos del motor. [onPanel] muestra el panel de uBO (sesión `id`);
  /// [onExtensionTab] abre una pestaña de uBO (configuración, registro).
  static void listen({
    required ValueChanged<int> onPanel,
    required Future<bool> Function(int id, String url) onExtensionTab,
  }) {
    channel.setMethodCallHandler((call) async {
      final value = call.arguments;
      switch (call.method) {
        case 'uboPanel':
          if (value is int) onPanel(value);
        case 'extensionTab':
          final map = value is Map ? value : const {};
          final id = map['id'];
          if (id is! int) return false;
          final url = map['url'];
          return onExtensionTab(id, url is String ? url : '');
      }
      return null;
    });
  }

  static void stopListening() => channel.setMethodCallHandler(null);

  /// Devuelve la versión de uBO instalada (lo instala si hace falta).
  static Future<String> ensureUBlock() async =>
      await channel.invokeMethod<String>('ensureUBlock') ?? '';

  /// Abre el panel de uBO de la pestaña que se ve. false si uBO todavía no está listo.
  static Future<bool> openUBlockPanel() async {
    try {
      return await channel.invokeMethod<bool>('openUBlockPanel') ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  /// Libera una sesión que se preparó pero nunca se llegó a mostrar.
  static Future<void> dropPending(int id) async {
    try {
      await channel.invokeMethod<void>('dropPending', id);
    } on PlatformException {
      // Nada que liberar.
    } on MissingPluginException {
      // Nada que liberar.
    }
  }
}

/// Una página web con el motor Gecko (solo Android).
///
/// Se dibuja como textura dentro de Flutter (TLHC) con GeckoView en TextureView: es la
/// combinación que anduvo bien en la prueba de fuego. Así los menús y hojas de Patagonia
/// se pueden mostrar encima de la página.
class GeckoBrowserView extends StatelessWidget {
  const GeckoBrowserView({
    super.key,
    this.initialUrl,
    this.windowId,
    this.desktop = false,
    this.active = true,
    this.popup = false,
    required this.events,
    required this.onCreated,
  });

  static const viewType = 'patagonia/gecko_view';

  /// Página a abrir. Se ignora si hay [windowId] (la sesión ya existe del lado nativo).
  final String? initialUrl;
  final int? windowId;
  final bool desktop;
  final bool active;

  /// Panel de una extensión (uBO): se muestra, pero no cuenta como pestaña.
  final bool popup;
  final GeckoEvents events;
  final void Function(GeckoController controller) onCreated;

  @override
  Widget build(BuildContext context) {
    return PlatformViewLink(
      viewType: viewType,
      surfaceFactory: (context, controller) => AndroidViewSurface(
        controller: controller as AndroidViewController,
        // La página se queda con todos los gestos: scroll, pellizco, toques.
        gestureRecognizers: const <Factory<OneSequenceGestureRecognizer>>{
          Factory<OneSequenceGestureRecognizer>(EagerGestureRecognizer.new),
        },
        hitTestBehavior: PlatformViewHitTestBehavior.opaque,
      ),
      onCreatePlatformView: (params) {
        final controller = PlatformViewsService.initSurfaceAndroidView(
          id: params.id,
          viewType: viewType,
          layoutDirection: TextDirection.ltr,
          creationParams: <String, Object?>{
            'url': initialUrl,
            'windowId': windowId,
            'desktop': desktop,
            'active': active,
            'popup': popup,
          },
          creationParamsCodec: const StandardMessageCodec(),
          onFocus: () => params.onFocusChanged(true),
        );
        controller
          ..addOnPlatformViewCreatedListener(params.onPlatformViewCreated)
          ..addOnPlatformViewCreatedListener(
            (id) => onCreated(GeckoController(id, events)),
          )
          ..create();
        return controller;
      },
    );
  }
}
