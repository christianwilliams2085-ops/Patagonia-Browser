import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:patagonia_browser/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TestWebPlatform extends InAppWebViewPlatform {
  final views = <TestWebWidget>[];
  @override
  PlatformInAppWebViewWidget createPlatformInAppWebViewWidget(
    PlatformInAppWebViewWidgetCreationParams params,
  ) {
    return TestWebWidget(params, views);
  }
}

class TestWebWidget extends PlatformInAppWebViewWidget {
  TestWebWidget(super.params, this.views) : super.implementation();
  final List<TestWebWidget> views;
  late final controller = TestWebController();
  bool created = false;
  bool disposed = false;
  dynamic get exposed =>
      params.controllerFromPlatform?.call(controller) ?? controller;

  @override
  Widget build(BuildContext context) => _TestNativeView(view: this);

  @override
  T controllerFromPlatform<T>(PlatformInAppWebViewController controller) =>
      (params.controllerFromPlatform?.call(controller) ?? controller) as T;
  @override
  void dispose() {
    disposed = true;
  }
}

class _TestNativeView extends StatefulWidget {
  const _TestNativeView({required this.view});
  final TestWebWidget view;
  @override
  State<_TestNativeView> createState() => _TestNativeState();
}

class _TestNativeState extends State<_TestNativeView> {
  late final TestWebWidget view = widget.view;
  @override
  void initState() {
    super.initState();
    view.views.add(view);
    view.created = true;
    view.controller.settings = view.params.initialSettings;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      view.params.onWebViewCreated?.call(view.exposed);
      final url = view.params.initialUrlRequest?.url;
      if (url != null) view.params.onLoadStart?.call(view.exposed, url);
    });
  }

  @override
  void dispose() {
    view.disposed = true;
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => const SizedBox.expand();
}

class TestWebController extends PlatformInAppWebViewController {
  TestWebController()
    : super.implementation(
        const PlatformInAppWebViewControllerCreationParams(id: 1),
      );
  InAppWebViewSettings? settings;
  int reloads = 0;
  final addedUserScripts = <UserScript>[];
  final removedUserScriptGroups = <String>[];
  @override
  Future<void> setSettings({required InAppWebViewSettings settings}) async {
    this.settings = settings;
  }

  @override
  Future<void> reload() async {
    reloads++;
  }

  @override
  Future<void> addUserScript({required UserScript userScript}) async {
    addedUserScripts.add(userScript);
  }

  @override
  Future<void> removeUserScriptsByGroupName({required String groupName}) async {
    removedUserScriptGroups.add(groupName);
  }

  @override
  Future<bool> canGoBack() async => false;
  @override
  Future<void> loadUrl({
    required URLRequest urlRequest,
    Uri? iosAllowingReadAccessTo,
    WebUri? allowingReadAccessTo,
  }) async {}
  @override
  Future<dynamic> evaluateJavascript({
    required String source,
    ContentWorld? contentWorld,
  }) async => null;
  @override
  void dispose({bool isKeepAlive = false}) {}
}

