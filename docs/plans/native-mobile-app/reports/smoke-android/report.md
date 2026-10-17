# Android integrated smoke

Date: 2026-10-17. Branch: `mobile/smoke-android`. Continuation of interrupted run `ddb43303-af14-4e2e-bef7-75e191756016`.

## Environment and boundaries

- Dedicated AVD `rr-smoke-android`, serial `emulator-5594`, Android 17 / API 37, ARM64. Existing development APK and Metro on 8097.
- Phone: 1080 × 2400, density 420. Tablet emulation on the same owned AVD: 1600 × 2560 and 2560 × 1600, density 240. These are resized emulator configurations, not physical tablet coverage.
- Disposable local installation at `http://localhost:3100`, fictional test account and sample resume. No production operations.
- Parent authorized shared loopback parity host in the iOS smoke worktree, `127.0.0.1:18086`; only Android results were copied. Host was not stopped. Parent handles restoring its generated tracked Android result.
- Existing screenshots and edits preserved. Original login capture `04-custom-tab-login.png` is excluded from the commit because it contains local credential input; retained locally as requested. Transitional/loading captures are retained but are not acceptance evidence.
- No direct root manifest, lockfile or ledger edits; parent changes arrived only through authorized branch merges. No push, deployment, EAS or PR.

## Confirmed fixes

| Root cause | Repair | Device proof |
| --- | --- | --- |
| Settings and profile callers request seven unmapped Phosphor glyphs. `ListRow.leading` also accepts `ReactNode`, so strings escaped the icon-name type check and crashed rendering. | Preserve prior seven glyph additions in `src/ui/icon.tsx`: camera, image, link-break, plugs-connected, robot, shield-check, terminal-window. | Fresh Settings, Account/profile and AI settings open: `40-settings-account.png`, `48-preferences-dark.png`, `57-settings-rtl-dark.png`, `69-tablet-rtl-ai-settings.png`. |
| Resume rich-text toolbar applied keyboard translation a second time inside keyboard-resized BuilderChrome. | Remove its redundant `KeyboardStickyView`/absolute wrapper; keep toolbar last in the existing flex layout, like the letter editor. | With real software keyboard, toolbar moved from y513–634 over paragraph to y1398–1517 directly above IME. `42-toolbar-keyboard-before.png` and `46-toolbar-fixed-keyboard.png`. Bold plus inserted text survives leaving/reopening (`47`, `51`). |
| Native appearance override ran only at module initialization. Android activity recreation retained JS but reset native appearance despite saved dark preference. | Run existing `initTheme()` in RootLayout startup effect before the ready gate. | Dark survives font-scale recreation to 200%, reset and clean launch: `55-arabic-dark-large-theme-fixed.png`, `57-settings-rtl-dark.png`. |
| Intent parser strips old parity/smoke tooling query parameters. | Dev-only exact native `/builder/preview-sample/page` exception for only `parity`/`smoke` pointing at HTTP `127.0.0.1` with an explicit valid port. Hand parsing matches the existing Hermes-compatible auth pattern. Malformed encoding fails closed. | M7-T3 harness plus actual documented URL on Hermes (`73-parity-url-running.png`); full fresh result below. HTTPS/public routes, other paths, arbitrary queries, release behavior and session/auth checks stay unchanged. |

Metro's previous `CI=true` disabled watching. Owned Metro was restarted with watching enabled after process/cwd verification. An RTK scoped-typecheck rewrite briefly emitted JavaScript; only fresh untracked compiler outputs were removed. All later pnpm checks use `rtk proxy`.

## Device coverage

The original run's numbered captures `00`–`39` cover local server selection/browser consent, Documents/create, Basics edit, entry add, Page/zoom, template/colour, Check/fix/undo, share/public link/copy/history, letter Write/Page/Design, application create/detail/workspace/board movement and Career tabs. This continuation read the prior activity and re-exercised the areas below; original captures are not presented as newly repeated checks.

