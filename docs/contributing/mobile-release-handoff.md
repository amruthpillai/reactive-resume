# Mobile release handoff

Last updated: **2026-10-18**. Branch: `mobile/native-app`. **Not ready for store submission yet.** Uploaded binaries, saved listing drafts, passing source checks, production deployment, device verification, and store approval are separate states.

This is the operational handoff. See [mobile-store-review.md](./mobile-store-review.md) for policy sources, detailed verification history, report-queue SQL, and issue triage; see [store metadata](../../apps/mobile/store/README.md) for localization mappings.

## Finish these gates before submission

- [ ] Build and distribute fresh iOS/Android binaries with OTA configuration below; previously uploaded builds 4/5 do not contain the update client. Verify an actual downloaded update on both platforms.
- [ ] Owner merges and deploys matching server/web changes and database migration to the Frankfurt Docker Swarm installation. Publish the updated privacy policy and acceptable-use terms on the documentation site too.
- [ ] Configure production association and Apple sign-in environment below. Verify actual association JSON, browser-to-native callbacks, clean Apple/GitHub login, and reviewer sign-in after deployment.
- [ ] Configure testers, distribute iOS build 4 through TestFlight and Android version code 5 through Play internal testing, and install both from the stores. Android tester Google-account email and iPhone/iPad TestFlight device confirmation were requested but remain outstanding.
- [ ] Complete the signed-device matrix below. Record device/OS, build, result, and any remaining failure. A successful upload or simulator run does not close this gate.
- [ ] Replace reconstructed phone/tablet screen portions in listing designs with matching release-build captures. Export and upload screenshots for every supported device slot and requested locale. Review translations with native-language readers, especially RTL and script shaping.
- [ ] Test real AI/provider behavior with fictional data and adversarial prompts. Verify disclosure/decline, output reporting, moderation receipt, and chosen providers' retention/data-use practices. Keep reviewer AI access usable without personal API keys or honestly resolve the review-access limitation before submission.
- [ ] Recheck Apple/Google declarations against the deployed behavior, selected providers, and final screenshots. Retest private reviewer credentials immediately before submitting.
- [ ] Resolve actual console validation errors and pre-launch/device failures. Only then send for review. No App Review or production Play submission was sent during this work.

## Already prepared

| Area                 | Recorded state                                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety/account flows | Per-operation AI consent at transport boundary; private AI/public-resume reports; local shared-author blocking; direct browser account-deletion confirmation; bounded Apple token-revocation attempt                 |
| Branding             | New native icons/splash and PWA icons; iOS Donate row hidden as a conservative first-release choice                                                                                                                  |
| Native artifacts     | iOS 1.0.0 (4) processed VALID and attached to App Store version; Android 1.0.0 version code 5 processed in internal-track draft                                                                                      |
| Localization         | Titles/descriptions saved and reread in both stores for English, Spanish, French, German, Brazilian Portuguese, Simplified Chinese, Japanese, Korean, Hindi, Arabic, and Indonesian                                  |
| Artwork              | Play icon and all 11 localized feature graphics saved; full reload confirmed distinct persisted graphics. No phone/tablet screenshot panels uploaded                                                                 |
| Apple forms          | Privacy responses published, Content Rights saved with owner affirmation, age 13+ override, free price, 175 regions on manual release; private reviewer credentials saved per owner                                  |
| Google forms         | Sign-in access, no ads, category/support details, target ages 13–15/16–17/18+, IARC, Advertising ID No, and Data safety saved. App content page reported no outstanding declarations; changes still await submission |
| Reviewer account     | Owner created account; browser login succeeded; fictional resume, cover letter, and saved job application seeded. Owner confirms credentials saved privately in both stores                                          |

Brand is **Reactive Resume**, `rxresume`, or `reactive-resume`. The official domain `rxresu.me`, scheme/package `me.rxresu`, and registered Apple Services ID are existing technical identifiers; do not rename them casually.

## Production deployment and quirks

Owner controls merge/deployment. Backend runs on a VPS in Frankfurt, Germany, using Docker Swarm. Do not infer deployment from a Git push or a successful image build.

### Image publishing is not automatic Swarm deployment

The checked-in `.github/workflows/docker-build.yml` currently behaves as follows:

