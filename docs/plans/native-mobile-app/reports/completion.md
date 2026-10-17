# Integrated mobile completion

Date: 2026-10-17. Integration branch: `mobile/native-app`.

## Current status

M1–M8 implementation is merged locally. Completion work closes the four source gaps found by the continuation audit: application Coach, letter Assistant/history, Check-to-Write targeting, and resume library thumbnails. Device verification subsequently found two release-blocking integration issues: nested Coach provider setup dismissed its parent, and Android activity recreation unbound Expo's process-global router. Both source repairs are integrated at `e604431c0`; the final failed-reply Retry readiness guard is integrated at `cda1c3df9`. Independent reviews found no remaining blockers in these corrections. Final native verification remains in progress. This report does not mark the project or README §7 complete.

Main checkout, existing worktrees and screenshots are preserved. Nothing has been pushed, published, submitted, or uploaded to EAS. No owner signing credentials were read.

## Delivered corrections

- Library resume cards use the native first-page preview pipeline. Letter text thumbnails remain the approved behavior. M3-T2 has 23 scenarios; the thumbnail regression failed against the previous implementation.
- Check targets open Basics or the corresponding entry and focus the requested email, description, date or nested-role field. Section targets expand the outline. M4-T2 has 17 scenarios; target regressions failed against the previous implementation.
- Application Coach uses application-scoped ChatView/history; letters have a draft adapter, Assistant route and selected-conversation navigation. Requests and asynchronous completions bind to the initiating account/document. Workspace chrome owns one tab strip and displays company/role/badges. See [completion-chat.md](completion-chat.md).
- Proposal Undo refuses intervening authored edits, survives ordinary save metadata updates and covers the full 12-second screen-reader toast lifetime. Timed real-DraftStore regressions cover the reported failure window. Final independent source review found no blockers in `62a868c35`.
- Android glyph registration, rich-text toolbar placement above the real IME, theme reapplication after activity recreation, and strict development parity-link parsing are integrated. See [Android report](smoke-android/report.md).
- iOS persists UIKit RTL preferences, exposes sheet child accessibility controls and wraps the outline header at large text (`418bdbc53`). Final iOS report/evidence is integrated at `a4a11c938`, including readable date input, calendar layout based on actual available width and Assistant header deduplication. See [iOS report](smoke-ios/report.md).
- Catalogs contain 2,526 messages per locale. All 53 translated locales have zero missing messages; pseudo-locale `zu-ZA` is intentional. The final fill supplied 371 translations; 136,460 nonempty catalog strings compiled with zero ICU errors (`42b2a2abb`).
- SessionGate uses public `useRouter()` bound to its current root (`720215d26`). The real-React lifecycle regression fails on the previous exact imperative-router exception and passes after repair. The remaining mounted component callers use the same public hook; standalone helpers receive their owner's router (`1038db8b9` and chat-owned changes). No production singleton-router imports remain. See [router-hooks.md](router-hooks.md). The Android release crash matrix passes; final packaged launch evidence is pending.
- Nested Android sheets use existing modal-stack `push` behavior to keep their parent presented. Workspace, document and career conversations remain readable without a runnable provider while sending stays disabled (`f6d2c3030`). The regression exercises the installed modal queue; native Android and iOS setup/cancel/history verification passes.
- Failed-reply Retry honors the same effective read-only/provider-readiness state as the composer, both in its handler and disabled button (`cda1c3df9`). An actual failed Chat send regression proves the old extra request, blocks Retry after readiness fails and permits Retry again after readiness returns. Independent review closed the issue.
- Attempted in-place Android `fontScale`/`density` handling (`0700d6a9b`) passed manifest introspection/source review but failed release accessibility verification: route and unsent text survived, while RN labels and input container bounds stayed at 1× and native input glyphs enlarged/clipped. Reverted fully as `20aebb6ba`, including the now-inapplicable config self-check. Base manifest flags are restored. The public-router crash repair remains; font/density changes still recreate the screen and reset navigation. This is a remaining lifecycle limitation, not a passed retention gate.

## Verification evidence

These are distinct evidence levels; local harnesses are not mobile CI coverage.

