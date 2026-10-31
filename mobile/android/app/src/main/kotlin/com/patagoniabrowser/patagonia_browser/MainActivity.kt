package com.patagoniabrowser.patagonia_browser

import android.Manifest
import android.content.pm.PackageManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private var pending: MethodChannel.Result? = null
    private var requested: List<String> = emptyList()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger,
            "com.patagoniabrowser/permissions").setMethodCallHandler { call, result ->
            if (call.method != "request") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            val names = call.arguments as? List<*>
            if (pending != null || names.isNullOrEmpty() ||
                names.any { it !in listOf("camera", "microphone", "location") }) {
                result.success(false)
                return@setMethodCallHandler
            }
            val permissions = names.flatMap {
                when (it) {
                    "camera" -> listOf(Manifest.permission.CAMERA)
                    "microphone" -> listOf(Manifest.permission.RECORD_AUDIO)
                    else -> listOf(Manifest.permission.ACCESS_COARSE_LOCATION,
                        Manifest.permission.ACCESS_FINE_LOCATION)
                }
            }.distinct()
            if (granted(permissions)) {
                result.success(true)
                return@setMethodCallHandler
            }
            pending = result
            requested = permissions
            try {
                requestPermissions(permissions.toTypedArray(), REQUEST_PERMISSIONS)
            } catch (_: RuntimeException) {
                pending = null
                requested = emptyList()
                result.success(false)
            }
        }
    }

    private fun granted(permissions: List<String>): Boolean = permissions.all {
        if (it == Manifest.permission.ACCESS_FINE_LOCATION) {
            // Approximate location is a valid choice on Android 12+.
            checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) ==
                PackageManager.PERMISSION_GRANTED
        } else checkSelfPermission(it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>,
        grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_PERMISSIONS) {
            val result = pending
            val allowed = grantResults.isNotEmpty() && granted(requested)
            pending = null
            requested = emptyList()
            result?.success(allowed)
        }
    }

    override fun onDestroy() {
        pending?.success(false)
        pending = null
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_PERMISSIONS = 4107
    }
}
