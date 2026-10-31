package com.patagoniabrowser.patagonia_browser.gecko

import android.content.Context
import android.view.View
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.StandardMessageCodec
import io.flutter.plugin.platform.PlatformView
import io.flutter.plugin.platform.PlatformViewFactory
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSessionSettings
import org.mozilla.geckoview.GeckoView

/** Crea una vista GeckoView cada vez que Flutter pide un "patagonia/gecko_view". */
class GeckoViewFactory(private val messenger: BinaryMessenger) :
    PlatformViewFactory(StandardMessageCodec.INSTANCE) {
    override fun create(context: Context, viewId: Int, args: Any?): PlatformView =
        GeckoPlatformView(context, messenger, viewId, args as? Map<*, *> ?: emptyMap<Any, Any>())

    companion object {
        const val VIEW_TYPE = "patagonia/gecko_view"
    }
}

/**
 * Una pestaña Gecko mostrada adentro de Flutter. Habla con Dart por el canal
 * "patagonia/gecko_view_<id>": recibe órdenes (cargar, atrás...) y avisa cambios
 * (dirección, título, progreso, pantalla completa).
 */
class GeckoPlatformView(
    context: Context,
    messenger: BinaryMessenger,
    id: Int,
    params: Map<*, *>,
) : PlatformView, MethodChannel.MethodCallHandler {

    private val channel = MethodChannel(messenger, "patagonia/gecko_view_$id")
    private val geckoView = GeckoView(context)
    private val session = GeckoSession(GeckoSessionSettings.Builder().build())
    private var closed = false

    init {
        // Prueba de fuego: se puede elegir cómo dibuja GeckoView para ver cuál se lleva mejor con Flutter.
        geckoView.setViewBackend(
            if (params["backend"] == "surface") GeckoView.BACKEND_SURFACE_VIEW
            else GeckoView.BACKEND_TEXTURE_VIEW,
        )
        channel.setMethodCallHandler(this)

        session.navigationDelegate = object : GeckoSession.NavigationDelegate {
            override fun onLocationChange(
                session: GeckoSession,
                url: String?,
                perms: MutableList<GeckoSession.PermissionDelegate.ContentPermission>,
                hasUserGesture: Boolean,
            ) = send("location", url)

            override fun onCanGoBack(session: GeckoSession, canGoBack: Boolean) =
                send("canGoBack", canGoBack)

            override fun onCanGoForward(session: GeckoSession, canGoForward: Boolean) =
                send("canGoForward", canGoForward)
        }
        session.progressDelegate = object : GeckoSession.ProgressDelegate {
            override fun onProgressChange(session: GeckoSession, progress: Int) =
                send("progress", progress)
        }
        session.contentDelegate = object : GeckoSession.ContentDelegate {
            override fun onTitleChange(session: GeckoSession, title: String?) = send("title", title)
            override fun onFullScreen(session: GeckoSession, fullScreen: Boolean) =
                send("fullScreen", fullScreen)
            override fun onCrash(session: GeckoSession) = send("crash", null)
            override fun onKill(session: GeckoSession) = send("crash", null)
        }

        val runtime = GeckoEngine.runtime(context)
        session.open(runtime)
        geckoView.setSession(session)

        // Se espera a uBO antes de la primera carga, así ya sale filtrada.
        val initialUrl = params["url"] as? String ?: "https://m.youtube.com"
        GeckoEngine.ensureUBlock(context).accept(
            { if (!closed) session.loadUri(initialUrl) },
            { if (!closed) session.loadUri(initialUrl) },
        )
    }

    private fun send(method: String, value: Any?) {
        if (!closed) channel.invokeMethod(method, value)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        if (closed) return result.success(null)
        when (call.method) {
            "load" -> session.loadUri(call.arguments as String)
            "back" -> session.goBack()
            "forward" -> session.goForward()
            "reload" -> session.reload()
            "stop" -> session.stop()
            "exitFullScreen" -> session.exitFullScreen()
            "setDesktop" -> {
                val desktop = call.arguments == true
                session.settings.userAgentMode =
                    if (desktop) GeckoSessionSettings.USER_AGENT_MODE_DESKTOP
                    else GeckoSessionSettings.USER_AGENT_MODE_MOBILE
                session.settings.viewportMode =
                    if (desktop) GeckoSessionSettings.VIEWPORT_MODE_DESKTOP
                    else GeckoSessionSettings.VIEWPORT_MODE_MOBILE
                session.reload()
            }
            else -> return result.notImplemented()
        }
        result.success(null)
    }

    override fun getView(): View = geckoView

    override fun dispose() {
        closed = true
        channel.setMethodCallHandler(null)
        geckoView.releaseSession()
        session.close()
    }
}
