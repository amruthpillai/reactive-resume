# iOS smoke continuation

Date: 2026-10-17. Branch: `mobile/smoke-ios`. Local simulator smoke complete within the limits below; this is not a store/release acceptance report.

## Exact source and native artifact

- Final executable source: `09c24804eec80587700e47a6c9cd96a8cdfbe6ff`. Includes parent `cda1c3df9` Retry guard and `e604431c05014baadf7e6ab1beb78efb2eb9d5ce` router, nested provider/history and translation integrations.
- Native Debug simulator build succeeded from native integration snapshot `86a10d5c3704ad844b1ce5a9d44f79c99c249c21` (includes `6b726ebca`). KeyCommands module compiled. Later source changes loaded through Metro on port 8096; no later native configuration change/rebuild required. No release IPA or embedded final JS package was produced.
- Installed artifact: `/tmp/rr-smoke-ios-dd/Build/Products/Debug-iphonesimulator/ReactiveResume.app`.
- SHA-256 executable: `ca9766f65762df89caeaf50469e964b42322aa657f26d03cca5ae128ea4aba37`.
- SHA-256 Debug dylib: `11778018ebe831f299bf9f15bdafc216341a82c7b081563febd9ac2d1a2434f9`.
- Build log: `/tmp/rr-smoke-ios-build-continuation.log`; `BUILD SUCCEEDED`. Build slot released after completion; Android owns slot now. No simultaneous native builds started here.

## Isolation and retained resources

Only assigned iPhone `5B53894D-C466-4C34-9B19-CFD0D0193FBC` and newly authorized iPad `6EA611BC-3747-4A8B-9C45-DC0DC5287C20` (`rr-smoke-ipad-continuation`, iPad Pro 11 M4) used. Both iOS 26.5. iPad uses isolated fictional account and Smoke Labs / IOS QA Engineer fixture. No owner devices, credentials or production data used.

Local web/server ports 3140/3141 and Metro 8096 retained. Shared parity host PID 20305 on loopback 18086 retained for Android; `ps` and `lsof` confirm command and this worktree as cwd. No other worker process stopped. Do not stop host before parent coordinates completion.

Generated tracked `reports/M3-T4/ios-parity.json` deliberately excluded from this commit; parent owns restoration. Android generated report also excluded. Ledger changes arrived only through authorized parent merges; no local ledger, root manifest or lockfile edits.

## Native passes and evidence

| Gate | Observation | Evidence |
| --- | --- | --- |
| PDF parity | 18 unique cases: all 17 templates plus free-form. Native page counts and extracted text match Node/WASM; every case rasterizes. Bronzor/free-form converge in two passes. | `ios-parity.json`, `82-latest-parity-url-complete.png`, `parity-dev.log` |
| iPhone real thumbnail | Library loads rendered first-page image. | `64-latest-library-thumbnail-loaded.png` |
| Check-to-Write focus | Description, date and Add an email open correct entry/Basics field with focus; fictional sample email restored afterward. | `67-description-focused-keyboard.png`, `71-check-date-focus.png`, `73-date-fields-readable.png`, `76-check-email-focus.png` |
| iPhone RTL | Arabic cold and repeated launches mirror layout; System English restores LTR. | `54-arabic-rtl-cold-start.png`, `58-language-rtl-accessible.png`, `59-english-ltr-restored.png` |
| iPhone large text / AX | Outline wraps at accessibility large size; sheet search/language controls individually exposed to AX. | `62-iphone-write-200pct-wrap.png`, `iphone-sheet-ax.json` |
| iPad builder | Split editor/native PDF, zoom controls, Design and Check modes; Cmd+2/Cmd+3 select modes. | `74-ipad-builder-split-light.png`, `77-ipad-design-keyboard.png`, `79-ipad-large-builder.png` |
| iPad appearance / RTL | Dark and accessibility-large text inspected in builder, preferences and library. Arabic cold restart mirrors sidebar right even at large text. Restored System English and normal text. | `80-ipad-dark-large-preferences.png`, `83-ipad-current.png`, `86-ipad-rtl-dark-large-documents.png` |
| Applications/workspace | Manual fixture created, detail and all workspace tabs inspected. One tab strip; company and role correctly populated. | `87-ipad-application-created.png`, `88-ipad-single-workspace-tabs.png` |
| Board/calendar/insights | Board and empty insights inspected; calendar now fits actual width after sidebar. | `98-ipad-board.png`, `100-ipad-insights.png`, `101-ipad-calendar-responsive-fixed.png` |
| Final Coach setup | Connect opens child provider form above retained Coach. Name field accepts unsaved text; controls visible, scroll gesture does not dismiss form. Cancel dismisses child only; Coach and history still usable. No key entered or provider saved. Hardware keyboard input used; full software keyboard occlusion not certified. | `105-final-nested-provider-form.png`, `106-final-provider-keyboard.png`, `107-final-provider-cancel-keeps-coach.png` |
| Final Coach history | Conversations shows empty history with New conversation without provider; New conversation returns to provider gate. | `104-final-coach-history-no-provider.png` |
| Final letter UI | Application-created letter renders native PDF; Assistant opens with one header, history shows document-specific empty state without provider; close returns to letter. | `94-ipad-letter-created.png`, `97-ipad-assistant-header-fixed.png`, `108-final-letter-history-no-provider.png`, `110-final-letter-return-settled.png` |
| Native print | System print options show three PDF pages, A4 and copies/range controls. Closed without selecting printer or sending. | `103-ipad-native-print-options.png` |

