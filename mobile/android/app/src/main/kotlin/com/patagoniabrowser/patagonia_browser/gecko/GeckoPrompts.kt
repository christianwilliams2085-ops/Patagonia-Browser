package com.patagoniabrowser.patagonia_browser.gecko

import android.app.Activity
import android.app.AlertDialog
import android.app.DatePickerDialog
import android.app.Dialog
import android.app.TimePickerDialog
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.text.InputType
import android.widget.EditText
import android.widget.LinearLayout
import org.mozilla.geckoview.AllowOrDeny
import org.mozilla.geckoview.GeckoResult
import org.mozilla.geckoview.GeckoSession
import org.mozilla.geckoview.GeckoSession.PromptDelegate
import org.mozilla.geckoview.GeckoSession.PromptDelegate.BasePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.ChoicePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.DateTimePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.FilePrompt
import org.mozilla.geckoview.GeckoSession.PromptDelegate.PromptResponse
import java.util.Calendar
import java.util.Locale

/**
 * Los cuadros que piden las páginas: alert/confirm/prompt, listas desplegables (<select>),
 * fechas, usuario y contraseña, subir archivos, "¿salir de la página?". GeckoView no los trae
 * hechos: si no se programan, las listas desplegables y los botones de subir archivos no hacen nada.
 */
class GeckoPrompts : PromptDelegate {
    private val activity: Activity? get() = GeckoEngine.activity

    /** Cómo termina un cuadro. [handoff] = el cuadro se cierra pero sigue otro (fecha y después hora). */
    private class Finisher(private val onDone: (PromptResponse) -> Unit) {
        var done = false
        var handoff = false
        operator fun invoke(response: PromptResponse) {
            if (!done) {
                done = true
                onDone(response)
            }
        }
    }

    /** Arma el cuadro y lo cierra solo si la página cancela el pedido (por ejemplo, al navegar). */
    private fun show(
        prompt: BasePrompt,
        build: (Activity, Finisher) -> Dialog?,
    ): GeckoResult<PromptResponse> {
        val result = GeckoResult<PromptResponse>()
        val activity = activity
        if (activity == null || activity.isFinishing) {
            result.complete(prompt.dismiss())
            return result
        }
        val finish = Finisher { result.complete(it) }
        val dialog = build(activity, finish)
        if (dialog == null) {
            finish(prompt.dismiss())
            return result
        }
        dialog.setOnDismissListener { if (!finish.handoff) finish(prompt.dismiss()) }
        prompt.delegate = object : PromptDelegate.PromptInstanceDelegate {
            override fun onPromptDismiss(prompt: BasePrompt) {
                finish.done = true
                dialog.dismiss()
            }
        }
        dialog.show()
        return result
    }

    private fun builder(activity: Activity, title: String?) =
        AlertDialog.Builder(activity, android.R.style.Theme_DeviceDefault_Dialog_Alert).apply {
            if (!title.isNullOrBlank()) setTitle(title)
        }

