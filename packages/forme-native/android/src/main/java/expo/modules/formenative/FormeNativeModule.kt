package expo.modules.formenative

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class FormeNativeModule : Module() {
  companion object { init { System.loadLibrary("formenative_jni") } }
  private external fun execute(input: ByteArray, text: ByteArray, subset: Boolean): Array<ByteArray>

  override fun definition() = ModuleDefinition {
    Name("FormeNative")
    AsyncFunction("renderWithLayout") { json: String ->
      val result = execute(json.toByteArray(Charsets.UTF_8), byteArrayOf(), false)
      checkResult(result)
      mapOf("pdf" to result[0], "layout" to result[1].toString(Charsets.UTF_8),
            "warnings" to result[2].toString(Charsets.UTF_8))
    }
    AsyncFunction("subsetFont") { font: ByteArray, text: String ->
      val result = execute(font, text.toByteArray(Charsets.UTF_8), true)
      checkResult(result)
      result[0]
    }
  }

  private fun checkResult(result: Array<ByteArray>) {
    if (result[3].isNotEmpty()) throw IllegalArgumentException(result[3].toString(Charsets.UTF_8))
  }
}
