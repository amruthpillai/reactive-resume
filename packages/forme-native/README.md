# Native Forme bridge

Expo SDK 58 / React Native 0.88 module backed by `forme-pdf = "=0.28.0"`. No WASM or WebView is used by the renderer or subsetter.

## Build

Install rustup, Xcode, Android SDK/NDK 28.2.13676358, cargo-ndk 4.1.2 and **cbindgen 0.29.4**, then run:

```sh
cargo install cbindgen --version 0.29.4 --locked
cargo install cargo-ndk --version 4.1.2 --locked
bash packages/forme-native/rust/build.sh
```

`rust/rust-toolchain.toml` pins Rust **1.95.0** and installs the two iOS and three Android targets through rustup. `build.sh` rejects any other cbindgen version before generating files. Run Cargo commands from `rust/` so rustup picks up that pin. The build script currently requires macOS; EAS binary delivery remains an M8 task.

This generates `ios/include/forme_native.h`, `ios/FormeNative.xcframework` (arm64 device and simulator), and Android `src/main/jniLibs/{arm64-v8a,armeabi-v7a,x86_64}/libforme_native.so`. Generated binaries are ignored; build them before Expo prebuild/pod install/Gradle. `CARGO_BUILD_JOBS` defaults to 4. Commit the Cargo lockfile with version changes.

Add this workspace package to the Expo app. Expo autolinking discovers its Swift and Kotlin modules. The Android adapter builds a small JNI library with CMake. The iOS deployment target is 17.4 and Android minimum is API 24.

## JavaScript API

```ts
import { fetch } from "expo/fetch";
import { nativeEngine, renderSerializedDocWithLayout, subsetFont } from "@reactive-resume/forme-native";
import { configureFontReader, configureImageFetch, downloadFont, renderResumePdf } from "@reactive-resume/pdf/native";

const result = await renderSerializedDocWithLayout(document);
// result.pdf: Uint8Array; result.layout and result.warnings match the core types.
const subset: Uint8Array = await subsetFont(fontBytes, documentText);

// Configure once at startup. A disk-cache wrapper must use downloadFont on disk errors.
configureFontReader(downloadFont);
configureImageFetch((source, init) => fetch(String(source), init));
const pdf = await renderResumePdf(nativeEngine, { data, onPageMap, onLostCharacters });
```

Both expensive operations execute on dedicated serial native workers: a Swift dispatch queue on iOS and an executor-backed coroutine scope on Android, separate from Expo's shared async queue. Android closes the worker when the module is destroyed. Expo still handles result conversion and Promise rejection. JSON serialization and font-byte base64 encoding still run in JavaScript. Only `fonts[].src` `Uint8Array` sources become data URIs, without mutating the input. Font/image URLs must be resolved by the caller; this bridge performs no downloads. Both operations reject on invalid input; Rust panics are contained at the C ABI. Out-of-memory aborts cannot be recovered.

`nativeEngine` is structurally compatible with `FormeEngine` from `@reactive-resume/pdf/native`. Its async font preparer adds generated digits, hyphens and fallback punctuation, caches the last prepared data URI per font/character set, and embeds the full font if subsetting fails, matching the browser policy. `subsetFont` remains available for direct use; do not pass it into the synchronous browser `createFontPreparer`.

`configureImageFetch` requires a streaming response body. Images stop downloading at 12 MB; there is no whole-body fallback. The app owns persistent font caching through `configureFontReader`; `downloadFont` retains the Google-host fallback and shared font conversion stays inside `packages/pdf`.

HarfBuzz 8.4.0 is bundled through `harfbuzz-sys 0.8.0`. Its subsetter preserves Unicode mapping and all layout features, matching the browser policy. Typst `subsetter` was rejected because it removes the Unicode cmap and targets already-shaped PDF glyph embedding.

Native `serde_json` writes absent `style.backgroundColor` as `null`; WASM's `serde_wasm_bindgen` writes `undefined`, omitted when JSON is saved. S1 lists every such difference. No layout geometry or warning differences are accepted silently.

## C ABI

Use the generated header. `forme_render_with_layout` and `forme_subset_font` return owned `FormeResult` pointers. Input spans must remain valid during each call. Copy outputs before calling `forme_result_free` exactly once; subset bytes occupy `result.pdf`. `result.error.len > 0` denotes failure. Freeing a null result is allowed. Never free buffers separately or mix allocators.

Fixtures and their fonts are test-only and are not imported by the module. Font licenses are in `fixtures/licenses`. Reproduction app and scripts live under `apps/spike-s1`; that scratch app is excluded from integration.