| Area | Resumed evidence and limit |
| --- | --- |
| Phone Settings, profile, AI settings, dark | No missing-glyph crash. Settings rows and profile controls render. |
| Rich text | Real IME, formatting, Done, persisted edit after navigation; 200% text field and scrollable toolbar inspected. A clipped partial trailing icon at the scroll edge is reachable by scrolling; no full TalkBack session claimed. |
| RTL | Arabic selected through Preferences and app restarted. Rows, app tabs, document actions and builder outline mirror. Resume PDF remains in its own document language. `55`, `57`, `58`. |
| Tablet portrait | RTL/dark Documents/sidebar, Write with PDF split, Design/templates, Check, letter with PDF split, application list/board/calendar/insights, Career and AI settings. `60`–`69`. |
| Tablet landscape | LTR/dark builder split, Share & export and generated native PDF delivered to Android share sheet. `71-tablet-landscape-builder.png`, `72-tablet-native-pdf-share.png`. No recipient/app was selected. |
| Accessibility modes | 200% Android font scale and RTL inspected. Theme recreation regression verified. Physical-device font behavior, TalkBack and hardware keyboard remain separate gates. |

## Renderer parity and timing

- Fresh native engine, font subsetting and OS first/last-page rasterization run for all 17 templates plus free-form: **18/18 pass**.
- Host independently extracts Node/WASM and uploaded native PDF text with PDF.js; page count and exact concatenated text per page match. `android-parity.json` records each result. Free-form uses two engine passes; Bronzor also exercises repair.
- Resource/cache checks pass: streaming/data/relative images, oversized image rejection, persistent font hit, disk-error fallback, corrupt-font recovery, cache eviction, per-page 25 MP raster cap and PNG lifecycle. Filtered logs contain no document text or tokens.
- Temporary two-page benchmark: sample Azurill with layout limited to its first two pages; assert actual page map has two pages; two warmups, eleven timed `renderResumePdf` calls, cached fonts; no rasterization inside timing. Samples: 633, 489, 493, 428, 438, 416, 547, 708, 503, 654, 761 ms. **p50 503 ms**. See `render-benchmark-dev.json`.
- Timing is Android ARM64 emulator / Hermes development client on a shared host. It does not establish the ≤400 ms physical mid-range Android target.
- Temporary fixture bindings and benchmark instrumentation were restored before commits. Final URL run uses only shipped dev tooling and the repaired intent path.

## Checks

- `pnpm --filter mobile typecheck`: pass.
- Root `pnpm lint:agent` and `pnpm format:check`, mobile typecheck and Turbo boundaries pass on final frozen source `f6dc4f3f4` (1458 files / 23 packages).
- Scoped safe Oxlint fixes followed by Oxfmt; scoped non-mutating checks and `git diff --check`: pass.
- Existing `M7-T3/verify.mjs`: pass. Added regression first failed baseline on the missing dev query. New cases protect dev exact fixture/loopback acceptance, malformed/remote/other-path query rejection, release stripping and unchanged restore/sign-in requirement. No new production test seam.

## Integrated parent changes

Merged `refs/heads/mobile/native-app` at `321c305b2`, then final chat integration at `4ae931970` (includes `1097cb6a5`, `62a868c35` and parent icon dedup). An automatic textual merge initially duplicated camera/plugs-connected/terminal-window keys; typecheck caught this. Parent's final dedup retains exactly the same glyph mapping with unique keys.