- Push to `main`: builds native AMD64/ARM64 images and publishes SHA/nightly aliases; **does not run the SSH redeploy step**.
- Manual dispatch with `release=false`: builds a canary/SHA image; no production deployment.
- Stable release tag or dispatch with `release=true`: promotes an existing full-SHA image; stable release mode can run SSH redeploy and cache purge when their secrets are configured.
- SSH requires `SSH_KEY`, `SSH_HOST`, and `SSH_USER`; cache purge requires its Cloudflare secrets. Missing integration secrets cause those integrations to be skipped.
- Current SSH command runs `cd docker` then `./manage_stack.sh up reactive_resume`. Verify the actual VPS script pulls the intended image and updates every replica.
- GHCR is primary; Docker Hub is a best-effort mirror. A successful workflow may still have failed mirror steps. Confirm the registry/tag/digest consumed by Swarm.

Before invoking a promotion, follow [container publishing](../agents/container-publishing.md). Pushing this feature branch alone does not build or deploy the production Docker image. Do not assume an unrelated external pull trigger follows the same rules; verify its actual execution and the running image digest.

### Over-the-air updates

`apps/mobile/app.config.ts` enables EAS Update for the existing Expo project. Preview
and production build profiles use separate channels. Fingerprint runtime versions keep
updates compatible with the installed native modules, including the Forme Rust sources
and reviewed prebuilt checksum. JavaScript-only changes can use OTA; native dependencies,
permissions, SDK upgrades, and native Forme changes still require fresh store binaries.

One-time activation:

1. Create an Expo access token with access to the `reactive-resume` project and save it as
   GitHub Actions secret `EXPO_TOKEN`. Never commit the token or put it in release notes.
2. From `apps/mobile`, create `preview` and `production` channels with
   `eas channel:create preview --non-interactive` and
   `eas channel:create production --non-interactive` if they do not already exist.
3. Build `preview` for internal testing and `production` for store distribution on both
   platforms. These builds replace earlier binaries without `expo-updates`; complete the
   store/device gates in this document before production release.
4. Publish a preview update, install the matching build, open it to download, then restart
   to apply. Verify startup offline and saved drafts. Repeat on iOS and Android.

The Docker workflow publishes from the image's exact source commit: non-production
images go to preview, stable releases to production after SSH deployment and three
matching healthy commit probes. Production deployment must expose `/api/health` from
the application without caching or substituting a proxy's `OK` response. A missing
`APP_REVISION`, old replica, or unhealthy backend withholds the mobile update. A timeout
or missing `EXPO_TOKEN` fails the mobile job; Docker publishing is not rolled back.

Updates download on launch and normally apply on the next restart. Never reload an
active editor to force an update; let the existing draft lifecycle finish. A matching
fingerprint is required, so an update targeting new native code waits for users to
install the new binary. Older native runtimes retain their last compatible update.
Clients and self-hosted servers can remain older; keep API changes backward compatible.

For rollback, run `eas update:rollback <LATEST_UPDATE_GROUP_ID>` from `apps/mobile`.
It republishes the previous update for that branch/runtime, or rolls back to the embedded
update if none exists. This changes the mobile app only. Coordinate backend rollback
separately and preserve API compatibility in both
directions. Do not bump runtime versions just to force an incompatible update through.

### Database and web release

- Include migration `migrations/20261017135047_clammy_the_enforcers/` for `ai_content_report`; normal server startup applies migrations. Back up production before deployment and inspect migration logs. Do not reset the database or delete volumes.
- Deploy server and web together. New native report calls need the new backend; the direct account-deletion query parameter needs the new web code. During a rolling update, old replicas can still serve old behavior; verify after rollout completes.
- Keep `APP_URL=https://rxresu.me`. Preserve existing `AUTH_SECRET` and `ENCRYPTION_SECRET`; rotating these casually can invalidate sessions or make saved provider credentials unreadable.
- Swarm service environment/secrets must be updated separately from pulling a new image. The application expects actual environment values, not an assumed `*_FILE` convention.
- Documentation hosting may have an independent deployment. Source changes to `docs/legal/privacy-policy.mdx` and `docs/legal/terms-of-service.mdx` are not proof that public policies changed.
- PWA icon changes need the web deployment and browser/service-worker cache refresh. An installed PWA may retain old artwork until refreshed or reinstalled.

### Required mobile environment

```dotenv
MOBILE_IOS_APP_IDS=654ASRW868.me.rxresu
MOBILE_ANDROID_PACKAGES=me.rxresu
MOBILE_ANDROID_CERT_SHA256=3E:8A:8B:56:BB:3D:B6:55:C6:04:F3:85:99:A8:4B:B0:4F:B7:E1:72:60:0A:95:8C:41:CD:59:D7:04:82:25:81
APPLE_CLIENT_ID=me.rxresu.web
APPLE_CLIENT_SECRET=<supply protected deployment value; never commit it>
```

