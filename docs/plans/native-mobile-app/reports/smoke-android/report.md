# Android integrated smoke

Date: 2026-10-17. Branch: `mobile/smoke-android`. Continuation of interrupted run `ddb43303-af14-4e2e-bef7-75e191756016`.

## Environment and boundaries

- Dedicated AVD `rr-smoke-android`, serial `emulator-5594`, Android 17 / API 37, ARM64. Existing development APK and Metro on 8097.
- Phone: 1080 × 2400, density 420. Tablet emulation on the same owned AVD: 1600 × 2560 and 2560 × 1600, density 240. These are resized emulator configurations, not physical tablet coverage.
- Disposable local installation at `http://localhost:3100`, fictional test account and sample resume. No production operations.
- Parent authorized shared loopback parity host in the iOS smoke worktree, `127.0.0.1:18086`; only Android results were copied. Host was not stopped. Parent handles restoring its generated tracked Android result.
- Existing screenshots and edits preserved. Original login capture `04-custom-tab-login.png` is excluded from the commit because it contains local credential input; retained locally as requested. Transitional/loading captures are retained but are not acceptance evidence.
- No root manifests, lockfile or ledger edits. No push, deployment, EAS or PR.

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
- Root `pnpm lint:agent` and `pnpm format:check`: pass before final integration; rerun after final changes below.
- Scoped safe Oxlint fixes followed by Oxfmt; scoped non-mutating checks and `git diff --check`: pass.
- Existing `M7-T3/verify.mjs`: pass. Added regression first failed baseline on the missing dev query. New cases protect dev exact fixture/loopback acceptance, malformed/remote/other-path query rejection, release stripping and unchanged restore/sign-in requirement. No new production test seam.

## Integration follow-up in progress

Parent owns library thumbnails and Check-to-Write focus. Merge latest `refs/heads/mobile/native-app` after owned fixes are committed, then verify real library images and Add email/entry field focus without overlapping edits.

Native release build slot is now owned by this run. Generated Android release config explicitly uses the existing standard debug keystore (`apps/mobile/android/app/build.gradle:100–116`). No owner credential reads or signing changes are needed. Local ARM64 release build and recreation/cold-start checks are pending; no release outcome is claimed here yet.

## Remaining findings and gates

- Android development-client activity recreation after font-scale/size changes emits React Navigation's multiple-linking/root warning and returns to Documents. Clean force-stop clears it until another recreation. Release-specific behavior is unproven; do not patch router internals from this debug symptom alone.
- Workspace duplicate tabs are parent/chat-integration owned: `src/features/workspace/shell.tsx:137–143` renders `TabStrip` (implementation starts at 265), while `src/shell/workspace-chrome.tsx:91–125` renders the same `WORKSPACE_TABS`. Device shows underline strip plus second pill strip (`32-workspace.png`, `33-workspace-apply.png`); title stays Application because feature does not fill chrome slots. No workspace edits made here.
- Full offline/conflict/reconnect, real AI provider flows, notification delivery, DOCX/ODT, public production App Links, store builds/install, physical-device performance and full TalkBack remain unclaimed.
- Context7 quota exhausted; existing installed dependency source was used to trace keyboard translation. Hindsight search returned server errors.