- Real native first-page resume thumbnail appears in signed-in library grid: `76-merged-real-thumbnail.png`.
- Check → Add an email opens Basics with actual Email input focused and keyboard visible. Android accessibility XML assertion passes: `77-check-email-focused.png`.
- Check → Describe the role focuses actual Description editor (`79`); Add dates focuses actual Start input (`80`). Failed/transitional attempt `78` is not acceptance evidence.
- Workspace has one tab strip and company title, with correct job context: `82-workspace-company-single-tabs.png`.
- Before shared correction, workspace Coach opened job-context provider gate (`83`), Conversations stayed behind that gate (`84`), and Connect dismissed the whole Coach, reproduced twice. After merging `e604431c0` at `1b616050d`, provider-free Conversations reaches empty application history and New conversation (`98`). Connect opens the actual setup form (`99`); Cancel (`100`) and a repeated Connect → swipe dismissal (`101`) close only the child and retain Coach. No provider key, Save and test, or AI request used.
- Letter Assistant opens from its editor (`86`). Connect opens the provider form (`87`); focusing the empty key field shows the software keyboard (`88`). No key entered and Save and test was never pressed. Before correction, Past conversations stayed behind the no-provider gate (`89`). Final combined JS opens empty document history after font-scale recreation (`102`), then New conversation → Open AI settings reaches provider settings (`103`). No saved transcript fixture, proposal generation/acceptance, or cross-document history device proof is claimed; owner harness covers those contracts.
- Offline edit/reconnect: disabled Wi-Fi and mobile data on the owned emulator, appended a marker to the fictional headline, observed `Offline · saved on this device`, restored both networks, observed `Saved`, then restarted the process and reopened the resume with the edit intact (`94`–`97`). Conflict/replay races remain separate gates.
- At coordinated `1b616050d`, SessionGate lifecycle regression, M3-T2 (23), M4-T2 (17), M6-T3 (17 transport + 23 integration), and M7-T3 pass. Mobile typecheck, root lint/format and boundaries pass. No production global singleton-router import remains. With Retry guard included, M6-T3 passes 17 transport + 24 integration scenarios, including disabled provider-free Retry.

## Local release and recreation investigation

Generated release config uses the existing standard Android debug keystore. No owner credentials read and no signing changes made. With the parent's native slot granted, built ARM64 locally using:

```sh
NODE_ENV=production ./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon
```

Native/cache preparation passed in 4m43s; the second pass rebuilt final merged JS in 1m04s (31 tasks executed, 1019 up to date). APK is non-debuggable and debug-signed, installed only on `emulator-5594`. Artifact metadata is in `release-artifact-before-recreation-fix.json`. Local sideload APK is about 68 MB; this is not the Play compressed download measurement. Release source map contains no parity modules.

Release correctly rejects the persisted development HTTP server; tested server-selection screens without relaxing HTTPS policy. First cold Activity launch reported 1328 ms (`am start -W`); this measures native first draw, not full interactive startup or the physical-device target.

**Release recreation crash confirmed twice.** From Another server → server-address screen, changing Android font scale 1→2 killed the app. Repeating 2→1 from the root server picker killed it again. The process exited to the launcher. `release-recreation-before-fix.txt` contains both crash summaries; `91`–`93` capture before/after state.

Fatal exception: `The imperative router is unavailable before the first render has finished.` Hermes release source map identifies `src/auth/session-gate.tsx:66` (`router.replace`) in the passive effect, despite the existing navigationReady guard. The Expo global imperative facade binds/unbinds in provider effects; parent supplied the public `useRouter()` root-scoped repair. No router internals changed. Parent repaired SessionGate and all mounted component callers using public root-scoped `useRouter()`; continuation/helper functions receive the captured router explicitly.

Existing debug APK was reinstalled after capturing release crashes, without a native rebuild, for live JS verification. Coordinated release rebundle at `1b616050d` includes SessionGate `720215d26`, component migration `1038db8b9`, nested Coach/history `f6d2c3030`, and translations `42b2a2abb`. It passed in 1m16s (31 executed / 1019 up to date); `release-artifact-router-fix.json` identifies this package. Eight configuration/navigation cases pass with the same process: font 1→2→1 twice, size to tablet and back, density to 240 and back. Font/density recreate and reset to the server picker; size changes retain the form. Every case passes repeated Another server → Continue → form → Navigate up → Continue afterward. `release-recreation-after-fix.json` records outcomes; `105-release-*` captures each form after navigation. The initial probe assumed every change recreates; it stopped on the size-retained form, then was corrected to record both retained and reset routes before completing the matrix.

Debug still displays the duplicate-linking warning and resets the route on font-scale recreation; letter/history/provider-settings navigation works afterward. Release has no visible development warning. Release refuses local HTTP by design, so authenticated Coach/library/Check coverage uses the existing debug client against the isolated server; the release gate exercises local server-selection navigation without production calls.

## Rejected display configuration candidate and final package

