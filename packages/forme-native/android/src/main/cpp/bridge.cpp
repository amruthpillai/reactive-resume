#include <jni.h>
#include "forme_native.h"

extern "C" JNIEXPORT jobjectArray JNICALL
Java_expo_modules_formenative_FormeNativeModule_execute(JNIEnv *env, jobject, jbyteArray input, jbyteArray text, jboolean subset) {
  auto input_len = env->GetArrayLength(input);
  auto text_len = env->GetArrayLength(text);
  auto input_bytes = env->GetByteArrayElements(input, nullptr);
  if (!input_bytes) return nullptr;
  auto text_bytes = env->GetByteArrayElements(text, nullptr);
  if (!text_bytes) { env->ReleaseByteArrayElements(input, input_bytes, JNI_ABORT); return nullptr; }
  auto result = subset
    ? forme_subset_font(reinterpret_cast<uint8_t *>(input_bytes), input_len, reinterpret_cast<uint8_t *>(text_bytes), text_len)
    : forme_render_with_layout(reinterpret_cast<uint8_t *>(input_bytes), input_len);
  env->ReleaseByteArrayElements(input, input_bytes, JNI_ABORT);
  env->ReleaseByteArrayElements(text, text_bytes, JNI_ABORT);
  auto byte_array_class = env->FindClass("[B");
  auto output = env->NewObjectArray(4, byte_array_class, nullptr);
  if (output) {
    FormeBuffer buffers[] = {result->pdf, result->layout, result->warnings, result->error};
    for (int i = 0; i < 4; i++) {
      auto bytes = env->NewByteArray(static_cast<jsize>(buffers[i].len));
      if (!bytes) break;
      if (buffers[i].len) env->SetByteArrayRegion(bytes, 0, static_cast<jsize>(buffers[i].len), reinterpret_cast<jbyte *>(buffers[i].data));
      env->SetObjectArrayElement(output, i, bytes);
      env->DeleteLocalRef(bytes);
      if (env->ExceptionCheck()) break;
    }
  }
  forme_result_free(result);
  return output;
}