| Gate | Recorded result | Limit |
| --- | --- | --- |
| All 16 mobile scenario harnesses | Passed combined source at `e604431c0`; logs under `/tmp/rr-final-mobile-checks` | Manual local harnesses, not configured mobile CI |
| Assistant transport/integration | 17 transport + 24 integration scenarios passed at `cda1c3df9`; 13 provider scenarios also pass | No live provider request claimed |
| Session lifecycle/security | 11 session probes and new SessionGate lifecycle check pass; router-only Android release matrix passes below | Font/density recreation resets navigation |
| Android router release matrix | Eight font/size/density transitions survive with PID 21612; Continue/form/Back/Continue works after every case | Font/density reset route; size changes retained form. Final package restores this base configuration |
| In-place display experiment | Release verification failed and change was reverted; failure screenshot/XML/JSON retained by Android worker | No in-place scaling or route/unsent-state retention claim |
| PDF unit suite | 361 tests across 63 files passed | No renderer changes since that run |
| Root production build | Passed web/server/dsh build | Root build does not package mobile |
| iOS production export | Passed final shared UI source at `a4a11c938`; 27 MB Hermes bundle | Local bundle size, not App Store download size |
| Android production export | Passed final shared UI source at `a4a11c938`; subsequent config-only experiment reverted; 27 MB Hermes bundle | Local bundle size, not Play download size |
| Development tooling exclusion | Both production source maps omit all `scripts/parity` modules; iOS 4,787 sources / 26,757,796 Hermes bytes, Android 4,794 / 26,769,028 | Maps and bundles are local ignored outputs |
| Android renderer parity | Fresh actual native URL: all 17 templates + free-form, 18/18 pass | Emulator/Hermes dev client, not physical performance evidence |
| iOS renderer parity | Fresh actual native URL: 18 unique cases pass; independently checked exact pages/text and nonzero rasterization | Debug simulator; final chat/UI-only merges did not change renderer |
| iPhone/iPad final smoke | Thumbnail, targeted fields, RTL cold/repeated launches, dark/large text, portrait split builder, keyboard pane commands, single workspace tabs, Coach provider form/cancel/history, letter PDF/history, system print options | Debug native binary + Metro final JS; no release IPA. Spoken VoiceOver, landscape and full software-keyboard occlusion remain unverified |
| Android resource lifecycle | Persistent font/cache/image/raster checks passed | Details in platform report |
| Android native release build | Worker reports successful ARM64 APK; debug-signed, `debuggable=false`, about 68 MB | Build precedes recreation fix; not a store artifact |
| Android native UI | Thumbnail and email/description/start-date focus verified; single workspace tabs/title pass. Final Coach history/New conversation, Connect form, Cancel and swipe-child retention pass (98–101) | No key entered or live provider request sent |
| Android offline edit/reconnect | Worker disabled Wi-Fi/data, edited headline, observed device-save banner, restored networking, observed Saved, then restarted process/reopened and retained edit (captures 94–97) | Disposable local account; conflict and cross-device reconnect remain separate |
| Typecheck/lint/format | Mobile typecheck, repository lint and formatting pass on combined source | No native behavior inferred from these checks |
| Package boundaries | 1,458 files / 23 packages pass on combined source | Static import boundary check |

## README §5 parity accounting

The task reports record implementation for Documents/import/trash, Builder Write/Design/Check/Share/export/history, letters, Applications/workspace/voice, Career, Assistant, Settings, public viewer and ATS checker. The continuation audit found and repaired the four missing integrations above. Runtime smoke coverage is narrower than that implementation inventory: authenticated live-provider flows, full offline/conflict/reconnect, every export format, notifications, hardware keyboards and spoken screen-reader operation are not established by the source/harness passes. Do not translate this inventory into a blanket device pass.

## Remaining acceptance gates

- Integrate final Android package/launch evidence. Font/density activity recreation still resets navigation; no safe in-place scaling repair was established in this continuation.
- Physical mid-range Android: cached two-page render p50 ≤400 ms and cold start ≤2.5 s. The existing emulator development benchmark is 503 ms p50 (2 warmups, 11 samples), which does not establish the physical-device target.
- Measure actual App Store/Play download sizes. A local APK or Hermes bundle is a different measurement.
- Publish approved Forme native prebuilts and pin checksums (`packages/forme-native/scripts/prebuilt.json` currently has an empty artifact list).
- Owner configuration/authorization for EAS development and production builds, real store signing/configuration, TestFlight/Play internal-track publication, and owner-installed builds.
- Live provider and full native accessibility/hardware verification where platform smoke reports state a limit.

No publication, push, EAS or store action is authorized by this continuation.