The Android fingerprint was read from **Play App Signing → Digital Asset Links JSON**, not EAS's upload certificate. Never use the local inspection APK's debug certificate in production. If Play rotates signing keys, update the supported fingerprint list from Play Console and retest links on affected Android versions.

Apple setup is registered for domain `rxresu.me` and callback `https://rxresu.me/api/auth/callback/apple`, associated with primary app `654ASRW868.me.rxresu`. Associated Domains and Sign in with Apple capabilities were enabled. These settings do not replace the runtime client ID/secret.

Protected Apple deployment values are local at `/Users/amruth/.config/rxresu/apple-sign-in.env`, mode 600; the authentication `.p8` key is outside the repository. **Client-secret JWT expires 2027-04-15T15:13:47Z; rotate before expiry.** Upload/signing API keys and the Sign in with Apple authentication key have different purposes. Do not copy any private key, JWT, reviewer password, or service-account JSON into this branch, logs, screenshots, or issue comments.

### Post-deploy acceptance

- [ ] `/api/health` reports healthy and the running image matches the intended commit/digest.
- [ ] `/.well-known/apple-app-site-association` returns valid JSON with the expected team/app association.
- [ ] `/.well-known/assetlinks.json` returns valid JSON containing package and Play signing fingerprint above. At the last live check on 2026-10-17, **both association URLs returned plain `OK`**, so HTTP 200 alone is insufficient.
- [ ] A fresh store-installed app completes browser login and opens `/auth/native-callback` in the app; test cancellation and an expired session too.
- [ ] Private reports persist in production and are visible to the authorized operator. Verify export includes the account's reports.
- [ ] Test erasure with a separately created disposable account, including attachments/provider tokens and report cascade. Keep the primary reviewer account available.
- [ ] Public support/privacy/deletion URLs show the final instructions, retention details, contact information, and shared-content policy.

## Releasing a new version

Decide first whether the change needs a store build. Run this from `apps/mobile`:

```sh
eas fingerprint:compare --build-id <EAS build ID of the current store binary>
```

