# Native Forme bridge

Expo SDK 57 module backed by `forme-pdf = "=0.28.0"`. No WASM or WebView is used by the renderer or subsetter.

## Build

Install Rust targets and tools from the S1 brief, Xcode, Android SDK/NDK 28.2.13676358, then run:

```sh
bash packages/forme-native/rust/build.sh
```

This generates `ios/include/forme_native.h`, `ios/FormeNative.xcframework` (arm64 device and simulator), and Android `src/main/jniLibs/{arm64-v8a,armeabi-v7a,x86_64}/libforme_native.so`. Generated binaries are ignored; build them before Expo prebuild/pod install/Gradle. `CARGO_BUILD_JOBS` defaults to 4. Commit the Cargo lockfile with version changes.

Add this workspace package to the Expo app. Expo autolinking discovers its Swift and Kotlin modules. The Android adapter builds a small JNI library with CMake. The iOS deployment target is 17.4 and Android minimum is API 24.

## JavaScript API

```ts
import { renderSerializedDocWithLayout, subsetFont } from "@reactive-resume/forme-native";

const result = await renderSerializedDocWithLayout(document);
// result.pdf: Uint8Array; result.layout and result.warnings match the core types.
const subset: Uint8Array = await subsetFont(fontBytes, documentText);
```

Both expensive operations execute on native worker queues. JSON serialization and font-byte base64 encoding still run in JavaScript. Font `Uint8Array` sources become data URIs without mutating the input. Font/image URLs must be resolved by the caller; this bridge performs no downloads. Both operations reject on invalid input; Rust panics are contained at the C ABI. Out-of-memory aborts cannot be recovered.

`subsetFont` is asynchronous by coordinator decision. It can be injected into `FormeEngine.prepareFont`; do not pass it into the synchronous browser `createFontPreparer`. Callers must include generated characters (digits, hyphens, fallback punctuation) in the requested text, as the browser preparer does.

HarfBuzz 8.4.0 is bundled through `harfbuzz-sys 0.8.0`. Its subsetter preserves Unicode mapping and all layout features, matching the browser policy. Typst `subsetter` was rejected because it removes the Unicode cmap and targets already-shaped PDF glyph embedding.

Native `serde_json` writes absent `style.backgroundColor` as `null`; WASM's `serde_wasm_bindgen` writes `undefined`, omitted when JSON is saved. S1 lists every such difference. No layout geometry or warning differences are accepted silently.

## C ABI

Use the generated header. `forme_render_with_layout` and `forme_subset_font` return owned `FormeResult` pointers. Input spans must remain valid during each call. Copy outputs before calling `forme_result_free` exactly once; subset bytes occupy `result.pdf`. `result.error.len > 0` denotes failure. Freeing a null result is allowed. Never free buffers separately or mix allocators.

Fixtures and their fonts are test-only and are not imported by the module. Font licenses are in `fixtures/licenses`. Reproduction app and scripts live under `apps/spike-s1`; that scratch app is excluded from integration.
