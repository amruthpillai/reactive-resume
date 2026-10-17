# Ledger: native mobile app

Written only by the coordinator. Status values: TODO, RUNNING, REVIEW, FIXING, BLOCKED, MERGED, DROPPED.

| Task                                          | Harness     | Agent    | Branch            | Status  | Notes                                                                               |
| --------------------------------------------- | ----------- | -------- | ----------------- | ------- | ----------------------------------------------------------------------------------- |
| S1 Forme native module                        | Codex       | 3777064e | mobile/S1         | MERGED  |                                                                                     |
| S2 PDF pipeline on Hermes                     | Claude Code | 30d200d5 | mobile/S2         | MERGED  |                                                                                     |
| S3 Native auth spike                          | Claude Code | ccae31ab | mobile/S3         | MERGED  |                                                                                     |
| DS1 Design directions                         | Claude Code | e6048448 | mobile/DS1        | MERGED  | Started alongside M0 because it is independent of the spikes (coordinator decision) |
| DS2 Review DS1                                | Codex       | 61b41c19 | (in DS1 worktree) | MERGED  | 67 gaps, reports/DS2.md                                                             |
| DS3a Shell, documents, account, utilities     | Claude Code | 53e27e1f | mobile/DS3a       | MERGED  | app.html, tokens.md, index hub                                                      |
| DS3b Builder Write and Page, letters          | Claude Code | 43127d18 | mobile/DS3b       | MERGED  | builder.html                                                                        |
| DS3c Design, Check, Share, History, Assistant | Claude Code | eac233e3 | mobile/DS3c       | MERGED  | design.html                                                                         |
| DS3d Applications and Career                  | Codex       | 8cd42ec8 | mobile/DS3d       | MERGED  | career.html                                                                         |
| DS3b fix round                                | Claude Code | 43127d18 | mobile/DS3b       | MERGED  | 29 DS4b findings                                                                    |
| SVa SV1+SV2 app links, callback page, Apple   | Codex       | 10498568 | mobile/SVa        | MERGED  |                                                                                     |
| SVb SV4 offline_access unbinding              | Codex       | 4441e7ce | mobile/SVb        | MERGED  |                                                                                     |
| SVc SV3+SV5 update conflict, account wrappers | Codex       | 3d077e9f | mobile/SVc        | MERGED  |                                                                                     |
| M1-T1 apps/mobile skeleton                    | Claude Code | a735cf80 | mobile/M1-T1      | MERGED  | briefs/M1.md                                                                        |
| M1-T2 pdf ./native, forme-native hardening    | Codex       | 41501e1a | mobile/M1-T2      | MERGED  | briefs/M1.md                                                                        |
| M8-T2a forme-native EAS prebuilt binaries     | Codex       | 95836666 | mobile/M8-T2a     | MERGED  | Pulled forward; briefs/W6.md                                                        |
| M2-T1 UI primitives                           | Claude Code | 753a4fa6 | mobile/M2-T1      | MERGED  | briefs/W2.md                                                                        |
| M2-T2 Shells                                  | Claude Code | 7d3d3910 | mobile/M2-T2      | MERGED  | briefs/W2.md                                                                        |
| M3-T1 Sign-in                                 | Claude Code | 34e99492 | mobile/M3-T1      | FIXING  | briefs/W2.md                                                                        |
| M3-T3 Draft store and saving                  | Codex       | 0b29757e | mobile/M3-T3      | MERGED  | briefs/W2.md                                                                        |
| M3-T4 Preview pipeline                        | Codex       | 0387aa1b | mobile/M3-T4      | MERGED  | briefs/W2.md                                                                        |
| M6-T4 AI settings                             | Codex       | ab5919d5 | mobile/M6-T4      | MERGED  | briefs/W3.md; pulled forward, JS-only                                               |
| M7-T1 Settings                                | Codex       | 71830ab2 | mobile/M7-T1      | MERGED  | briefs/W3.md; pulled forward, JS-only                                               |
| M5-T1 Applications list and add flow          | Codex       | 18332b0c | mobile/M5-T1      | MERGED  | briefs/W3.md; pulled forward, JS-only                                               |
| M3-T2 Documents library and trash             | Codex       | 365a0d70 | mobile/M3-T2      | MERGED  | briefs/W3.md; JS-only, thumbnail seam for M3-T4                                     |
| M5-T2 Application detail                      | Claude Code | 4262ae08 | mobile/M5-T2      | MERGED  | briefs/W4.md; JS-only                                                               |
| M6-T1 Career Today, Knowledge, Offers         | Codex       | 452d143f | mobile/M6-T1      | MERGED  | briefs/W5.md; JS-only                                                               |
| M6-T3 Assistant                               | Claude Code | ef5fd84e | mobile/M6-T3      | FIXING  | briefs/W5.md; JS-only                                                               |
| M7-T2 Public viewer, ATS checker, search      | Claude Code | 24e6e28a | mobile/M7-T2      | REVIEW  | briefs/W5.md; JS-only                                                               |
| M3-T5 Builder Write                           | Claude Code | 90783b15 | mobile/M3-T5      | FIXING  | briefs/W3.md; JS-only                                                               |
| M4-T3 Share, export and history               | Codex       | c3212ffa | mobile/M4-T3      | MERGED  | briefs/W4.md; JS-only                                                               |
| M6-T2 Application workspace tabs              | Claude Code | 18422245 | mobile/M6-T2      | FIXING  | briefs/W5.md; JS-only, Coach seam for M6-T3                                         |
| M4-T1 Design                                  | Claude Code | d44db267 | mobile/M4-T1      | RUNNING | briefs/W4.md; JS-only                                                               |
| M4-T2 Check                                   | Codex       | 9d918731 | mobile/M4-T2      | RUNNING | briefs/W4.md; JS-only                                                               |
| M5-T3 Board, calendar, insights               | Claude Code | 6ada4717 | mobile/M5-T3      | RUNNING | briefs/W5.md; JS-only                                                               |