    override fun onAlertPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.AlertPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        builder(activity, prompt.title)
            .setMessage(prompt.message)
            .setPositiveButton("Aceptar") { _, _ -> finish(prompt.dismiss()) }
            .create()
    }

    override fun onButtonPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.ButtonPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        builder(activity, prompt.title)
            .setMessage(prompt.message)
            .setPositiveButton("Aceptar") { _, _ ->
                finish(prompt.confirm(PromptDelegate.ButtonPrompt.Type.POSITIVE))
            }
            .setNegativeButton("Cancelar") { _, _ ->
                finish(prompt.confirm(PromptDelegate.ButtonPrompt.Type.NEGATIVE))
            }
            .create()
    }

    override fun onTextPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.TextPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        val input = EditText(activity).apply { setText(prompt.defaultValue ?: "") }
        builder(activity, prompt.title)
            .setMessage(prompt.message)
            .setView(padded(activity, input))
            .setPositiveButton("Aceptar") { _, _ -> finish(prompt.confirm(input.text.toString())) }
            .setNegativeButton("Cancelar") { _, _ -> finish(prompt.dismiss()) }
            .create()
    }

    override fun onAuthPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.AuthPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        val onlyPassword = prompt.authOptions.flags and
            PromptDelegate.AuthPrompt.AuthOptions.Flags.ONLY_PASSWORD != 0
        val user = EditText(activity).apply {
            hint = "Usuario"
            setText(prompt.authOptions.username ?: "")
        }
        val password = EditText(activity).apply {
            hint = "Contraseña"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
        }
        val fields = if (onlyPassword) listOf(password) else listOf(user, password)
        builder(activity, prompt.title ?: "Iniciar sesión")
            .setMessage(prompt.message)
            .setView(padded(activity, *fields.toTypedArray()))
            .setPositiveButton("Entrar") { _, _ ->
                finish(
                    if (onlyPassword) prompt.confirm(password.text.toString())
                    else prompt.confirm(user.text.toString(), password.text.toString()),
                )
            }
            .setNegativeButton("Cancelar") { _, _ -> finish(prompt.dismiss()) }
            .create()
    }

    override fun onChoicePrompt(
        session: GeckoSession,
        prompt: ChoicePrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        // Los grupos (<optgroup>) se muestran aplanados: el título del grupo no se puede elegir.
        val flat = ArrayList<ChoicePrompt.Choice>()
        fun add(choices: Array<ChoicePrompt.Choice>) {
            for (choice in choices) {
                if (choice.separator) continue
                flat.add(choice)
                choice.items?.let { add(it) }
            }
        }
        add(prompt.choices)
        val selectable = flat.filter { !it.disabled && it.items == null }
        if (selectable.isEmpty()) return@show null
        val labels = selectable.map { it.label }.toTypedArray()
        val b = builder(activity, prompt.title ?: prompt.message)
        if (prompt.type == ChoicePrompt.Type.MULTIPLE) {
            val checked = selectable.map { it.selected }.toBooleanArray()
            b.setMultiChoiceItems(labels, checked) { _, which, isChecked -> checked[which] = isChecked }
                .setPositiveButton("Aceptar") { _, _ ->
                    finish(prompt.confirm(selectable.filterIndexed { i, _ -> checked[i] }.toTypedArray()))
                }
                .setNegativeButton("Cancelar") { _, _ -> finish(prompt.dismiss()) }
        } else {
            val current = selectable.indexOfFirst { it.selected }
            b.setSingleChoiceItems(labels, current) { dialog, which ->
                finish(prompt.confirm(selectable[which]))
                dialog.dismiss()
            }
        }
        b.create()
    }

    override fun onDateTimePrompt(
        session: GeckoSession,
        prompt: DateTimePrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        val now = Calendar.getInstance()
        val parts = (prompt.defaultValue ?: "").split('-', 'T', ':').mapNotNull { it.toIntOrNull() }
        fun two(n: Int) = String.format(Locale.US, "%02d", n)
        when (prompt.type) {
            DateTimePrompt.Type.TIME -> {
                val hour = parts.getOrNull(0) ?: now.get(Calendar.HOUR_OF_DAY)
                val minute = parts.getOrNull(1) ?: now.get(Calendar.MINUTE)
                TimePickerDialog(activity, { _, h, m ->
                    finish(prompt.confirm("${two(h)}:${two(m)}"))
                }, hour, minute, true)
            }
            else -> {
                val year = parts.getOrNull(0) ?: now.get(Calendar.YEAR)
                val month = (parts.getOrNull(1) ?: (now.get(Calendar.MONTH) + 1)) - 1
                val day = if (prompt.type == DateTimePrompt.Type.DATE ||
                    prompt.type == DateTimePrompt.Type.DATETIME_LOCAL) {
                    parts.getOrNull(2) ?: now.get(Calendar.DAY_OF_MONTH)
                } else now.get(Calendar.DAY_OF_MONTH)
                DatePickerDialog(activity, { _, y, m, d ->
                    val date = "$y-${two(m + 1)}-${two(d)}"
                    when (prompt.type) {
                        DateTimePrompt.Type.MONTH -> finish(prompt.confirm("$y-${two(m + 1)}"))
                        DateTimePrompt.Type.WEEK -> {
                            val c = Calendar.getInstance().apply {
                                minimalDaysInFirstWeek = 4
                                firstDayOfWeek = Calendar.MONDAY
                                set(y, m, d)
                            }
                            finish(prompt.confirm("${c.weekYear}-W${two(c.get(Calendar.WEEK_OF_YEAR))}"))
                        }
                        DateTimePrompt.Type.DATETIME_LOCAL -> {
                            finish.handoff = true
                            val hour = parts.getOrNull(3) ?: now.get(Calendar.HOUR_OF_DAY)
                            val minute = parts.getOrNull(4) ?: now.get(Calendar.MINUTE)
                            TimePickerDialog(activity, { _, h, min ->
                                finish(prompt.confirm("${date}T${two(h)}:${two(min)}"))
                            }, hour, minute, true).apply {
                                setOnDismissListener { finish(prompt.dismiss()) }
                            }.show()
                        }
                        else -> finish(prompt.confirm(date))
                    }
                }, year, month, day)
            }
        }
    }

    override fun onColorPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.ColorPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        val input = EditText(activity).apply {
            setText(prompt.defaultValue ?: "#000000")
            hint = "#rrggbb"
        }
        builder(activity, prompt.title ?: "Elegí un color")
            .setView(padded(activity, input))
            .setPositiveButton("Aceptar") { _, _ ->
                val value = input.text.toString().trim()
                finish(
                    if (Regex("^#[0-9a-fA-F]{6}$").matches(value)) prompt.confirm(value.lowercase())
                    else prompt.dismiss(),
                )
            }
            .setNegativeButton("Cancelar") { _, _ -> finish(prompt.dismiss()) }
            .create()
    }

    override fun onBeforeUnloadPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.BeforeUnloadPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        builder(activity, "¿Salir de esta página?")
            .setMessage("Es posible que no se guarden los cambios que hiciste.")
            .setPositiveButton("Salir") { _, _ -> finish(prompt.confirm(AllowOrDeny.ALLOW)) }
            .setNegativeButton("Quedarme") { _, _ -> finish(prompt.confirm(AllowOrDeny.DENY)) }
            .create()
    }

    override fun onRepostConfirmPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.RepostConfirmPrompt,
    ): GeckoResult<PromptResponse> = show(prompt) { activity, finish ->
        builder(activity, "¿Volver a enviar el formulario?")
            .setMessage("La página va a enviar otra vez los datos que ya mandaste.")
            .setPositiveButton("Enviar") { _, _ -> finish(prompt.confirm(AllowOrDeny.ALLOW)) }
            .setNegativeButton("Cancelar") { _, _ -> finish(prompt.confirm(AllowOrDeny.DENY)) }
            .create()
    }

    /** Ventanas que una página intenta abrir sola, sin que la persona toque nada: se bloquean. */
    override fun onPopupPrompt(
        session: GeckoSession,
        prompt: PromptDelegate.PopupPrompt,
    ): GeckoResult<PromptResponse> = GeckoResult.fromValue(prompt.confirm(AllowOrDeny.DENY))

    override fun onFilePrompt(
        session: GeckoSession,
        prompt: FilePrompt,
    ): GeckoResult<PromptResponse> {
        val result = GeckoResult<PromptResponse>()
        val activity = activity
        if (activity == null || pendingFile != null) {
            result.complete(prompt.dismiss())
            return result
        }
        val mimes = prompt.mimeTypes?.filter { it.contains('/') }.orEmpty()
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = if (mimes.size == 1) mimes[0] else "*/*"
            if (mimes.size > 1) putExtra(Intent.EXTRA_MIME_TYPES, mimes.toTypedArray())
            if (prompt.type == FilePrompt.Type.MULTIPLE) putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
        }
        pendingFile = { resultCode, data ->
            val uris = ArrayList<Uri>()
            if (resultCode == Activity.RESULT_OK && data != null) {
                val clip = data.clipData
                if (clip != null) {
                    for (i in 0 until clip.itemCount) clip.getItemAt(i).uri?.let { uris.add(it) }
                } else data.data?.let { uris.add(it) }
            }
            result.complete(
                when {
                    uris.isEmpty() -> prompt.dismiss()
                    prompt.type == FilePrompt.Type.MULTIPLE -> prompt.confirm(activity, uris.toTypedArray())
                    else -> prompt.confirm(activity, uris[0])
                },
            )
        }
        try {
            activity.startActivityForResult(Intent.createChooser(intent, "Elegir archivo"), REQUEST_FILE)
        } catch (_: ActivityNotFoundException) {
            pendingFile = null
            result.complete(prompt.dismiss())
        }
        return result
    }

    private fun padded(activity: Activity, vararg views: android.view.View) =
        LinearLayout(activity).apply {
            orientation = LinearLayout.VERTICAL
            val pad = (20 * activity.resources.displayMetrics.density).toInt()
            setPadding(pad, pad / 2, pad, 0)
            views.forEach { addView(it) }
        }

    companion object {
        const val REQUEST_FILE = 4108
        private var pendingFile: ((Int, Intent?) -> Unit)? = null

        /** MainActivity pasa acá la respuesta del selector de archivos. */
        fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
            if (requestCode != REQUEST_FILE) return false
            val callback = pendingFile
            pendingFile = null
            callback?.invoke(resultCode, data)
            return true
        }
    }
}
