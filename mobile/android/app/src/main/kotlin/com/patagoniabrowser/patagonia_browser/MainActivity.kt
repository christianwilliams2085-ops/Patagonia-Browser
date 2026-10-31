package com.patagoniabrowser.patagonia_browser

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.content.res.Configuration
import com.patagoniabrowser.patagonia_browser.gecko.AndroidPermissionRequester
import com.patagoniabrowser.patagonia_browser.gecko.GeckoEngine
import com.patagoniabrowser.patagonia_browser.gecko.GeckoPrompts
import com.patagoniabrowser.patagonia_browser.gecko.GeckoViewFactory
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity(), AndroidPermissionRequester {
    private var pending: ((Boolean) -> Unit)? = null
    private var requested: List<String> = emptyList()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        val messenger = flutterEngine.dartExecutor.binaryMessenger
        GeckoEngine.activity = this

        // Motor GeckoView: una vista nativa por pestaña y el canal general (uBlock Origin).
        flutterEngine.platformViewsController.registry.registerViewFactory(
            GeckoViewFactory.VIEW_TYPE, GeckoViewFactory(messenger))
        val engineChannel = MethodChannel(messenger, "patagonia/gecko_engine")
        GeckoEngine.channel = engineChannel
        engineChannel.setMethodCallHandler { call, result ->
            when (call.method) {
                "ensureUBlock" -> GeckoEngine.ensureUBlock(this).accept(
                    { version -> result.success(version) },
                    { error -> result.error("ubo", error?.message ?: "error desconocido", null) },
                )
                "openUBlockPanel" -> result.success(GeckoEngine.openUBlockPanel())
                "dropPending" -> {
                    (call.arguments as? Number)?.toInt()?.let { GeckoEngine.dropPending(it) }
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }

        MethodChannel(messenger, "com.patagoniabrowser/permissions").setMethodCallHandler { call, result ->
            if (call.method != "request") {
                result.notImplemented()
                return@setMethodCallHandler
            }
            val names = call.arguments as? List<*>
            if (names.isNullOrEmpty() ||
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
            requestAndroidPermissions(permissions) { result.success(it) }
        }
    }

    override fun requestAndroidPermissions(permissions: List<String>, done: (Boolean) -> Unit) {
        if (granted(permissions)) return done(true)
        if (pending != null) return done(false)
        pending = done
        requested = permissions
        try {
            requestPermissions(permissions.toTypedArray(), REQUEST_PERMISSIONS)
        } catch (_: RuntimeException) {
            pending = null
            requested = emptyList()
            done(false)
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
            val callback = pending
            val allowed = grantResults.isNotEmpty() && granted(requested)
            pending = null
            requested = emptyList()
            callback?.invoke(allowed)
        }
    }

    @Deprecated("Selector de archivos de las páginas (GeckoPrompts)")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (!GeckoPrompts.onActivityResult(requestCode, resultCode, data)) {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        // Gecko necesita enterarse cuando se gira el celular o cambia el tamaño de letra.
        GeckoEngine.runtime(this).configurationChanged(newConfig)
    }

    override fun onDestroy() {
        pending?.invoke(false)
        pending = null
        if (GeckoEngine.activity === this) {
            GeckoEngine.activity = null
            GeckoEngine.channel = null
        }
        super.onDestroy()
    }

    companion object {
        private const val REQUEST_PERMISSIONS = 4107
    }
}