## Gates

| Gate                        | Status                                               |
| --------------------------- | ---------------------------------------------------- |
| G0 spikes reviewed by owner | DONE 2026-10-17: accepted on-device native rendering |
| G1 decisions.md frozen      | pending                                              |
| G2a direction picked        | pending                                              |
| G2b mockups approved        | pending                                              |
| G-store owner inputs        | pending                                              |

## Owner design answers (G2a, 2026-10-17)

1. Direction B, "Outline first". Not mixed with A's Page half-sheet.
2. The raised "+" is B's pill, the same as web.
3. No undo/redo controls on phone. Answer was "skip". Hardware-keyboard ⌘Z on tablet stays in M8-T1.
4. In A, Download PDF only inside Share & export: yes. Moot, since B was chosen.
5. Trash as a row at the end of the library: yes.
6. Letter cards show live text until on-device renders exist: yes.

## Owner design answers (DS3 questions, 2026-10-17)

1. Copy without a web source (server picker, sign-in states, offline strip, toasts) is approved.
2. The ATS line "checked on the server and not stored" holds after verification. The coordinator checked `packages/api/src/features/resume/checks.ts:49-72`: `checkPdf` extracts in memory with no storage or DB writes, and its OpenAPI description says "stores nothing". **Constraint:** any future change to `/pdf-checks` must keep that true, or the copy must change.
3. All the DS3c phone-only adaptations are approved: press-and-hold template preview, offline PDF download with a banner, locked banners with Unlock, proposed-edit markings persisting on Page, and an always-visible ⋯ for deleting versions and conversations.

## Store identity (owner, 2026-10-17)

