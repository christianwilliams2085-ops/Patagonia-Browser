import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:patagonia_browser/main.dart';
import 'package:patagonia_browser/src/youtube_protection.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TestController extends PlatformInAppWebViewController {
  TestController()
      : super.implementation(
          const PlatformInAppWebViewControllerCreationParams(id: 'test'),
        );

  InAppWebViewSettings? settings;
  final List<String> scripts = [];
  final List<String> calls = [];
  Completer<void>? nextSettings;

  @override
  Future<void> setSettings({required InAppWebViewSettings settings}) async {
    final pending = nextSettings;
    nextSettings = null;
    if (pending != null) await pending.future;
    this.settings = settings;
    calls.add('settings');
  }

  @override
  Future<void> addUserScripts({required List<UserScript> userScripts}) async {
    calls.add('scripts');
  }

  @override
  Future<void> removeUserScriptsByGroupName({required String groupName}) async {}

  @override
  Future<dynamic> evaluateJavascript({
    required String source,
    ContentWorld? contentWorld,
  }) async {
    scripts.add(source);
    calls.add('configure');
    return null;
  }

  @override
  Future<void> loadUrl({
    required URLRequest urlRequest,
    Uri? iosAllowingReadAccessTo,
    WebUri? allowingReadAccessTo,
  }) async {
    calls.add('load');
  }

  @override
  void dispose({bool isKeepAlive = false}) {}
}

class TestWebView extends PlatformInAppWebViewWidget {
  TestWebView(super.params) : super.implementation();

  @override
  Widget build(BuildContext context) => const SizedBox();

  @override
  T controllerFromPlatform<T>(PlatformInAppWebViewController controller) =>
      params.controllerFromPlatform!(controller) as T;

  @override
  void dispose() {}
}

class TestPlatform extends InAppWebViewPlatform {
  final controller = TestController();
  late PlatformInAppWebViewWidgetCreationParams params;

  @override
  PlatformInAppWebViewWidget createPlatformInAppWebViewWidget(
    PlatformInAppWebViewWidgetCreationParams params,
  ) {
    this.params = params;
    controller.settings ??= params.initialSettings;
    params.onWebViewCreated?.call(
      InAppWebViewController.fromPlatform(platform: controller),
    );
    return TestWebView(params);
  }
}

void main() {
  late TestPlatform platform;
  setUp(() {
    platform = TestPlatform();
    InAppWebViewPlatform.instance = platform;
    SharedPreferences.setMockInitialValues({
      'unprotectedHosts': ['m.youtube.com'],
    });
  });

  Future<void> start(WidgetTester tester) async {
    // Resolve native I/O before entering the fake frame clock. The tests
    // exercise navigation, not the test binding's asset loading scheduler.
    await tester.runAsync(() async {
      await SharedPreferences.getInstance();
      await YouTubeProtection.loadScript();
    });
    await tester.pumpWidget(const PatagoniaBrowserApp());
    await tester.pumpAndSettle();
  }

  Future<void> open(WidgetTester tester, String url) async {
    final address = find.byType(TextField).first;
    await tester.enterText(address, url);
    final submit = tester.widget<TextField>(address).onSubmitted!;
    late Future<void> navigation;
    await tester.runAsync(() async {
      navigation = (submit as Future<void> Function(String))(url);
    });
    var completed = false;
    Object? failure;
    navigation.then<void>((_) {
      completed = true;
    }, onError: (Object error, StackTrace stack) {
      failure = error;
      completed = true;
    });
    // Flutter's fake clock doesn't wait for filesystem/platform I/O, and
    // pumpAndSettle alone can return before initialization schedules a frame.
    for (var attempt = 0; attempt < 100 && !completed; attempt++) {
      await tester.pump();
      if (!completed) {
        await tester.runAsync(() =>
            Future<void>.delayed(const Duration(milliseconds: 10)));
      }
    }
    expect(failure, isNull);
    expect(completed, isTrue, reason: 'Navigation initialization did not finish');
    await tester.pumpAndSettle();
  }

  testWidgets('instala protección temprana y respeta una excepción guardada',
      (tester) async {
    await start(tester);
    await open(tester, 'https://m.youtube.com');

    expect(platform.params.initialSettings!.contentBlockers, isEmpty);
    final script = platform.params.initialUserScripts!.single;
    expect(script.injectionTime, UserScriptInjectionTime.AT_DOCUMENT_START);
    expect(script.forMainFrameOnly, isTrue);
    expect(script.source, contains('m.youtube.com'));
    expect(script.source, contains('__patagoniaYouTubeProtection'));
  });

  testWidgets('actualiza reglas antes de permitir una navegación principal',
      (tester) async {
    await start(tester);
    await open(tester, 'https://m.youtube.com');
    final controller = InAppWebViewController.fromPlatform(
      platform: platform.controller,
    );

    final decision = await platform.params.shouldOverrideUrlLoading!(
      controller,
      NavigationAction(
        request: URLRequest(url: WebUri('https://example.com')),
        isForMainFrame: true,
      ),
    );
    expect(decision, NavigationActionPolicy.ALLOW);
    expect(platform.controller.settings!.contentBlockers, hasLength(3));

    platform.params.onUpdateVisitedHistory!(
      controller,
      WebUri('https://m.youtube.com/watch?v=second'),
      false,
    );
    await tester.pumpAndSettle();
    expect(platform.controller.settings!.contentBlockers, isEmpty);
    expect(platform.controller.scripts.last, contains('m.youtube.com'));
  });

  testWidgets('la dirección aplica protección antes de cargar y no altera medios',
      (tester) async {
    await start(tester);
    await open(tester, 'https://m.youtube.com');
    await open(tester, 'https://example.com');
    expect(platform.controller.calls.indexOf('settings'),
        lessThan(platform.controller.calls.indexOf('load')));
    expect(platform.controller.settings!.mediaPlaybackRequiresUserGesture, isTrue);
    expect(platform.controller.settings!.allowsInlineMediaPlayback, isTrue);
  });

  testWidgets('una actualización demorada no restaura reglas de otro sitio',
      (tester) async {
    await start(tester);
    await open(tester, 'https://m.youtube.com');
    final controller = InAppWebViewController.fromPlatform(
      platform: platform.controller,
    );
    platform.params.onUpdateVisitedHistory!(
      controller,
      WebUri('https://m.youtube.com/watch?v=first'),
      false,
    );
    await tester.pumpAndSettle();

    final pending = Completer<void>();
    platform.controller.nextSettings = pending;
    platform.params.onUpdateVisitedHistory!(
      controller,
      WebUri('https://example.com'),
      false,
    );
    await tester.pump();
    platform.params.onUpdateVisitedHistory!(
      controller,
      WebUri('https://m.youtube.com/watch?v=second'),
      false,
    );
    pending.complete();
    await tester.pumpAndSettle();
    expect(platform.controller.settings!.contentBlockers, isEmpty);
  });
}
