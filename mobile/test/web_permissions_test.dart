import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';
import 'package:patagonia_browser/src/web_permissions.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('limita permisos a la página HTTPS que los solicita', () {
    final page = Uri.parse('https://example.com/video');
    expect(
      WebPermissions.sameSecureOrigin('https://example.com', page),
      isTrue,
    );
    expect(
      WebPermissions.sameSecureOrigin('https://example.com:443', page),
      isTrue,
    );
    expect(WebPermissions.sameSecureOrigin('https://other.com', page), isFalse);
    expect(
      WebPermissions.sameSecureOrigin('http://example.com', page),
      isFalse,
    );
    expect(
      WebPermissions.sameSecureOrigin('https://example.com:8443', page),
      isFalse,
    );
    expect(
      WebPermissions.sameSecureOrigin('https://example.com', null),
      isFalse,
    );
  });

  test('identifica cámara y micrófono, sin conceder recursos desconocidos', () {
    expect(WebPermissions.name(PermissionResourceType.MIDI_SYSEX), isNull);
    expect(
      WebPermissions.devicePermissions([
        PermissionResourceType.CAMERA,
        PermissionResourceType.MICROPHONE,
        PermissionResourceType.CAMERA_AND_MICROPHONE,
      ]),
      ['camera', 'microphone'],
    );
  });

  test('respeta el rechazo de Android y los fallos del canal', () async {
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    addTearDown(
      () => messenger.setMockMethodCallHandler(WebPermissions.channel, null),
    );
    messenger.setMockMethodCallHandler(
      WebPermissions.channel,
      (call) async => false,
    );
    expect(await WebPermissions.requestDevice(['camera']), isFalse);
    messenger.setMockMethodCallHandler(
      WebPermissions.channel,
      (call) async => true,
    );
    expect(await WebPermissions.requestDevice(['camera']), isTrue);
    messenger.setMockMethodCallHandler(WebPermissions.channel, (call) async {
      throw PlatformException(code: 'closed');
    });
    expect(await WebPermissions.requestDevice(['camera']), isFalse);
  });
}
