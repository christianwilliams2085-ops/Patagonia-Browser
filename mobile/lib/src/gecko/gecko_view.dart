import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

/// Cómo se mete GeckoView adentro de Flutter. La prueba de fuego compara las tres.
enum GeckoComposition {
  /// Flutter dibuja la vista nativa en una textura (TLHC) y GeckoView usa TextureView.
  texture('Textura', 'Flutter dibuja la página como una imagen. Suele ser la más fluida.', 'texture', false),

  /// Composición híbrida de Flutter con GeckoView usando SurfaceView (lo normal en Firefox).
  hybridSurface('Híbrida + Surface', 'La página va en su propia capa, como en Firefox.', 'surface', true),

  /// Composición híbrida de Flutter con GeckoView usando TextureView.
  hybridTexture('Híbrida + Textura', 'Mezcla de las dos anteriores.', 'texture', true);

  const GeckoComposition(this.label, this.description, this.backend, this.hybrid);

  final String label;
  final String description;
  final String backend;
  final bool hybrid;
}

/// Habla con una vista GeckoView nativa (ver GeckoPlatformView.kt).
class GeckoController {
  GeckoController._(int id) : _channel = MethodChannel('patagonia/gecko_view_$id') {
    _channel.setMethodCallHandler(_onEvent);
  }

  final MethodChannel _channel;

  final ValueNotifier<String> url = ValueNotifier('');
  final ValueNotifier<String> title = ValueNotifier('');
  final ValueNotifier<int> progress = ValueNotifier(0);
  final ValueNotifier<bool> canGoBack = ValueNotifier(false);
  final ValueNotifier<bool> canGoForward = ValueNotifier(false);
  final ValueNotifier<bool> fullScreen = ValueNotifier(false);
  final ValueNotifier<bool> crashed = ValueNotifier(false);

  Future<void> _onEvent(MethodCall call) async {
    switch (call.method) {
      case 'location':
        url.value = call.arguments as String? ?? '';
      case 'title':
        title.value = call.arguments as String? ?? '';
      case 'progress':
        progress.value = call.arguments as int? ?? 0;
      case 'canGoBack':
        canGoBack.value = call.arguments == true;
      case 'canGoForward':
        canGoForward.value = call.arguments == true;
      case 'fullScreen':
        fullScreen.value = call.arguments == true;
      case 'crash':
        crashed.value = true;
    }
  }

  Future<void> load(String url) => _channel.invokeMethod('load', url);
  Future<void> back() => _channel.invokeMethod('back');
  Future<void> forward() => _channel.invokeMethod('forward');
  Future<void> reload() => _channel.invokeMethod('reload');
  Future<void> exitFullScreen() => _channel.invokeMethod('exitFullScreen');
  Future<void> setDesktop(bool enabled) => _channel.invokeMethod('setDesktop', enabled);

  void dispose() {
    _channel.setMethodCallHandler(null);
    for (final notifier in [url, title, progress, canGoBack, canGoForward, fullScreen, crashed]) {
      notifier.dispose();
    }
  }
}

/// Estado de uBlock Origin dentro del motor Gecko.
class GeckoEngineInfo {
  static const _channel = MethodChannel('patagonia/gecko_engine');

  /// Devuelve la versión de uBO instalada (lo instala si hace falta).
  static Future<String> ensureUBlock() async =>
      await _channel.invokeMethod<String>('ensureUBlock') ?? '';
}

/// Una página web con el motor Gecko, solo Android.
class GeckoBrowserView extends StatelessWidget {
  const GeckoBrowserView({
    super.key,
    required this.initialUrl,
    required this.composition,
    required this.onCreated,
  });

  static const viewType = 'patagonia/gecko_view';

  final String initialUrl;
  final GeckoComposition composition;
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
        final args = {'url': initialUrl, 'backend': composition.backend};
        final AndroidViewController controller = composition.hybrid
            ? PlatformViewsService.initExpensiveAndroidView(
                id: params.id,
                viewType: viewType,
                layoutDirection: TextDirection.ltr,
                creationParams: args,
                creationParamsCodec: const StandardMessageCodec(),
                onFocus: () => params.onFocusChanged(true),
              )
            : PlatformViewsService.initSurfaceAndroidView(
                id: params.id,
                viewType: viewType,
                layoutDirection: TextDirection.ltr,
                creationParams: args,
                creationParamsCodec: const StandardMessageCodec(),
                onFocus: () => params.onFocusChanged(true),
              );
        controller
          ..addOnPlatformViewCreatedListener(params.onPlatformViewCreated)
          ..addOnPlatformViewCreatedListener((id) => onCreated(GeckoController._(id)))
          ..create();
        return controller;
      },
    );
  }
}