- App name: **Reactive Resume**
- iOS bundle ID: **me.rxresu** (was `me.rxresu.app`; changed 2026-10-17 because Play reports `me.rxresu.app` in use)
- Android package: **me.rxresu**
- Apple Team ID: **654ASRW868**. AASA `appID` = `654ASRW868.me.rxresu`.
- Accounts: the owner has a verified Apple Developer account and a verified Google Play Console account, both fees paid.
- Still needed before M8:
  - an Expo account for EAS Build/Submit
  - an App Store Connect API key, or an Apple ID login during `eas submit`
  - a Google Play service-account JSON with release-manager access
  - the Play app-signing SHA-256 for `assetlinks.json` (available after the first upload to Play)

## Log

- 2026-10-17: Plan committed. M0 spikes and DS1 launched.
- 2026-10-17: G2a answered (Direction B). DS2 review running.
- 2026-10-17: S2 found `expo@latest` is SDK 58.0.14 (RN 0.88.0, React 19.3.0). Catalog React 19.3 and `react-reconciler@0.34.0` resolve to one copy, so the S2 React risk is gone. M1 targets SDK 58.
- 2026-10-17: Learned that `paseo send` to a running agent interrupts it. Send only to idle agents.
- 2026-10-17: DS1 merged. DS2 recorded. DS3 split into four parallel parts (a/b/c Claude, d Codex). Merge commits use `chore(mobile): merge …` because commitlint rejects `merge`.
- 2026-10-17: S1 succeeded; Claude review `540e56a5` found NO BLOCKERS. Merged only `packages/forme-native` (commit 7de1cb42a cherry-picked), the report and the small evidence files. Fixtures and the spike app stay on `mobile/S1`.
- 2026-10-17: S2 succeeded; Codex review `825455ab` found one blocker in the _proposed_ `packages-pdf.patch`: the `images.ts` `arrayBuffer()` fallback buffers unbounded data before the 12 MB check. The patch is not applied yet. M1 applies it **without** that fallback; mobile passes `expo/fetch` (streaming) so the existing `getReader()` path enforces the limit.

## Carry-forward for M1 (from S1/S2 and their reviews)

- **Pins:** Expo SDK 58 / RN 0.88.0 / React 19.3.0. Bump `packages/forme-native` peers from `expo ^57`, `react-native ^0.86` and `expo-modules-core ~57` to SDK 58, and rebuild.
- **`packages/pdf`:** apply `reports/S2/packages-pdf.patch` (from branch `mobile/S2`) minus the `arrayBuffer` fallback. The font cache wrapper must fall back to the network on disk errors.
- **Polyfills:** `crypto.getRandomValues` (add `expo-crypto`, approved as an addition to §1.4) and `Array.prototype.toSorted`.
- **forme-native:**
  - `turbo.json` tags `runtime:native`, `role:rendering`.
  - Add `rust-toolchain.toml`; pin the cbindgen version.
  - Android: decide whether to use a dedicated executor so long renders don't block Expo's shared async queue.
  - Narrow the replacer so only `fonts[].src` becomes a data URI.
- **Before M8 (EAS):** `build.sh` is macOS-only and the binaries are gitignored, so EAS Linux Android and Rust-less iOS builds fail. Choose a prebuilt-artifact strategy (for example, build in CI and fetch at `prebuild`).
- **M8 notices:** HarfBuzz Old-MIT and the Rust crate notices.
- **Bundle:** consider loading `phosphor-icons.json` (766 KB) as an asset rather than bundling it eagerly.
- **Android build:** needs a full JDK. Homebrew `openjdk@17` lacks `jlink`; use Android Studio's JBR 21.
- 2026-10-17: S3 succeeded: DCR, PKCE, bearer oRPC, SSE and refresh all work on iOS and Android with SDK 58.
  - The https callback is unproven because no tunnel tool is available; it needs a public deployment with SV1.
  - Owner decisions:
    - SV4: unbind `offline_access` grants from the browser session.
    - SV5: creating API keys and deleting the account stay browser-only, through the in-app browser tab.
  - Codex review `86d20183` is running.
- 2026-10-17: DS3d merged (all 46 DS4d findings fixed). DS3a merged earlier.