void main() {
  late TestWebPlatform platform;
  setUp(() {
    platform = TestWebPlatform();
    InAppWebViewPlatform.instance = platform;
    SharedPreferences.setMockInitialValues({});
  });

  Future<TestWebWidget> open(WidgetTester tester, String url) async {
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, url);
    await tester.testTextInput.receiveAction(TextInputAction.go);
    await tester.pumpAndSettle();
    return platform.views.last;
  }

  testWidgets('bloquea solicitudes reales sin interceptar el documento', (
    tester,
  ) async {
    final view = await open(tester, 'https://example.com');
    expect(view.controller.settings!.contentBlockers, isEmpty);
    expect(view.controller.settings!.thirdPartyCookiesEnabled, isFalse);
    expect(view.controller.settings!.allowBackgroundAudioPlaying, isTrue);
    expect(view.controller.settings!.mediaPlaybackRequiresUserGesture, isTrue);
    expect(view.params.initialUserScripts, hasLength(1));
    final preventiveScript = view.params.initialUserScripts!.single;
    expect(preventiveScript.groupName, 'patagonia-youtube-protection');
    expect(
      preventiveScript.injectionTime,
      UserScriptInjectionTime.AT_DOCUMENT_START,
    );
    expect(preventiveScript.source, contains('__patagoniaYoutubeAdsV3'));
    final blocked = await view.params.shouldInterceptRequest!(
      view.exposed,
      WebResourceRequest(
        url: WebUri('https://www.google-analytics.com/collect'),
        isForMainFrame: false,
      ),
    );
    expect(blocked!.statusCode, 403);
    final page = await view.params.shouldInterceptRequest!(
      view.exposed,
      WebResourceRequest(
        url: WebUri('https://doubleclick.net/'),
        isForMainFrame: true,
      ),
    );
    expect(page, isNull);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });

  testWidgets('restaura protección al seguir un enlace a otro sitio', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({
      'unprotectedHosts': ['example.com'],
    });
    final view = await open(tester, 'https://example.com');
    expect(view.controller.settings!.thirdPartyCookiesEnabled, isTrue);
    expect(view.controller.settings!.allowBackgroundAudioPlaying, isTrue);
    expect(view.params.initialUserScripts, isNull);
    final result = await view.params.shouldOverrideUrlLoading!(
      view.exposed,
      NavigationAction(
        request: URLRequest(url: WebUri('https://other.com')),
        isForMainFrame: true,
      ),
    );
    expect(result, NavigationActionPolicy.ALLOW);
    expect(view.controller.settings!.thirdPartyCookiesEnabled, isFalse);
    expect(
      view.controller.removedUserScriptGroups,
      contains('patagonia-youtube-protection'),
    );
    expect(view.controller.addedUserScripts, hasLength(1));
    expect(
      view.controller.addedUserScripts.single.injectionTime,
      UserScriptInjectionTime.AT_DOCUMENT_START,
    );
    await tester.pumpAndSettle();
  });

  testWidgets('la excepción se guarda y recarga el sitio', (tester) async {
    final view = await open(tester, 'https://example.com');
    await tester.tap(find.byTooltip('Centro de Privacidad'));
    await tester.pumpAndSettle();
    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();
    expect(view.controller.reloads, 1);
    expect(view.controller.settings!.thirdPartyCookiesEnabled, isTrue);
    expect(
      view.controller.removedUserScriptGroups,
      contains('patagonia-youtube-protection'),
    );
    expect(view.controller.addedUserScripts, isEmpty);
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getStringList('unprotectedHosts'), ['example.com']);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ignora eventos de una vista cerrada al volver al inicio', (
    tester,
  ) async {
    final view = await open(tester, 'https://example.com');
    await tester.tap(find.byTooltip('Inicio'));
    await tester.pumpAndSettle();
    view.params.onLoadStart!(view.exposed, WebUri('https://late.example.com'));
    view.params.onProgressChanged!(view.exposed, 50);
    await tester.pumpAndSettle();
    expect(find.text('Navegá libre. Navegá seguro.'), findsOneWidget);
    expect(
      tester.widget<TextField>(find.byType(TextField).first).controller!.text,
      isEmpty,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('conecta ventanas sin URL inicial usando windowId', (
    tester,
  ) async {
    final view = await open(tester, 'https://example.com');
    final accepted = await view.params.onCreateWindow!(
      view.exposed,
      CreateWindowAction(
        windowId: 42,
        request: URLRequest(),
        isForMainFrame: true,
        hasGesture: true,
      ),
    );
    await tester.pumpAndSettle();
    expect(accepted, isTrue);
    expect(platform.views.last.params.windowId, 42);
    expect(platform.views.last.params.initialUrlRequest, isNull);
  });

  testWidgets('deniega un permiso si cambia la página durante la consulta', (
    tester,
  ) async {
    final view = await open(tester, 'https://example.com');
    final response = view.params.onPermissionRequest!(
      view.exposed,
      PermissionRequest(
        origin: WebUri('https://example.com'),
        resources: [PermissionResourceType.CAMERA],
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Permitir cámara'), findsOneWidget);
    view.params.onLoadStart!(view.exposed, WebUri('https://other.com'));
    await tester.tap(find.text('Permitir'));
    await tester.pumpAndSettle();
    expect((await response)!.action, PermissionResponseAction.DENY);
  });

  testWidgets('recupera una vista cuyo proceso terminó', (tester) async {
    final view = await open(tester, 'https://example.com');
    view.params.onRenderProcessGone!(
      view.exposed,
      RenderProcessGoneDetail(
        didCrash: true,
        rendererPriorityAtExit: RendererPriority.RENDERER_PRIORITY_IMPORTANT,
      ),
    );
    await tester.pumpAndSettle();
    expect(view.disposed, isTrue);
    await tester.tap(find.text('Volver a intentar'));
    await tester.pumpAndSettle();
    expect(platform.views.length, 2);
    expect(
      platform.views.last.params.initialUrlRequest!.url!.host,
      'example.com',
    );
    expect(tester.takeException(), isNull);
  });
}
