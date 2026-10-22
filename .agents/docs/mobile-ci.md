# Native releases on Blacksmith

The **Mobile Release** GitHub Actions workflow builds Android on Blacksmith Linux and
iOS on Blacksmith Apple Silicon macOS. Expo Prebuild generates native projects; Gradle
and Xcode compile them; Fastlane signs and optionally uploads them. It does not call
EAS Build or EAS Submit. EAS Update still delivers compatible OTA updates through the
existing Docker release workflow.

Setup verified on **2026-10-21**: all eleven signing/upload secrets were copied from
existing EAS credentials into repository Actions secrets; the existing `EXPO_TOKEN`
was retained. The initial `MOBILE_BUILD_NUMBER_BASE` was **100**. Live store counters were iOS **6**
and Android **8**; workflow run 1, attempt 1 will allocate **100**. Environment
`mobile-store` requires approval from `amruthpillai`, allows self-review, disallows admin
bypass, and accepts only branch `main`. The workflow is manually dispatched after its
changes reach `main`; no Blacksmith app build or store upload was run during setup.

## One-time migration

Enable Blacksmith for this repository and confirm your plan covers macOS runners.
The workflows use `blacksmith-12vcpu-macos-latest` for iOS and Forme native prebuilds,
and `blacksmith-32vcpu-ubuntu-2404` for all their Linux jobs. Android builds cross-compile
device ABIs on the x64 Linux host; an ARM runner is not required. The latest macOS image
and its default Xcode can change; each iOS artifact records the Xcode version. Check
Apple's current minimum SDK requirements before uploading. Ruby, Fastlane and CocoaPods
dependencies are locked under `tooling/mobile`.

Download the **existing** Android upload keystore and iOS distribution certificate
(including its private key) and App Store provisioning profile using `eas credentials`
from `apps/mobile`. Do not generate replacement signing identities for this migration.
If using that CLI for iOS, set `EXPO_NO_CAPABILITY_SYNC=1`: Apple capabilities remain
managed manually. Native Apple sign-in uses the web Services ID `me.rxresu.web`;
neither this workflow nor Fastlane changes capabilities in Apple's portal.

Save these as **repository Actions secrets**, using GitHub's settings or a secure local
file as input to `gh secret set`. Never paste credentials into chat, source, logs or
workflow artifacts. Base64 is encoding, not encryption.

- `EXPO_TOKEN`: existing token, retained for production environment variables and OTA tooling.
- `ANDROID_KEYSTORE_BASE64`: base64 of the existing Android upload `.jks`.
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`:
  existing upload-keystore values.
- `IOS_DISTRIBUTION_P12_BASE64`: base64 of an Apple Distribution `.p12` containing
  the certificate and private key.
- `IOS_DISTRIBUTION_P12_PASSWORD`: password for that `.p12`.
- `IOS_PROVISION_PROFILE_BASE64`: base64 of the App Store profile for `me.rxresu`,
  team `654ASRW868`, covering the current app entitlements and certificate.
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`: raw service-account JSON with release-to-testing
  permission for this app. Required only for Android uploads.
- `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`: App Store Connect team API key ID,
  issuer UUID, and raw `.p8` private key. Required only for iOS uploads.

Play App Signing retains its existing app-signing certificate. Do not replace
`MOBILE_ANDROID_CERT_SHA256` with the upload-keystore fingerprint. Keep bundle/package
ID `me.rxresu`, Apple team, keychain groups, and associated domains unchanged.

Set repository Actions variable `MOBILE_BUILD_NUMBER_BASE` so the next workflow run
allocates a number **greater than every build number/version code already allocated
in EAS or uploaded to either store**. For next run number N and desired build B,
set the base to `B - (N - 1)`. Read current counters; do not use the historical 4/5
values in the handoff as live data.
The workflow allocates both platforms' versions as:

```text
MOBILE_BUILD_NUMBER_BASE + (GITHUB_RUN_NUMBER - 1)
```