## Carry-forward for M3-T1 (from S3)

- Send `resource=<server origin>` on authorize, token and refresh. Without it the access token is opaque and `/api/rpc` returns 401.
- Refresh is single-flight: one shared in-flight promise. A replayed rotated refresh token deletes the whole token family.
- Use the DCR body from `reports/S3.md` §1. Cache `client_id` per server origin in SecureStore. Re-register on `invalid_client`.
- iOS: `promptAsync(discovery, { preferUniversalLinks: true })` plus the Associated Domains `webcredentials:<host>` entitlement. Android: an `autoVerify` intent filter for `/auth/native-callback`.
- `verifyPassword` unlocks work through the native cookie store. No app code is needed.
- RN `URLSearchParams.get()` is broken. Parse query strings by hand where needed.
- Android needs JDK 17 or 21 (Gradle's Temurin or Android Studio's JBR), not the system JDK 27.
- Watch for the RN 0.88 dev-inspector NPE on Android dev builds.
- 2026-10-17: S3 review (Codex `86d20183`) found 3 blockers, all in the _proposal_, none in the spike. They are folded into SV4 in README §1.6:
  - keep `sid` validation for tokens without `offline_access`
  - document the ≤1 h JWT window after revocation
  - `application_type: native` is not a trust signal; this is moot since SV5 stays browser-only
- Correction to the S3 report: the code exchange and refresh inherit the stored resource when `resource` is omitted. M3-T1 still sends `resource` on authorize. The refresh reuse interval is 0.
- 2026-10-17: DS3c merged (all 33 DS4c findings fixed, 112 frames). DS3b's first pass is done; Codex review DS4b `7d431744` is running.
- 2026-10-17: G0 accepted by the owner. DS3b merged with its review still pending; the fix round will merge on top. Added `mockups/all.html`, one page that links the four parts plus DS1, for G2b.
- 2026-10-17: Owner will review all mockups after the DS3b fixes (G2b pending). Server tasks SVa/SVb/SVc launched in parallel, as §4 allows.
- 2026-10-17: All four DS3 parts are merged with their DS4 fixes. `mockups/all.html` is final for G2b.
- 2026-10-17: G2b approved by the owner. `decisions.md` frozen (G1). **M1 on hold at the owner's request; do not launch it until the owner says so.** SVa, SVb and SVc are still running.
- 2026-10-17: SVb and SVc done; Claude reviews `5a2b4b38` and `c29b7098` running. SVa unblocked (two narrow ownership exceptions approved). The mockup server is stopped.
- 2026-10-17: Owner set the download-size budget to ≤ 50 MB per platform (`decisions.md`).
- 2026-10-17: SVb merged; Claude review `5a2b4b38` found NO BLOCKERS. Follow-up: `offline_access` tokens survive "sign out everywhere" and password-reset session revocation until consent is revoked. Document this in the security docs (M8 docs task).
- 2026-10-17: SVc review `c29b7098` found 1 blocker: the account integration test skips in CI because `OAUTH_TEST_DATABASE_URL` is missing from `packages/api/turbo.json`. Fix round running. The owner approved the `packages/auth/src/config.ts` `accountAuth` bridge directly in Paseo.
  - The bridge is an AsyncLocalStorage identity, only for internal calls (`!ctx.request`) on `/update-user`, `/api-key/list` and `/api-key/delete`.
  - Follow-ups: it depends on Better Auth 1.7.7 internals, so keep its test running on upgrades. The new auth procedures are not rate-limited.
