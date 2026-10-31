package com.patagoniabrowser.patagonia_browser.gecko

import android.content.Context
import android.util.Log
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoRuntime
import org.mozilla.geckoview.GeckoRuntimeSettings
import org.mozilla.geckoview.WebExtension
import org.mozilla.geckoview.WebExtensionController

/**
 * Un solo motor Gecko por proceso (GeckoView no permite más de uno) y uBlock Origin
 * instalado tal cual, desde el .xpi oficial firmado por Mozilla que viene en el APK.
 */
object GeckoEngine {
    private const val TAG = "PatagoniaGecko"
    const val UBO_ID = "uBlock0@raymondhill.net"
    const val UBO_VERSION = "1.75.0"
    private const val UBO_XPI = "resource://android/assets/ublock_origin-$UBO_VERSION.xpi"

    private var runtime: GeckoRuntime? = null
    private var uboReady: GeckoResult<String>? = null

    fun runtime(context: Context): GeckoRuntime = runtime ?: GeckoRuntime.create(
        context.applicationContext,
        GeckoRuntimeSettings.Builder()
            .consoleOutput(false)
            .build(),
    ).also { runtime = it }

    /** Devuelve la versión de uBO activa. Se calcula una sola vez por proceso. */
    fun ensureUBlock(context: Context): GeckoResult<String> {
        uboReady?.let { return it }
        val controller = runtime(context).webExtensionController
        // Sin este delegate Gecko rechaza la instalación. Se acepta solo uBO.
        controller.promptDelegate = object : WebExtensionController.PromptDelegate {
            override fun onInstallPromptRequest(
                extension: WebExtension,
                permissions: Array<String>,
                origins: Array<String>,
                dataCollectionPermissions: Array<String>,
            ): GeckoResult<WebExtension.PermissionPromptResponse> {
                val ok = extension.id == UBO_ID
                return GeckoResult.fromValue(WebExtension.PermissionPromptResponse(ok, ok, false))
            }
        }

        val result = controller.list().then { list ->
            val existing = list?.firstOrNull { it.id == UBO_ID }
            when {
                existing == null || existing.metaData.version != UBO_VERSION -> {
                    Log.i(TAG, "Instalando uBlock Origin $UBO_VERSION")
                    controller.install(UBO_XPI).map { it?.metaData?.version ?: UBO_VERSION }
                }
                !existing.metaData.enabled ->
                    controller.enable(existing, WebExtensionController.EnableSource.USER)
                        .map { it?.metaData?.version ?: UBO_VERSION }
                else -> GeckoResult.fromValue(existing.metaData.version)
            }
        }
        // Si falla, la próxima pantalla lo vuelve a intentar.
        result.exceptionally<String> { error ->
            Log.e(TAG, "No se pudo preparar uBlock Origin", error)
            uboReady = null
            GeckoResult.fromException(error)
        }
        uboReady = result
        return result
    }
}
