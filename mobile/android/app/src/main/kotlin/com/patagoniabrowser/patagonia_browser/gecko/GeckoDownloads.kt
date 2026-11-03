package com.patagoniabrowser.patagonia_browser.gecko

import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.webkit.MimeTypeMap
import android.webkit.URLUtil
import org.mozilla.geckoview.WebResponse
import java.io.File
import java.io.OutputStream
import kotlin.concurrent.thread

/**
 * Descargas: Gecko entrega el archivo ya pedido (con la sesión iniciada de la persona) y Patagonia
 * lo guarda en la carpeta Descargas del teléfono.
 */
object GeckoDownloads {
    private const val TAG = "PatagoniaGecko"

    /** [notify] recibe ("start" | "done" | "error", nombre del archivo). */
    fun save(context: Context, response: WebResponse, notify: (String, String) -> Unit) {
        val body = response.body
        val disposition = response.headers["Content-Disposition"] ?: response.headers["content-disposition"]
        val mime = (response.headers["Content-Type"] ?: response.headers["content-type"])
            ?.substringBefore(';')?.trim()
        val name = URLUtil.guessFileName(response.uri, disposition, mime)
            .replace(Regex("[\\\\/:*?\"<>|]"), "_")
        if (body == null) {
            notify("error", name)
            return
        }
        notify("start", name)
        thread(name = "patagonia-descarga") {
            try {
                val (output, uri) = open(context, name, mime)
                body.use { input -> output.use { input.copyTo(it) } }
                uri?.let { finish(context, it) }
                notify("done", name)
            } catch (error: Exception) {
                Log.e(TAG, "No se pudo guardar la descarga", error)
                notify("error", name)
            }
        }
    }

    private fun open(context: Context, name: String, mime: String?): Pair<OutputStream, Uri?> {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, name)
                put(
                    MediaStore.Downloads.MIME_TYPE,
                    mime ?: MimeTypeMap.getSingleton()
                        .getMimeTypeFromExtension(name.substringAfterLast('.', "")) ?: "application/octet-stream",
                )
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: error("No se pudo crear el archivo")
            val stream = context.contentResolver.openOutputStream(uri) ?: error("No se pudo abrir el archivo")
            return stream to uri
        }
        // Android 8 y 9: carpeta de descargas propia de la app (no pide permisos).
        val dir = context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
        return File(dir, name).outputStream() to null
    }

    private fun finish(context: Context, uri: Uri) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return
        context.contentResolver.update(
            uri,
            ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) },
            null,
            null,
        )
    }
}
