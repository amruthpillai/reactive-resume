# Integrated mobile completion

Date: 2026-10-17. Integration branch: `mobile/native-app`.

## Current status

M1–M8 implementation is merged locally. Completion work closes the four source gaps found by the continuation audit: application Coach, letter Assistant/history, Check-to-Write targeting, and resume library thumbnails. Device verification subsequently found two release-blocking integration issues still under repair: nested Coach provider setup dismisses its parent, and Android activity recreation unbinds Expo's process-global router. This report does not mark the project or README §7 complete.

Main checkout, existing worktrees and screenshots are preserved. Nothing has been pushed, published, submitted, or uploaded to EAS. No owner signing credentials were read.

## Delivered corrections

- Library resume cards use the native first-page preview pipeline. Letter text thumbnails remain the approved behavior. M3-T2 has 23 scenarios; the thumbnail regression failed against the previous implementation.
- Check targets open Basics or the corresponding entry and focus the requested email, description, date or nested-role field. Section targets expand the outline. M4-T2 has 17 scenarios; target regressions failed against the previous implementation.
- Application Coach uses application-scoped ChatView/history; letters have a draft adapter, Assistant route and selected-conversation navigation. Requests and asynchronous completions bind to the initiating account/document. Workspace chrome owns one tab strip and displays company/role/badges. See [completion-chat.md](completion-chat.md).
- Proposal Undo refuses intervening authored edits, survives ordinary save metadata updates and covers the full 12-second screen-reader toast lifetime. Timed real-DraftStore regressions cover the reported failure window. Final independent source review found no blockers in `62a868c35`.
- Android glyph registration, rich-text toolbar placement above the real IME, theme reapplication after activity recreation, and strict development parity-link parsing are integrated. See [Android report](smoke-android/report.md).
- iOS persists UIKit RTL preferences, exposes sheet child accessibility controls and wraps the outline header at large text (`418bdbc53`). Final iOS/iPad report is pending.
- Catalogs contain 2,526 messages per locale. All 53 translated locales have zero missing messages; pseudo-locale `zu-ZA` is intentional. The final fill supplied 371 translations; 136,460 nonempty catalog strings compiled with zero ICU errors (`42b2a2abb`).
- SessionGate uses public `useRouter()` bound to its current root (`720215d26`). The real-React lifecycle regression fails on the previous exact imperative-router exception and passes after repair. Other mounted global-router callers and native release verification remain in progress.

## Verification evidence

These are distinct evidence levels; local harnesses are not mobile CI coverage.

| Gate | Recorded result | Limit |
| --- | --- | --- |
| All 16 mobile scenario harnesses | Passed integrated implementation before final recreation/provider fixes | Rerun affected harnesses after those repairs |
| Assistant transport/integration | 17 transport + 19 integration scenarios passed | Native provider setup discovered an additional gap |
| Session lifecycle/security | 11 session probes and new SessionGate lifecycle check pass | Native release recreation still required |
| PDF unit suite | 361 tests across 63 files passed | No renderer changes since that run |
| Root production build | Passed web/server/dsh build | Root build does not package mobile |
| iOS production export | Passed at `42b2a2abb`; 27 MB Hermes bundle, 4,787 source-map entries | Local bundle size, not App Store download size; repeat after final source repairs |
| Development tooling exclusion | No parity/review modules in that iOS production source map | Final Android/iOS map inspection pending |
| Android renderer parity | Fresh actual native URL: all 17 templates + free-form, 18/18 pass | Emulator/Hermes dev client, not physical performance evidence |
| Android resource lifecycle | Persistent font/cache/image/raster checks passed | Details in platform report |
| Android native release build | Worker reports successful ARM64 APK; debug-signed, `debuggable=false`, about 68 MB | Build precedes recreation fix; not a store artifact |
| Android native UI | Thumbnail and email/description/start-date focus verified; single workspace tabs/title pass | Coach setup/history fix still awaiting native verification |
| Typecheck/lint/format | Mobile typecheck, repository lint and formatting pass after localization; SessionGate typecheck passes | Final combined gates pending |
| Package boundaries | 1,458 files / 23 packages passed before final lifecycle/provider repairs | Repeat after integration |

## README §5 parity accounting

The task reports record implementation for Documents/import/trash, Builder Write/Design/Check/Share/export/history, letters, Applications/workspace/voice, Career, Assistant, Settings, public viewer and ATS checker. The continuation audit found and repaired the four missing integrations above. Runtime smoke coverage is narrower than that implementation inventory: authenticated live-provider flows, full offline/conflict/reconnect, every export format, notifications, hardware keyboards and spoken screen-reader operation are not established by the source/harness passes. Do not translate this inventory into a blanket device pass.

## Remaining acceptance gates

- Finish provider-sheet/history and root-scoped navigation repairs; verify final source on Android release and iOS/iPad, and integrate platform evidence.
- Physical mid-range Android: cached two-page render p50 ≤400 ms and cold start ≤2.5 s. The existing emulator development benchmark is 503 ms p50 (2 warmups, 11 samples), which does not establish the physical-device target.
- Measure actual App Store/Play download sizes. A local APK or Hermes bundle is a different measurement.
- Publish approved Forme native prebuilts and pin checksums (`packages/forme-native/scripts/prebuilt.json` currently has an empty artifact list).
- Owner configuration/authorization for EAS development and production builds, real store signing/configuration, TestFlight/Play internal-track publication, and owner-installed builds.
- Live provider and full native accessibility/hardware verification where platform smoke reports state a limit.

No publication, push, EAS or store action is authorized by this continuation.
