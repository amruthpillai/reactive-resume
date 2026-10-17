#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
CBINDGEN_VERSION=0.29.4
if [[ "$(cbindgen --version 2>/dev/null || true)" != "cbindgen $CBINDGEN_VERSION" ]]; then
  echo "Install cbindgen $CBINDGEN_VERSION: cargo install cbindgen --version $CBINDGEN_VERSION --locked" >&2
  exit 1
fi
export IPHONEOS_DEPLOYMENT_TARGET=17.4
export ANDROID_NDK_HOME="${ANDROID_NDK_HOME:-$HOME/Library/Android/sdk/ndk/28.2.13676358}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
mkdir -p ../ios/include
cbindgen --config cbindgen.toml --crate forme-native --output ../ios/include/forme_native.h
# The module is the sole owner of allocations; callers always copy then free.
for target in aarch64-apple-ios aarch64-apple-ios-sim; do
  cargo build --locked --release --target "$target" -j "${CARGO_BUILD_JOBS:-4}"
  xcrun strip -S -x "target/$target/release/libforme_native.a"
done
rm -rf ../ios/FormeNative.xcframework
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libforme_native.a -headers ../ios/include \
  -library target/aarch64-apple-ios-sim/release/libforme_native.a -headers ../ios/include \
  -output ../ios/FormeNative.xcframework
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 --platform 24 -o ../android/src/main/jniLibs build --locked --release -j "${CARGO_BUILD_JOBS:-4}"
for library in ../android/src/main/jniLibs/*/libforme_native.so; do
  "$ANDROID_NDK_HOME/toolchains/llvm/prebuilt/darwin-x86_64/bin/llvm-strip" --strip-unneeded "$library"
done
