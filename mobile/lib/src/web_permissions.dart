import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class WebPermissions {
  const WebPermissions._();

  static const channel = MethodChannel('com.patagoniabrowser/permissions');

  static String? name(PermissionResourceType resource) {
    if (resource == PermissionResourceType.CAMERA) return 'cámara';
    if (resource == PermissionResourceType.MICROPHONE) return 'micrófono';
    if (resource == PermissionResourceType.CAMERA_AND_MICROPHONE) {
      return 'cámara y micrófono';
    }
    return null;
  }

  static bool sameSecureOrigin(String origin, Uri? page) {
    final requested = Uri.tryParse(origin);
    return requested != null &&
        page != null &&
        requested.scheme == 'https' &&
        page.scheme == 'https' &&
        requested.host.isNotEmpty &&
        requested.origin == page.origin;
  }

  static Future<bool> requestDevice(List<String> permissions) async {
    if (defaultTargetPlatform != TargetPlatform.android) return true;
    try {
      return await channel.invokeMethod<bool>('request', permissions) ?? false;
    } on PlatformException {
      return false;
    } on MissingPluginException {
      return false;
    }
  }

  static List<String> devicePermissions(
    List<PermissionResourceType> resources,
  ) {
    return <String>{
      for (final resource in resources) ...[
        if (resource == PermissionResourceType.CAMERA ||
            resource == PermissionResourceType.CAMERA_AND_MICROPHONE)
          'camera',
        if (resource == PermissionResourceType.MICROPHONE ||
            resource == PermissionResourceType.CAMERA_AND_MICROPHONE)
          'microphone',
      ],
    }.toList();
  }
}