- 2026-10-17: SVa done (916 tests passed); Claude review `d37bc6ee` running.
- 2026-10-17: The size budget is a soft target, not enforced (owner). EAS project linked by the owner (`5830280e-…`, account `amruthpillai`). Recorded in `decisions.md`; the stray root `app.json` was removed.
- 2026-10-17: SVa and SVc merged; `docs/spec.json` regenerated.
  - Checks on the integration branch: typecheck (auth, api, env, server, web), auth tests 33/33, api tests 392 passed / 69 skipped (database suites need test DB env), and `turbo boundaries` all pass.
  - The SVa review flagged edits to `apps/web/src/features/settings/account/{auth-hooks.ts,security.tsx}` outside Ownership.
    - `auth-hooks.ts` was required: its `.exhaustive()` match fails to compile once `AuthProvider` includes `apple`.
    - `security.tsx` adds Apple to the linked-accounts list.
    - The coordinator accepts both after the fact, as direct consequences of the approved `AuthProvider` change.
  - SVa follow-ups:
    - native Apple ID-token sign-in later needs the `audience` set to `me.rxresu.app`
    - the AASA path patterns are broad
    - a retry link on the same domain may not reopen the app through Universal Links
- 2026-10-17: Owner supplied the App Store Connect Team key IDs (role Developer); see `decisions.md`.
- 2026-10-17: The owner asked to clean up Paseo. All 11 task workspaces and 22 `plan=native-mobile` agents are archived. Archiving deleted the worktrees and kept the branches.
  - The S2/S3 reports, the S2 `packages-pdf.patch` and the S3 `protocol-run.txt` were copied onto `mobile/native-app` first.
  - Kept on branches only: `mobile/S1` (about 40 MB of fixtures plus `apps/spike-s1`), `mobile/S2` (`apps/spike-s2`), `mobile/S3` (`apps/spike-s3`, screenshots).