Merged parent `0700d6a9b` (includes read-only Retry guard `cda1c3df9`) at `54f41bf17`. Expo's real manifest mod appends only `fontScale` and `density`, retaining existing keyboard/orientation/size/layout/uiMode/locale flags. Authorized `pnpm exec expo prebuild --platform android --no-install` regenerated the ignored Android tree; generated flags verified. No tracked manifest, package, or lockfile changes. Standard debug signing remains. Real Expo introspection harness passes; installed RN 0.88 `ReactHostImpl.onConfigurationChanged` refreshes display metrics and requests layout for font changes. Installed-source behavior alone did not establish correct scaling, as the runtime failure below demonstrates.

Candidate release passed build in 4m10s, with artifact identity in `release-artifact-display-gate.json`. **Runtime scaling gate failed.** After font 1→2, the form and unsent loopback address survived, but the React Native label retained `[42,321,1038,369]` (48 px high) and input retained `[76,395,1004,495]` (100 px high). Native input glyphs enlarged inside the unchanged input and clipped; other RN text stayed at 1×. Delayed XML and visual inspection confirm the mismatch (`107-display-font2-stale-layout.png`, matching XML, `release-display-config-failure.json`). Remaining candidate cases stopped at this first failure. This does not establish correct in-place 200% text or density updates.

Parent reverted the candidate at `20aebb6ba`; no router internals or replacement configuration patch. Final frozen parent also includes the three iOS-owned shared fixes: date input trailing IconButton, calendar measured-width breakpoint, Assistant modal-header dedup. Merged at **`f6dc4f3f421430337fbf2583b6e24e4b9a9bcc25`**. Re-ran Android prebuild without installing packages; generated base configuration verified to omit fontScale/density while retaining all prior flags. No tracked package/lockfile/native manifest edits. Final release build passes in 3m43s (1018 executed / 32 up to date after regenerated native tree). Installed on the owned emulator; `apkanalyzer` verifies non-debuggable, `apksigner` verifies standard Android Debug certificate. Artifact **SHA-256 `dc109c9b4ec2feb106b58641906b0a09287bf370f7800ab56b25c31d84969af0`**, 70,933,214 bytes local sideload APK; release source map has zero parity modules. `release-artifact-final.json` records exact source, flags and artifact identity. Final launch screenshot `108`; Another server → Continue → form → Navigate up returns to picker. Final process-filtered AndroidRuntime/ReactNativeJS error log is empty.

Three process-cold final release launches pass: native Activity first draw 689, 734, 700 ms (**p50 700 ms**); accessible server picker polling upper bounds 3275, 3452, 3488 ms (**p50 3452 ms**). `cold-start-release.json` records them. Emulator shared-host, filesystem/host warm, signed-out picker; accessibility timing includes adb/uiautomator polling delay. These are not physical mid-range device startup or authenticated-data readiness measurements. Phone restored to physical 1080 × 2400 / 420 dpi / font 1.0; final process alive (`final-launch-check.json`).

Authenticated native Coach/library/Check/letter proof above predates only these last three UI-only fixes and read-only Retry guard. Final package cannot use the isolated HTTP server under release HTTPS policy; no new live check of date/calendar/header or saved provider-free Retry was attempted in release. Owner regressions and iOS smoke cover those final UI differences; Android final launch verifies packaging only.

## Remaining findings and gates

- Debug activity recreation still emits the multiple-linking warning. Release baseline crashed twice; root-scoped repair passes 8/8 font/size/density cases and repeated navigation. Font/density recreation still resets the route and can discard unsent form state. The attempted manifest workaround was rejected for broken live scaling and reverted. No in-place display-scaling success claim.
- Original workspace duplicate tabs (now fixed in merged parent source) were: `src/features/workspace/shell.tsx:137–143` renders `TabStrip` (implementation starts at 265), while `src/shell/workspace-chrome.tsx:91–125` renders the same `WORKSPACE_TABS`. Device shows underline strip plus second pill strip (`32-workspace.png`, `33-workspace-apply.png`); title stays Application because feature does not fill chrome slots. No workspace edits made here.
- Offline conflicts and replay races, real AI provider flows, notification delivery, DOCX/ODT, public production App Links, store builds/install, physical-device performance and full TalkBack remain unclaimed.
- Context7 quota exhausted; existing installed dependency source was used to trace keyboard translation. Hindsight search returned server errors.
