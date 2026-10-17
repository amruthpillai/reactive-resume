package expo.modules.keycommands

import android.view.KeyEvent
import android.view.Window
import android.widget.EditText
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

internal class KeyCommandRecord(
  @Field var id: String = "",
  @Field var input: String = "",
  @Field var shift: Boolean = false,
  @Field var title: String = ""
) : Record

// Hardware keyboard shortcuts: Ctrl (or Meta) plus a key, caught in the activity window before the views. A focused
// text field keeps its own Ctrl+Z / Ctrl+Shift+Z.
class KeyCommandsModule : Module() {
  @Volatile private var commands: List<KeyCommandRecord> = emptyList()

  override fun definition() = ModuleDefinition {
    Name("KeyCommands")

    Events("onKeyCommand")

    Function("setCommands") { list: List<KeyCommandRecord> ->
      commands = list
      install()
    }

    // A recreated activity has a new window.
    OnActivityEntersForeground { install() }
  }

  private fun install() {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      val window = activity.window
      val current = window.callback
      if (current != null && current !is Shortcuts) window.callback = Shortcuts(current)
    }
  }

  private inner class Shortcuts(private val wrapped: Window.Callback) : Window.Callback by wrapped {
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
      if (event.action == KeyEvent.ACTION_DOWN && event.repeatCount == 0 && (event.isCtrlPressed || event.isMetaPressed)) {
        val char = event.getUnicodeChar(0)
        val input = if (char == 0) null else char.toChar().lowercase()
        val match = commands.firstOrNull { it.input == input && it.shift == event.isShiftPressed }
        val editing = appContext.currentActivity?.currentFocus is EditText
        if (match != null && !(editing && match.input == "z")) {
          sendEvent("onKeyCommand", mapOf("id" to match.id))
          return true
        }
      }
      return wrapped.dispatchKeyEvent(event)
    }
  }
}