**Fingerprint unchanged (JavaScript-only change):** no store work. A stable Docker release publishes the update to the `production` channel after the deployment health probes pass (see [Over-the-air updates](#over-the-air-updates)). Apps download it on launch and apply it on the next restart. OTA updates must not change the app's primary purpose or add features that need new store declarations; ship those through review.

**Fingerprint changed (native change):** build and submit new binaries.

1. Deploy the backend first. Keep the API backward compatible: older binaries and OTA bundles remain in use.
2. Optionally bump `version` in `apps/mobile/app.config.ts` (for example `1.0.0` to `1.1.0`). Do not edit build numbers: `appVersionSource` is `remote` and the production profile auto-increments the iOS build number and Android `versionCode`. iOS needs a new version string after a version is released; Play needs only a higher `versionCode`.
3. Build both platforms:

   ```sh
   EXPO_NO_CAPABILITY_SYNC=1 eas build --profile production --platform all
   ```

   Always set `EXPO_NO_CAPABILITY_SYNC=1` for iOS builds and `eas credentials`. The app has no native Sign in with Apple entitlement (Apple sign-in runs through the web flow with Services ID `me.rxresu.web`), so capability sync tries to turn Sign in with Apple off for App ID `me.rxresu`. Apple refuses because the Services ID uses that App ID as its primary app, and turning it off would break Apple sign-in. Manage capabilities manually in the Apple developer console.

4. Submit the latest builds. Use `--auto-submit` on the build command to combine steps 3 and 4.

   ```sh
   eas submit --profile production --platform ios --latest
   eas submit --profile production --platform android --latest
   ```

   Both platforms submit with keys stored in EAS credentials, so submission also works from CI: the App Store Connect API key for iOS, and the Google service-account key (scoped to this app with release-to-testing permission in Play Console) for Android. `eas.json` holds no credential paths. Never commit credential files.

5. **App Store Connect:** wait for processing, test through TestFlight, create the new app version, attach the build, write "What's New", and submit for review. Release manually or automatically after approval.
6. **Play Console:** the build lands in the `internal` track as a draft. Roll it out to testers, then promote it to production with release notes. Use a staged rollout for risky changes.
7. Run the [signed-device test matrix](#signed-device-test-matrix) on the store-installed builds before promoting to production.
8. Confirm that a later OTA update reaches the new binary, because its fingerprint and runtime version changed.

Distribution is store-only. No IPA, AAB, or APK is attached to GitHub Releases. An IPA cannot be installed outside the App Store or TestFlight, and an AAB cannot be installed directly. A sideloaded APK would need a separate build profile and signing key. It could not upgrade a Play install or be upgraded by one, so users would lose local drafts on switching. Its certificate fingerprint would also need adding to `MOBILE_ANDROID_CERT_SHA256` for App Links and native sign-in to work.

## Native artifacts and signing

| Field       | iOS                                                                                                                                            | Android                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Version     | 1.0.0 (4)                                                                                                                                      | 1.0.0, version code 5                                                                                                                                        |
| EAS build   | `afe7e122-ebf2-44fa-906d-dbcada3a8b20`                                                                                                         | `1bd29d31-4d2c-4bc7-9e3f-2bbe5a5ff061`                                                                                                                       |
| Build URL   | [EAS iOS](https://expo.dev/accounts/reactive-resume/projects/reactive-resume/builds/afe7e122-ebf2-44fa-906d-dbcada3a8b20)                      | [EAS Android](https://expo.dev/accounts/reactive-resume/projects/reactive-resume/builds/1bd29d31-4d2c-4bc7-9e3f-2bbe5a5ff061)                                |
| SHA-256     | `455a1e71eda35aa21e5be644802c61f5ad46ff6d484632b0a3bef1abac1bdbcd`                                                                             | `da8a204762e7173d0cc43ee4f58f344ed08c010304bf86aeb96cbc801c8ce4fb`                                                                                           |
| Validation  | Strict deep code signing; iOS SDK 27.1; matching entitlements; 14 non-tracking privacy manifests; no development Bonjour/local-network entries | Bundletool and upload signature valid; target API 36, min API 24; non-debuggable; all 68 64-bit ELF LOAD and inspection APK ZIP alignments pass 16 KB checks |
| Store state | App `6823975835`; build resource `dbaa48a2-520f-4109-9756-aa1c1dc036ca`; attached to 1.0.0                                                     | App `4975481521325019096`; internal track `4701728381949252022`; draft release 1; no testers/rollout yet                                                     |

Earlier builds are superseded. Local IPA/AAB/inspection outputs and evidence are under `/tmp/rxresu-store-artifacts`; listing verification is under `/tmp/reactive-resume-listing-audit`. These are temporary local evidence, not durable build storage. Retrieve store artifacts through EAS links if local files disappear. The inspection APK is debug-signed solely for inspection; it does not prove Play-installed identity or behavior.

EAS project is `reactive-resume/reactive-resume`, ID `5830280e-e1ba-45b7-b9c9-ba048fa3bd4d`. Versions are remote with production auto-increment; do not reset counters to 4/5 when rebuilding. Capability sync must stay disabled with `EXPO_NO_CAPABILITY_SYNC=1` (see [Releasing a new version](#releasing-a-new-version)); Apple capabilities are configured manually. The flag does not provision missing capabilities.

`apps/mobile/eas.json` holds no credential paths; submission keys live in EAS credentials. iOS upload used an existing developer API key, while distribution signing required an approved Admin team key. Android's first AAB upload was done manually; later submissions use the Google service-account key stored in EAS credentials. Never commit credential files. Expo Doctor passed 20/20 after adding direct `expo-asset` dependency.

Forme native artifacts are published and checksum-pinned in `packages/forme-native/scripts/prebuilt.json`; EAS pre-install fetches them. A source/ABI change needs matching published prebuilts and checksum updates. Do not replace the pin with an unverified download or assume package version alone identifies native content.

## Signed-device test matrix

Test through TestFlight/Play internal testing with fictional documents, not Metro or only a development client:

- iPhone/iPad and Android phone/tablet; minimum supported and current OS; Android 16 KB environment; cold launch, background/restore, rotation and safe areas.
- Clean reviewer login; Apple and GitHub OAuth; canceled login, callback reopening, session expiry, account/server switching, sign-out, and cross-account cache isolation.
- Create/import/edit resume and cover letter; save, force-close/relaunch, preview PDF, export/share, offline/interrupted saves and conflict recovery. Inspect actual exported files.
- Deny/revoke camera, photo, microphone, and notification permissions. Unrelated workflows must remain usable.
- Large text, font/density changes, VoiceOver/TalkBack focus/labels, keyboard, light/dark themes, RTL and Arabic/CJK/Devanagari fonts.
- AI consent with accept/decline/cancel and changed provider/account; ensure declined operations never transmit. Report generated content and a shared resume; test block/relaunch/unblock and report receipt.
- Account deletion via Settings → Account opens a browser confirmation; it does not silently erase on navigation. Test separately with disposable credentials and Apple-linked account revocation/fallback where applicable.

Known limit: Android font/density changes can recreate the activity, resetting navigation and unsent transient forms. Persisted document drafts survive; do not claim every form survives. The earlier in-place scaling workaround was reverted because it clipped text. Device performance and full screen-reader/permission-denial coverage remain unclosed.

## Listings, screenshots, and review access

Design sources live in [Figma](https://www.figma.com/design/paEvXcSQes7pnrGtnLS73a?node-id=16-1958) and the owner's Penpot workspace. ZIP archives, editable `.fig` source, and exported listing directories are deliberately excluded from Git. Only seven runtime native icon/splash PNGs under `apps/mobile/assets` and required PWA icons are committed. Runtime copies are byte-identical to the artwork used in uploaded builds 4/5; builds no longer depend on ignored launch-kit folders.

All 264 supplied listing PNGs passed decoding/dimension/no-alpha checks: per language, 5 large iPhone (1320×2868), 5 medium iPhone (1206×2622), 5 Android phone (1080×1920), 4 iPad (2064×2752), 4 Android tablet (1920×1080), and 1 Play feature graphic (1024×500). Check active store slots again before upload. Dimension checks do not prove screenshot fidelity. Original READMEs explicitly identify phone/tablet panels, template thumbnails, and tablet navigation as illustrative reconstructions.

Metadata source is `apps/mobile/store/metadata.json`. Name remains **Reactive Resume** (30-character store limit); the longer free/open-source phrase belongs in descriptions. All 11 locales are saved in both stores, but native-language review is not established. Newly added safety messages also have untranslated mobile catalog entries with English fallback; do not promise fully localized runtime UI without checking.

Reviewer account has fictional resume, letter, and saved application; email/username and password are in private store review-access fields. Owner confirms both stores saved them. No 2FA, QR code, membership, location, or biometric restriction is required. Default server is `https://rxresu.me`. Do not delete this primary account or paste its password into chat/source. A real provider is not configured for this account yet; resolve how reviewers exercise advertised AI tools without exposing personal keys.

Apple access fields: App Store Connect → Reactive Resume → Distribution → iOS App 1.0.0 → App Review Information → Sign-in required. Google: App content → Sign in details. Retest access immediately before review and keep backend/sample content available throughout review.

Apple Silicon Mac and Vision Pro availability defaults remain enabled but untested. Test these targets or explicitly choose supported availability before submission; do not click compatibility verification without testing. Play Data safety's no-sharing answer relies on explicit user-initiated/consented transfers and service-provider exemptions; review actual providers before final submission. IARC Everyone/PEGI 3 is a content rating, distinct from the intended audience of ages 13+.

## Safety operations and unresolved issues

Owner committed to daily monitoring and prompt action. Reports share `ai_content_report`; query `reviewed_at IS NULL` through restricted DB access and mark reviewed only after actual triage. There are **no email alerts or operator dashboard**. Public-resume blocking is device-local, account/server-scoped, and username-based; changing username bypasses that address block. It is not a server-wide ban. Operators must disable abusive public sharing/remove offending content when warranted; live operational verification remains necessary.

Do not close these five issues based only on source checks:

| Issue                                                                                     | Remaining evidence                                                                     |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [#2897 GitHub OAuth](https://github.com/reactive-resume/reactive-resume/issues/2897)      | Clean production account/login round trip; capture sanitized server errors if it fails |
| [#3275 RTL resumes](https://github.com/reactive-resume/reactive-resume/issues/3275)       | Final signed-build Arabic/Hebrew/Persian preview/export fixtures                       |
| [#3147 keyword clipping](https://github.com/reactive-resume/reactive-resume/issues/3147)  | Exact sanitized reporter fixture still absent; test narrow sidebar/wrapped keywords    |
| [#2812 Onyx header](https://github.com/reactive-resume/reactive-resume/issues/2812)       | Current renderer/header/profile placement against reported layout                      |
| [#2794 square-image crop](https://github.com/reactive-resume/reactive-resume/issues/2794) | Original fixture absent; square image with edge markers in preview and exported PDF    |

Prior local checks recorded in the audit passed: API 399 unit and 71 isolated real-DB integration cases; auth 33; PDF 361; AI 7; web account 4; real report/export/deletion browser E2E; mobile consent/public-safety harnesses; relevant typechecks, boundaries, production builds, lint/format. These results do not establish production migration, provider behavior, device coverage, or store approval. Do not run destructive smoke fixtures against personal production accounts.