Parity ran through actual URL `me.rxresu://builder/preview-sample/page?parity=http%3A%2F%2F127.0.0.1%3A18086` after Hermes-safe parser integration. The disposable dev fixture intentionally replaces/invalidates session tokens; resulting sign-in-again prompt is harness side effect, not production auth failure. `ios-parity-prebuild.json` is retained preliminary evidence. Later merges change routing/chat/translations/UI, not PDF templates, native renderer or parity engine. Native parity was not rerun after final chat-only merges.

Screenshots 01–52 are inherited preliminary iPhone smoke from interrupted run: custom server, browser auth/consent, sample creation, editing/rich text/reorder, preview/zoom/design/Check/Undo, share/download/history, applications/workspace/Career/settings/dark, sign-out. They are preserved but do not certify final source. Arabic screenshots 48/49 document the original failure. Transient splash/menu captures (including 84/85), early light-theme captures with dark filenames, and `_tmp.png` remain preserved; filenames alone are not pass evidence. Screenshot 102 does not by itself prove Cmd+P routing; settled system print is 103.

Final iPhone follow-up on the same final source: browser reauthentication after disposable parity fixture succeeded; Documents → sample resume → Check → Add dates returned to the correct entry. Evidence: `111-final-iphone-check.png`, `112-final-iphone-date-focus.png`. The deliberately nonexistent `preview-sample` document was left by returning to Documents.

## Confirmed bugs repaired

- `418bdbc53`: Expo localization resets `I18nManager.forceRTL(false)` on iOS startup. Persist UIKit writing-direction preferences before the existing direction check; repeated native cold launches prove persistence and English reversal. No dependency/native patch. Same commit exposes BottomSheet children to AX (`accessible={false}`) and wraps large-text outline header.
- `d9066067e`: trailing date calendar text button squeezed month text to about 21 px. Existing IconButton keeps labeled 44-point control and readable input.
- `0994ea09e`: iPad calendar used device tablet flag while sidebar left only 594 px. Measure available width and stack calendar/agenda unless both panels fit. Same commit suppresses duplicate raw Assistant modal header at stack registration. Before/after: 99/101 and 96/97.
- Preserved original five narrow fixes: root new-document sheet, opaque builder child headers, Applications header, Career header, missing settings glyph registrations (`825888e40`, `ec4e493d1`, `928c1b085`, `359182d0b`, `db466de94`).
- Parent shared thumbnail, focus, theme, URL parser, workspace, provider/history and router-hook fixes included by merge. Android overlaps icon additions; parent deduplication already merged. Merge whole branch with those registrations retained; do not re-add Android/iOS duplicate glyph entries.

## Checks

Test-audit skill read before test work. No implementation-mirroring tests or test-only production seams added. Existing behavioral harnesses plus simulator before/after checks used.

- `pnpm install --frozen-lockfile`: pass; native prebuild/pod installation pass; Debug xcodebuild pass.
- `pnpm --filter mobile typecheck`: pass on final source.
- `pnpm lint:agent`: pass on final source.
- `pnpm format:check`: pass on final source (1877 files).
- Scoped safe Oxlint fixes, Oxfmt and commit hooks passed for source fixes.
- `node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M6-T3/verify.mjs`: 17 transport + 24 completion scenarios pass, including final provider-readiness Retry guard, unbound-router navigation, nested sheet lifecycle, provider-free history, proposal/Undo 12-second accessibility guards and stale/cross-account rejection. These use mocked native/I/O; not live-provider simulator proof.
- `node docs/plans/native-mobile-app/reports/M3-T1/session-gate.mjs`: lifecycle redirects pass.
- `node docs/plans/native-mobile-app/reports/M7-T3/verify.mjs`: pass, 22 mappings / 38 hostile inputs / 4 callback forms including auth gating, loopback dev fixture, release stripping and queued callback/session races.
- Independent parity assertions: exactly 18 unique cases, all pass/textEqual/page counts equal, rasterized count positive.
- Context7 lookup hit monthly quota; earlier user notified. Installed Expo localization source and official localization guide inspected for RTL diagnosis. CodeGraph index absent. No extra dependency/config change.

## Deferred / acceptance limits

- Full spoken VoiceOver traversal and focus order remain unverified. AX inspection does not establish screen-reader usability end to end.
- iPad landscape, split view/resizing and full software-keyboard occlusion remain unverified; available GUI backend could not access Simulator orientation controls. Portrait is tested.
- No live AI provider configured. Empty setup/history UI checked with isolated data; device streaming, attachment upload, actual proposal accept/reject/Undo and populated history need provider fixture or owner-approved test provider. Source harnesses cover these contracts separately.
- No physical-device performance, mid-range Android render/cold-start budget, release install/recreation, signed size, universal links on public host, EAS, TestFlight or store submission. Android release recreation gates belong Android worker; no claim here that build success closes them.
- Public link sharing and sign-out were inherited earlier iPhone checks, not replayed after final chat merges. No printer, email or other outbound transmission performed.
- Native binary plus Metro is development verification, not final packaged-release certification. Parent owns integrated checks and merge. Local commits only; no push/deploy/PR.
