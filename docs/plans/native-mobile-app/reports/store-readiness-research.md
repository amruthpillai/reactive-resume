# Store readiness: live release prerequisites

Observed **2026-10-17**, approximately 13:45–13:50 UTC. Read-only research; no installations, signing changes, uploads, credential contents, or app-source edits. Existing plans are context only; findings below come from current files, CLI output, public endpoints, and artifact inspection.

## Blocking gaps

| Evidence | Impact | Smallest remedy |
| --- | --- | --- |
| `eas project:info --json` from `apps/mobile` fails: project owner `reactive-resume` disagrees with configured owner `amruthpillai`. Authenticated account has Owner access to both. | EAS project commands fail before building. | Set app owner to existing project's actual owner; preserve project ID `5830280e-e1ba-45b7-b9c9-ba048fa3bd4d`. Re-run project-info before builds. |
| `packages/forme-native/scripts/prebuilt.json` has `artifacts: []`. This worktree contains no generated Forme `.so`/xcframework. `eas-build-pre-install` runs fetcher, which requires exactly one matching source/version pin. | Both EAS platform builds fail before dependency installation. | Build/publish reviewed immutable Forme archive and pin exact source hash/checksum, or use a complete reviewed local-build path with generated native artifacts. Never fabricate a checksum or weaken validation. |
| `eas.json` has `ascAppId: "0000000000"`. | iOS submission targets a placeholder rather than verified App Store Connect app. | Find/create actual app record for bundle ID `me.rxresu`; set its numeric ASC app ID. |
| Configured ASC `.p8` and Google service-account JSON files do not exist at configured paths. Existence only checked. | Current EAS Submit profiles cannot authenticate through those files. | Configure actual private credential paths or supported managed credential method; verify permissions privately. No secrets belong in source. |
| Both `https://rxresu.me/.well-known/apple-app-site-association` and `/assetlinks.json` return HTTP 200, `text/plain; charset=UTF-8`, body `OK` (2 bytes). | Neither is a valid association document. iOS HTTPS auth callback and Android verified App Links cannot be considered functional. Android installed app reports `rxresu.me: 1024`, not verified. | Deploy JSON association routes before review. Apple app ID must match `654ASRW868.me.rxresu` and include callback/webcredentials configuration. Android must use package `me.rxresu` and actual Play app-signing certificate SHA-256 fingerprints, not merely debug/upload-key fingerprints. Retest association on installed signed builds. |
| Only found APK is debug-signed, version code 1. No AAB, IPA or archive found in this worktree. | Existing emulator installation does not prove release signing or store submission readiness. | Produce and validate signed production artifacts from the final source, then test through actual distribution tracks. |

The app's configured Android submit destination is `internal`, `releaseStatus: draft`. That prepares a draft internal release; it does not publish production. iOS binary upload likewise does not complete App Store metadata or submit an app version for review.

## Toolchain verified

- Xcode **27.1**, build **27A9275**; active developer directory `/Applications/Xcode.app/Contents/Developer`.
- iPhoneOS and iPhoneSimulator SDK **27.1**. Exceeds Apple's current minimum Xcode 26 / iOS SDK 26 upload requirement.
- Java **17.0.20.1**; EAS CLI **25.1.1**, Node **24.22.0**; EAS session authenticated. Login alone does not establish Apple/Google console access.
- Android platforms installed: API 33, 34, 35, 36, 36.1, 37.0. NDK **28.2.13676358** installed, matching Forme Gradle/build script.
- `cbindgen 0.29.4` and `cargo-ndk 4.1.2` match native build-script pins. Rust target availability/build success not checked.
- Android emulator `emulator-5594` online; `getconf PAGE_SIZE` returns **16384**. Package `me.rxresu` installed.

## Existing Android artifact verified

Artifact: `/tmp/rr-android-download/reactive-resume-android-arm64.apk`.

- SHA-256: `dc109c9b4ec2feb106b58641906b0a09287bf370f7800ab56b25c31d84969af0`.
- Size: 70,933,214 bytes; package `me.rxresu`, version `1.0.0`, version code `1`.
- **minSdk 24, targetSdk 36, compileSdk 37**, read from binary manifest via Android SDK `aapt dump badging`. No generated Android app Gradle project exists in this worktree, so source-generated target config was not independently verified.
- **Debug certificate** (`CN=Android Debug`), confirmed by `apksigner verify --print-certs`. Not suitable evidence of production signing.
- All **34 packaged arm64 `.so` libraries** have LOAD alignment **0x4000** (16 KB), inspected using NDK `llvm-readelf -lW`. Includes Forme Rust library, JNI bridge, Hermes, React Native and third-party libraries.
- `zipalign -c -P 16 -v 4` passes.
- Native alignment and ZIP alignment checks pass for this arm64 APK only. Other ABIs, final AAB-generated APKs, RELRO/runtime behavior, PDF rendering and latest working-tree changes remain unverified.

## Native distribution config

`packages/forme-native/ios/FormeNative.podspec` requires iOS 17.4 and vendors `FormeNative.xcframework`; Android module pins NDK 28.2.13676358, minSdk 24, ABIs arm64-v8a, armeabi-v7a, x86_64. Rust build script builds arm64 iOS device/simulator static libraries and all three Android ABIs.

`.github/workflows/mobile-forme-native.yml` builds both platforms, checks notices/header, packs content-addressed artifacts, validates local fetch for each platform, and optionally publishes a prerelease. Workflow presence does not prove dispatch or successful publication. No remote workflow/release status checked here.

## Official submission facts checked

- Apple uploads require Xcode 26+ / iOS SDK 26+ since April 28, 2026; minimum iOS/iPadOS deployment target 13+ since September 9, 2026. Current configured iOS 17.4 minimum satisfies the latter. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/)
- Google new app/update target requirement is **API 36+** since August 31, 2026, subject to documented extensions. Existing APK meets this requirement; final artifact must be checked again. [Google target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- Android current 16 KB documentation states incompatible app updates cannot release starting **February 1, 2027**. Check current Play Console rather than relying on old deadline notes. [Android page sizes](https://developer.android.com/guide/practices/page-sizes)
- **First Android upload need not be manual.** Current official Expo documentation, fetched through Context7, explicitly says `eas submit` can create the first internal release when Play app exists and service-account access is configured; manual first upload is optional. Any earlier claim that Google mandates manual first upload is stale. [Expo Android submission](https://docs.expo.dev/submit/android/) · [Manual submission](https://docs.expo.dev/submit/android-manual/)
- `assetlinks.json` must be HTTPS, nonredirecting, JSON content type and include matching package/signing certificates. Under Play App Signing, the Play app-signing fingerprint can differ from local/upload signing. [Android association configuration](https://developer.android.com/training/app-links/configure-assetlinks)
- See [mobile store review checklist](../../../contributing/mobile-store-review.md) for review policy and manual signed-build gates. Store listing, privacy/Data safety answers, reviewer credentials, age ratings, AI reporting process and provider/data handling remain release-owner verification tasks.

## Verification boundary

No store credentials read; no uploads, publishing or external changes performed. No Apple/Google app record, signing entitlement, production certificates, final release binary, store metadata or review submission verified. Passing existing arm64 APK alignment checks is useful evidence, but this worktree is **not submission-ready** while the concrete blockers above remain.