- 2026-10-17: Owner released M1 and asked for continuous parallel work to completion. Coordinator split M1 into M1-T1 (app scaffold, Claude Code) and M1-T2 (`packages/pdf` `./native` + `forme-native` hardening, Codex) with disjoint ownership. Brief: `briefs/M1.md`.
- 2026-10-17: Coordinator wave plan to keep up to five builders busy (briefs `W2.md`–`W6.md`): W2 = M2-T1, M2-T2, M3-T1, M3-T3, M3-T4 (logic-first M3 tasks only consume M1 contracts); W3 = M3-T2, M3-T5, M5-T1, M6-T4, M7-T1; W4 = M4-T1..T4, M5-T2; W5 = M5-T3, M6-T1..T3, M7-T2; W6 = M7-T3, M8-T1, M8-T2. Ownership stays disjoint inside each wave.
- 2026-10-17: M1-T2 merged (91c670782). Claude review `43206784`: NO BLOCKERS; SupervisorJob fix applied. Follow-ups for M3-T4: decode `data:` image sources and resolve relative picture URLs before `expo/fetch`; add a `preloadResumePdf` counterpart if useful; native-engine parity and the repair pass are still untested. Kotlin/Swift compile against SDK 58 is checked in the M1-T1 device build.
- 2026-10-17: M8-T2a merged. Claude review `13f31815` found 1 blocker (workflow-wide `contents: write` during untrusted build code); fixed by a read-only build job plus a separate publish job, plus SHA-pinned setup-android and explicit toolchain install. Still needed before EAS builds (M8-T2): the owner publishes an approved artifact through the workflow, the checksum pin is committed in `prebuilt.json`, and the mobile `eas-build-pre-install` hook is wired.
- 2026-10-17: M1-T1 done; Codex review `6dd34c09` found 5 blockers (cross-server token leak on failed sign-in, SecureStore key collisions, RECORD_AUDIO stripped, SYSTEM_ALERT_WINDOW, `RenderRequest` lacking render options). Fix round running. Coordinator decisions: `@reactive-resume/api` stays a type-only peer with `@boundaries-ignore` and an oxlint guard (keeps the `runtime:server` deny); `react-native-enriched-html` (renamed upstream) accepted; approved additions to §1.4: `expo-network`, `@react-native-community/datetimepicker`, `react-native-keyboard-controller`, `expo-haptics`. EAS slug verified (`@amruthpillai/reactive-resume`).
- 2026-10-17: M1-T1 merged (FIXED 5). Wave checks on the integration branch: `turbo boundaries`, mobile/pdf/forme-native typecheck and `expo export` (iOS + Android) pass. **G1 note:** owner reported Play Console rejects `me.rxresu.app` as in use; app identity changed to **`me.rxresu`** on both platforms (bundle ID, package, URL scheme). Owner must register `me.rxresu` in Apple Developer and Play Console. Apple native ID-token `audience` (SVa follow-up) becomes `me.rxresu`.
- 2026-10-17: Wave 2 launched from 9e36288cf: M2-T1, M2-T2, M3-T1 (Claude Code), M3-T3, M3-T4 (Codex). Each builder has its own simulator/AVD, Metro port (8082–8086) and, where needed, its own local DB and server ports.
- 2026-10-17: M3-T3 done; Claude review `f10f0aab`: 1 blocker (stale refresh overwrites newer local saves) plus false-conflict/corrupt-draft/persist-cost notes; fix round running. **Pending for M3-T1 (send when idle):** `api/client.ts` must read server URL and token as one atomic session snapshot (a server switch between the two reads could send a token or a queued draft to the wrong server); offline cold start needs the account ID from the stored session without a network refresh; sign-out calls the draft store's `clearDraftsFor(scope)`.
- 2026-10-17: Host load reached ~460 with five builders each compiling native dev clients. From wave 3 on, builders reuse one shared dev client per platform built by the coordinator after each merge, and only rebuild native code when their task changes native modules.
- 2026-10-17: M3-T3 merged (FIXED 4, 24 Node scenarios). Device save path still unverified; covered by the wave-2 smoke test.
- 2026-10-17: M6-T4 and M7-T1 pulled forward into free slots, JS-only (no native builds; coordinator screenshots after merge). M7-T1 asked for a bearer profile/timezone contract; coordinator approved a narrow ownership extension: `auth.getProfile()` and `timezone` on `auth.updateProfile` (through the SVc `accountAuth` bridge), with focused tests.
- 2026-10-17: M6-T4 merged. Claude review `c8235124`: NO BLOCKERS; five behaviour notes fixed (changed-fields-only edits, retest gating, stale test errors, error mapping, password-manager autofill off on key fields). Screenshots pending on the shared dev client.
- 2026-10-17: M7-T1 review `948f40c5`: 1 blocker (New API key opened the account page instead of `/dashboard/settings/ai`); fix round running with export-file sweep and shared rate-limit middleware. **For M3-T1:** the server picker and `signIn` must require https except localhost dev (browser hand-offs trust `getServer()`).
- 2026-10-17: M7-T1 merged (FIXED 4; 463 API + 33 auth tests on an isolated DB). Adds `auth.getProfile` and `timezone` on `auth.updateProfile`; `docs/spec.json` regenerated by the coordinator. Camera permission string applied to `app.config.ts`.
- 2026-10-17: M5-T1 merged. Claude review `c580fd19`: NO BLOCKERS; four parity notes fixed (posting/search errors, 500-row partial import, export file lifetime, optimistic update with rollback in `queries.ts`).
- 2026-10-17: M3-T4 done: 17 templates + free-form pass Node/device page-text parity on iOS and Android. Claude review `e5de87ab`: 3 blockers (font cache in backed-up Documents dir and unbounded; unvalidated font bytes persisted; raster scale not capped at the 25 MP bitmap limit). Fix round also wires the real DraftStore. M5-T2 and M6-T1 launched JS-only.
- 2026-10-17: M3-T2 review `17746a44`: NO BLOCKERS; five parity notes in a fix round. Disk reached 3.9 GB free; coordinator deleted the S1–S3, M1-T1 and M3-T3 simulators/AVDs and `/tmp/m1t1` (18 GB free after). Owner AVDs (`Pixel_10`, `WieBitte_Test_API34`) untouched.
- 2026-10-17: M2-T1 done (60 screenshots; three Sheet bugs and one dialog bug fixed on device). Notes for later waves: long sheets need fractional detents; Hermes lacks `Intl.DisplayNames` (language pickers need a names table); easing tokens are not yet Reanimated worklets. Codex review `42672668` running. M6-T1 done; Claude review `2d6b4e18` running.
- 2026-10-17: M6-T1 review `2d6b4e18`: 3 blockers (manual fact payload, notice period erased on invalid input, missing plurals). Coordinator accepts Track behind Undo (mobile delays `trackOpportunity`; web tracks then deletes on Undo). M2-T1 review moved to `gpt-6-astra` after `gpt-6.1-sol`/`gpt-6-sol` capacity errors.
- 2026-10-17: M3-T2 merged (FIXED 5). Thumbnail seam awaits M3-T4.
- 2026-10-17: M2-T1 review (Codex `9f430246`, `gpt-6-astra`): 5 blockers (content-sized sheets don't scroll, stale dismiss closes reopened sheet, toast timers leak, `SortableItemInfo` additions required, Segmented 40 pt). Fix round includes merging the integration branch. M5-T2 done; review `b1142334` running. Follow-ups owned by the coordinator after merges: a `routes.ts` helper for `/applications/<id>/details` and list navigation to it; notification tap/foreground handlers in `app/_layout.tsx`. M6-T3 launched JS-only.
- 2026-10-17: M5-T2 review `b1142334`: 6 blockers (notes save races and lost drafts, inline-edit draft loss, reminder lost on interview Undo, .ics leaks interviewer names, UTF-8 folding). Fix round also adds the `/applications/<id>/details` route helper and list navigation (ownership extension approved).
- 2026-10-17: M6-T1 merged (FIXED 6, 33 scenarios).
- 2026-10-17: M3-T4 merged (FIXED 7, second review NO BLOCKERS; 361 pdf tests pass on the integration branch). M3-T1 done but blocked on mounting `SessionGate` in `app/_layout.tsx`: approved, plus atomic server+token snapshot in `api/client.ts`, offline account scope, sign-out draft cleanup and https-only servers. Coordinator accepts the single redirect URI `https://rxresu.me/auth/native-callback` for every server and browser-based guest login (two taps) for v1.
- 2026-10-17: M5-T2 merged (FIXED 6, 13 scenarios). Pending for M3-T1's sign-out cleanup: also clear unsaved application notes (kv keys scoped by server+account in `features/application-detail/notes-queue.ts`).
- 2026-10-17: Launched M3-T5, M4-T3, M6-T2 (JS-only). Eight builders active; JS-only tasks do not compile native code, so CPU/disk stay manageable.
- 2026-10-17: M2-T1 FIXED 5. Found that Hermes lacks `Intl.PluralRules` (every Lingui plural crashes on iOS launch). Coordinator approved `@formatjs/intl-pluralrules` plus its strict Hermes prerequisites as an addition to §1.4; M2-T1 adds them in `src/polyfills.ts` and records an Intl capability matrix.
- 2026-10-17: M4-T3 done (review `5ed4c4c0`); M7-T2 done (review `7f77db95`). Coordinator integration list (after M2-T2): mount `DocumentMenu({ id })` in builder chrome; tablet search as a form sheet; ATS entry point beside Search; M6-T3 honours `?thread=`/`?ask=` on the assistant route.
- 2026-10-17: M6-T3 done (review `cce125a4`). Integration for the coordinator: Page tab swaps `draft.data` for `useMarkedResumeData(id, draft.data).data` and renders `ProposedEditsCaption`; M3-T2 `onCopiedForJob` opens `routes.assistant(id)` with `prepare=1`; M6-T2 Coach seam renders `ChatView`.
- 2026-10-17: M2-T2 done (review `b952f6f3`). Coordinator decisions: the document menu opens from the document name with a caret (mockup) rather than a separate ⋯ button; letters get the mockup's Write / Page / Design panes, so M4-T4 adds a `page` letter pane (`routes.ts` + `letter/[id]/page.tsx`, tablet page, `onShare`). Coordinator follow-ups: rename root `Stack.Screen` `applications/[id]/[tab]` → `applications/[id]` with `headerShown: false`; Android tab-stack headers sit one status-bar height low under a banner (fix in M8-T1).
- 2026-10-17: M7-T2 review `7f77db95`: 5 blockers (ATS response shape, quadratic HTML tokenizer, stale pending import across servers, download temp files, slug search).
- 2026-10-17: M4-T3 review `5ed4c4c0`: 2 blockers (lost characters blocked PDF; letter exports not localized). Coordinator accepts 24 h export cleanup.
- 2026-10-17: M6-T3 review `cce125a4`: 6 blockers (replay drops earlier parts, resume ignores abort, background/foreground reconcile, draft never opened from direct links, thread/document mismatch, attachment memory). Fix round also wires the Page proposal seam and `onCopiedForJob`. M2-T2 review `b952f6f3`: 4 blockers (Details button hidden, two draft owners on tablet, tablet bottom inset, pane-bar deletion — approved). **Draft ownership moves to the builder layout** (one owner; panes subscribe); M3-T5 must adopt the subscriber hook when it merges after M2-T2.
- 2026-10-17: M7-T2 FIXED 5 (+ ATS Original page view via pdf-pages). Its branch merged `mobile/M6-T3` commits 06157e9d9/2a4e878cf; merge order: M6-T3 (after its fix round) then M7-T2.
- 2026-10-17: M4-T3 merged (FIXED 5, 38 scenarios).
- 2026-10-17: M3-T1 session hardening done (Codex review `9fae76e4`). Launched M4-T1, M4-T2, M5-T3. Pending coordinator items: session-based redirect in `app/index.tsx` (no Documents flash when signed out); confirm before discarding unsynced edits from the session-expired sheet.
- 2026-10-17: M6-T2 done (review `195d8e34`; voice transcription via REST multipart). M6-T3 FIXED 6; second review by `cce125a4`. M4-T2 told not to merge M7-T2; temporary copy of the pdf-check adapter to dedupe at merge.
- 2026-10-17: M3-T1 review `9fae76e4`: 5 security blockers (issuer mix-up, cross-account 401 retry, unserialized session transitions, refresh-token replay after a lost response, cached data across accounts).
- 2026-10-17: M2-T1 merged (FIXED 5 + Intl polyfills). Hermes Intl matrix in `reports/M2-T1.md`: no `PluralRules`/`Locale` (polyfilled, +246 KB gzipped), no `supportedValuesOf`, no `NumberFormat#formatToParts` on iOS; `DateTimeFormat` with `timeZone` works on both. Bundle trim (hand-written plural rules) left as an M8 size item.
- 2026-10-17: M6-T3 second review: 6 more blockers (slow-reply recovery, pre-run boundary, lifecycle tokens, draft reclaim, unverified thread association, marked data breaking Fit); second fix round. M6-T2 review `195d8e34`: 6 data-loss blockers; fix round. M3-T5 done; review `bf75f9a3`.
- 2026-10-17: M3-T5 review `bf75f9a3`: 5 blockers (selector render loop, rich text reload/caret, iOS short-fragment parse, link edits dropped, cross-resume picture upload). M2-T2 FIXED 4 (draft owner hooks in layouts; panes subscribe) — second review by `b952f6f3`.
- 2026-10-17: M3-T1 FIXED 5 (`ac8c2ddad`; session probes 4/4); second review by `9fae76e4`. M2-T2 second review: 1 blocker (duplicate conflict sheet in Share screen); fixing.
- 2026-10-17: M2-T2 merged (FIXED 4 + FIXED 1). The builder and letter layouts own the draft (`useResumeDraftOwner`/`useLetterDraftOwner`); panes subscribe via `useResumeStore()`; one conflict sheet per editor.
