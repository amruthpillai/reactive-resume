# Decisions (G1): native mobile app

This freezes README §1 with the spike results. Agents must not re-open these decisions. Owner gates are recorded in `ledger.md`.

## Stack

- **Framework:** Expo **SDK 58**, React Native 0.88.0, React 19.3.0. The New Architecture is on and the JavaScript engine is Hermes V1.
  - There is one React copy: the workspace catalog, Expo and `react-reconciler@0.34.0` all resolve to 19.3.0 (S2).
  - This supersedes the SDK 57 pin in README §1.2.
- **Preview:** rendered on the device. Of the owner-accepted options, this one was confirmed at G0.
  - The TypeScript templates, reconciler and `toFormeDocument` run on Hermes unchanged and with no polyfills. Their output deep-equals Node's on the first pass (S2).
  - The engine is `packages/forme-native`: the Rust crate `forme-pdf = "=0.28.0"` behind a C ABI, wrapped in an Expo module (Swift/Kotlin).
    - PDFs are byte-identical to the WASM build on iOS and Android (S1).
    - Render takes about 150–280 ms per resume on simulators and emulators. Physical devices are not yet measured.
    - It adds about 3.2 MB compressed to the download per platform.
  - Font subsetting uses HarfBuzz `hb-subset`, natively. Engine and fonts cross the module boundary as `subsetFont(bytes, text): Promise<Uint8Array>`.
- **Auth:** OAuth 2.1 authorization code with PKCE, in the system browser, against any server. The app registers itself per server through DCR and keeps its tokens in SecureStore (S3).
  - Send `resource=<origin>` on authorize, token and refresh.
  - Refresh is single-flight.
  - The callback is `https://<host>/auth/native-callback` through Universal Links and App Links. It is unproven until SV1 is on a public host.
- **Account security:** password, 2FA, passkeys, linked accounts, email, **API key creation and account deletion** happen in the web page, opened in the in-app browser tab. Profile, API key list/delete and data export are native (SV5).
- **Phone session:** grants that include `offline_access` are not bound to the browser session. Other tokens keep the `sid` check. JWTs stay valid for at most 1 h after revocation; revoking consent blocks them at once (SV4).
- **Design:** Direction B, as `mockups/all.html` (G2b). Tokens come from `mockups/tokens.md`.

## Constraints carried into the build

- **Download size (owner, 2026-10-17):** aim for **≤ 50 MB** per platform. This is a target, **not a hard limit**: do not block or fail work on it. Report the measured size at M8.
- **`packages/pdf`:** apply S2's `./native` adapter without the `arrayBuffer()` image fallback. Mobile streams images through `expo/fetch`.
- **Polyfills:**
  - `crypto.getRandomValues`, through `expo-crypto`. This is approved as an addition to the §1.4 dependency list.
  - `Array.prototype.toSorted`.
- **forme-native:** add `rust-toolchain.toml`, pin cbindgen, and add the turbo tags `runtime:native` and `role:rendering`.
- **EAS:** decide before M8 how EAS gets the native binaries; today `build.sh` runs only on macOS and the binaries are gitignored.
- **ATS:** the copy "checked on the server and not stored" depends on `/pdf-checks` staying storage-free.

## Distribution (owner, 2026-10-17)

- **App identity:** "Reactive Resume", iOS bundle ID and Android package `me.rxresu`, Apple Team ID `654ASRW868`.
- **EAS project:** ID `5830280e-e1ba-45b7-b9c9-ba048fa3bd4d`, Expo account `amruthpillai`. M1 sets `owner: "amruthpillai"` and `extra.eas.projectId` in `apps/mobile/app.config.ts`. The owner's `eas init` wrote a root `app.json` in the coordinator worktree; that file was removed after this was recorded.
  - Store-readiness verification on 2026-10-17 found the project now owned by organization `reactive-resume`. App config uses that verified owner; project ID remains unchanged. App Store Connect record is `6823975835` for `me.rxresu`.
- **Credentials:**
  - Credentials never enter the repo, briefs, reports or logs.
  - Agents never read `.p8` or `.p12` files.
  - EAS Submit uses an App Store Connect **Team** API key (`.p8` plus Key ID plus Issuer ID). The owner registers it with `eas credentials` or provides it through `eas.json` `ascApiKeyPath`, kept outside the repo.
  - The iOS distribution certificate and provisioning profile are managed by EAS.
- **App Store Connect Team API key (owner, 2026-10-17):** Key ID `A3C24C84AK`, Issuer ID `2f5e6721-4612-4d0f-9921-db83f3c51053`, role **Developer**. These IDs are not secret; the `.p8` file stays with the owner, outside the repo.
  - The Developer role can upload builds and manage internal TestFlight testing.
  - External TestFlight testing and creating the App Store app record need **App Manager** or **Admin**. Either the owner creates the app record by hand once (then set `ascAppId` in `eas.json`), or the key's role is raised to App Manager.