Each new workflow run increments by one. Retries reuse the same build number;
if an upload already used that number, dispatch a fresh run instead of rebuilding
and uploading it again. The October 21 migration from the old 100-number stride
uses base **298**: run 3 already allocated 300, so run 4 allocates 301, then run 5
allocates 302. Change the base only while no release is running, and never reset
the workflow counter. Missing/invalid configuration and Android's 2,100,000,000
limit fail before compilation. Rerunning an older run after a newer upload can
produce an older version; dispatch a fresh run instead. Stop EAS store builds after migration so two
systems do not allocate competing versions. `eas.json` remains legacy configuration;
its remote counters and auto-increment do not govern this workflow.

Create GitHub environment **`mobile-store`**, restrict deployment branches to `main`,
and configure required reviewers if you want an approval before uploads. Merely naming
an environment does not enable required reviewers. Both workflow signing and upload
paths are manual, and signing is limited to `main`.

## Build and upload

1. Deploy backward-compatible backend changes first. Update app `version` in
   `apps/mobile/app.config.ts` when needed; iOS requires a new version string after a
   version has been released. CI supplies the build number automatically.
2. Dispatch **Mobile Release** on `main`, choose `all`, `android`, or `ios`, and leave
   **upload** disabled for the first signing check. The workflow validates credentials,
   runs mobile source checks, fetches checksum-pinned Forme binaries, loads the EAS
   `production` environment, and generates fresh native projects.
3. Inspect the signed artifacts, embedded production update channel, signing identities,
   versions, entitlements and native runtime. Artifacts include `release.json`,
   `fingerprint.json`, available source maps, and iOS symbols. Raw build logs are not
   uploaded because toolchains can include environment values in them. Download the
   fingerprint and keep it with the store release record before the 14-day Actions
   retention expires. Store binaries stay in workflow artifacts. Separately, each main
   push builds Android APKs for public sideloading through the same Fastlane build
   lane; see [nightly downloads](./mobile-release-handoff.md#nightly-android-downloads).
4. Dispatch with **upload** enabled when ready. Upload jobs start only after every
   selected platform built successfully, then pass the `mobile-store` environment gate.
   They publish the exact signed artifacts from that run. Android creates a **completed
   release on the internal testing track**, then promotes that exact version to every
   other existing testing track, including open and closed beta tracks. Production
   tracks are excluded. iOS waits for processing and assigns the build to **all existing
   TestFlight groups**, internal and external, submitting for beta review and notifying
   external testers when applicable. Configure at least one TestFlight group first.
   Store-side processing and beta review can delay availability; public store releases
   remain separate.
5. Confirm tester access, complete signed-device QA and store declarations, then
   submit for public review and production rollout in the consoles. Follow the
   [release handoff](./mobile-release-handoff.md#signed-device-test-matrix).

CI creates temporary signing files with restrictive permissions, imports the Apple
certificate into a temporary keychain, and removes the profile, keychain and temporary
files after the build. It never invokes capability synchronization or provisions new
Apple resources. Renew certificates/profiles before expiry and update Actions secrets.

## OTA compatibility and observability

The update URL, EAS project and fingerprint policy remain unchanged. The production
channel is explicitly embedded through `updates.requestHeaders`; nightly APK builds
select `preview` with `MOBILE_UPDATE_CHANNEL`. Setting a channel in
`eas.json` alone does not configure a build produced outside EAS Build. Build numbers
are excluded from Expo's normalized config fingerprint. Native project output and
generated Forme binaries remain excluded through `fingerprint.config.js`; reviewed
native sources and binary pins still determine compatibility.

After the first store-installed Blacksmith build, publish a matching OTA update through
the normal Docker release path, download it, restart the app and verify saved drafts on
both platforms. A native change requires a new store binary. Existing binaries keep
receiving updates for their compatible runtime; never force a runtime match.

EAS Observe instrumentation remains bundled. However, Expo currently supports native
embedded-bundle source-map uploads only for builds on EAS Build servers, so the new
embedded bundles do not have that managed symbolication/build-dashboard linkage.
Keep the generated maps/symbols for debugging. The Docker workflow still uses
`eas update --upload-source-maps`, preserving source-map uploads for OTA bundles.
No new monitoring service is introduced.

References: [Expo local production builds](https://docs.expo.dev/guides/local-app-production/),
[standalone EAS Update](https://docs.expo.dev/eas-update/standalone-service/),
[Observe error reporting](https://docs.expo.dev/eas/observe/errors/),
[Blacksmith runner images](https://docs.blacksmith.sh/blacksmith-runners/overview).
