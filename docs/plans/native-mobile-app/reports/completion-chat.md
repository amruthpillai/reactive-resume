# Completion: workspace Coach and letter assistant

Branch: `mobile/completion-chat`, based on `mobile/native-app` at `6b726ebca`.

## Delivered

- Workspace Coach mounts existing `ChatView`, reopens the newest application-scoped conversation, lists/reopens earlier conversations, and creates new conversations with `scope: "application"` and `applicationId`. Existing provider setup, model switching, transcript/history, attachments, stop/recovery, and deletion contracts are reused. Context stays document + posting + application + enabled Knowledge, with current tab and `web: false`. Closing detaches chat; reopening reloads saved history. First send remains mounted while the thread list refreshes.
- Letters share the existing assistant screen through a letter draft adapter. `/letter/[id]/assistant` lives under the existing letter draft owner, opens from the editor action and Search, and retains the selected thread ID. Document history can intentionally navigate to another letter's selected conversation. Unknown or mismatched explicit links are refused instead of silently opening a different thread/document.
- New letter conversations use actual `coverLetterId` API input. Existing server `read_letter` / `propose_edits` output, shared string proposal helpers, accept/reject status API, draft undo, and linked-application context are reused. Letter edits affect the current letter body in one undo step; stale passages remain stale. No resume-only tools or API endpoints added. Resume page markings remain resume-only.
- Chat sends confirm the shared document draft is saved before server/model reads it. Conflict, failed save, lock, changed document, or changed account blocks that read. Removing document context permits a message without requiring the excluded draft to save.
- Chat create/get/send/resume/recovery/attachment/status/model/delete requests bind to the initiating account scope using the existing client contract. Account changes remount chat; late creation after leaving cannot publish or send. Draft acceptance and Undo check document/account ownership.
- Confirmed Android duplicate-strip report against mounted routes: `ApplicationLayout` wraps each workspace tab in `WorkspaceChrome`, while feature `WorkspaceScreen` also mounted its own `TabStrip`. Removed feature strip and fill existing chrome slots with real company/role and countdown, unread-message, and saved-count badges. Existing chrome owns tab navigation. No change to established shell architecture. Android's supplied `smoke-android/32-workspace.png` and `33-workspace-apply.png` are pre-fix evidence, not new verification from this task.

## Contracts and scope

`AssistantDocument` now supplies `flush(): Promise<boolean>`. `ChatView.createThread` receives the initiating account scope. All three production callers (document assistant, career Coach, application Coach) use it. Added `routes.letterAssistant(id)` and the letter assistant route/modal action. Draft ownership remains solely in builder layouts.

Only assistant/workspace integration, letter route/layout, Search conversation navigation, routes, and this report/harness changed. Parent-owned thumbnails and Check-to-Write untouched. No manifest, dependency, lockfile, ledger, catalog, native build, simulator, deployment, EAS, push, or PR changes. Translation extraction remains with parent.

## Regression gate and proof

Extended existing M6-T3 scenario entry point with `M6-T3/completion.mjs`. It executes shipped screen handlers and chat lifecycle, real AI SDK `Chat`, shared proposal helpers, and real DraftStore. Native views, hooks, and external I/O are represented at the harness boundary. No source-grep assertions, new dependencies, or production-only test seams.

Primary observable contracts: exact selected-conversation navigation; correct letter draft/context/proposal/status/Undo; application-only history and first send; provider blocking; late-create ownership; and existing workspace chrome badges/title without a second feature strip. Existing transport scenarios cover stream/recovery behavior; they did not cover these entry points.

Red/green verified by temporarily restoring original tracked mobile sources at `6b726ebca`, running the same selected scenarios, then restoring implementation:

- Search failed with `/letter/letter-a/write` instead of the selected assistant route/thread.
- Workspace Coach failed because `ChatView` was absent.
- Workspace chrome scenario failed because feature shell mounted one extra tablist.
- Late-create scenario failed because callback fired after unmount.

Validation:

- `rtk proxy pnpm --filter mobile typecheck` — passed.
- `rtk proxy pnpm lint:agent` — passed, repository-wide.
- `rtk proxy pnpm format:check` — passed, repository-wide.
- `rtk proxy pnpm exec turbo boundaries` — passed: 23 packages, no violations.
- `rtk proxy node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M6-T3/verify.mjs` — 17 existing transport/recovery scenarios plus 19 completion integration scenarios passed.
- `git diff --check` — passed.

## Deferred verification

No native build, simulator/emulator run, screenshots, live provider/account, or real-server assistant run performed. Existing smoke workers should verify Coach sheet keyboard/scroll behavior, letter assistant rendering/accept/Undo/history, and single-strip company/role/badges on both platforms. Coordinator retains merge and translation extraction. Existing CI has no mobile harness task; these results are local, not CI evidence.

## Review correction: proposal toast Undo

Review of `179b0128c` found one P2 blocker: accepting a letter proposal, closing Assistant, and typing in the editor left a toast whose generic Undo removed that later typing. The existing resume proposal toast had the same weakness.

Both acceptance paths now capture the accepted state and dismiss/invalidate the toast after an intervening authored edit. A retained callback refuses to undo once invalidated, including after builder Undo returns to the accepted text. No-op acceptance creates no Undo toast. Account/document and lock guards remain. Listeners cover the maximum 12-second screen-reader action-toast window, and eligibility expires when monitoring ends.

Letter validation reuses `letterAdapter.matches` to compare authored fields, rather than whole-document identity: autosave revision/date/server metadata changes replace letter data without adding an undo step. Resume authored data references remain stable across saves under the existing resume adapter contract. No draft-store changes, new abstraction, or test-only production export were needed.

Extended the completion harness using real DraftStore and the actual letter/resume adapter data/merge/comparison behavior. Four cases cover both document kinds: accept → close Assistant → type → toast Undo preserves typing (and remains invalid after builder Undo); accept → save → toast Undo restores pre-proposal text while preserving letter revision metadata. Both typing cases demonstrably failed against `179b0128c` before the fix; both ordinary-save cases passed before and after it. Existing history/status/Undo scenarios also pass. Final local checks: mobile typecheck, repository lint/format, boundaries, full M6-T3 harness (17 transport + 19 integration), and diff whitespace.

## Review correction: accessible toast lifetime

Final review of `72ac24602` found that action toasts last 12 seconds with a screen reader (`ui/overlays.tsx`), while proposal guards stopped monitoring after six seconds without expiring eligibility. A letter edited from accepted text A to B after six seconds, then back to A in a separate history step, could therefore pass the old equality guard and Undo back to B.

Both letter and resume proposal guards now monitor for the full 12-second maximum and set eligibility false before unsubscribing at expiry. No UI API/export, store abstraction, or production-only test seam was added.

The real-DraftStore harness now uses controlled Date/setTimeout timers for both document types. It verifies valid accept-save-Undo at 11 seconds, refuses A → B → A edits starting at 6.1 seconds with a 1.1-second coalescing gap, and refuses retained callbacks after 12.001 seconds. The letter A → B → A regression and both post-expiry callback cases failed against `72ac24602` before the repair. All 19 integration scenarios pass after it, alongside the existing 17 transport/recovery scenarios. Mobile typecheck, repository lint/format, boundaries, and whitespace checks pass locally. Native and screen-reader device verification remain with smoke workers; no CI claim.

## Android Coach correction and scoped router lifecycle

Merged `mobile/native-app` first (fast-forward to `1097cb6a5`). Android reported the single workspace tab strip and company title passing; this task did not rerun that native check.

The shared phone Sheet inherited Gorhom 5.2.14's `switch` stack behavior. Its installed modal provider minimizes the previous modal when presenting another one. Workspace Coach contains ProviderGate's inline setup sheet, so Connect minimized its own parent, matching Android's observed Coach dismissal. Shared Sheet now reads its existing nesting context and uses `push` for nested sheets; root sheets retain `switch`. This also covers nested model/provider pickers without a new prop, dependency, native change, or separate presentation framework. Tablet FormSheet is unchanged.

ProviderGate previously blocked its children whenever no usable provider existed, including the conversation list selected by the header. History and selected saved transcripts now remain readable without a provider in workspace Coach, document Assistant, and career Coach. All three ChatView callers disable sending without a usable provider. Workspace history offers the existing New conversation action even when empty, returning to inline setup. Encryption precondition and thread/account/document ownership checks remain enforced.

Replaced the global Expo router import with public `useRouter` in the three exclusively assigned assistant files: `provider.tsx`, `assistant-screen.tsx`, and `page-marks.tsx`. Cross-document navigation receives the component's router and retains both target document and selected conversation. SessionGate and other router callers remain with their assigned owners.

Extended the existing completion harness with four behavioral scenarios. The nested setup scenario runs the actual shared Sheet, actual AI provider setup/form, and the installed Gorhom modal-provider queue; only native hosts/refs and external I/O are replaced. It opens the API-key form without minimizing Coach, then dismisses only setup. Provider-free workspace/document scenarios open exact history read-only, and empty workspace history returns to Connect without starting/sending a conversation. Navigation handlers execute with an unavailable global router and a working hook-owned router; Review, provider settings, model settings, and cross-document letter/resume navigation retain their destinations/thread IDs.

Baseline proof against `1097cb6a5`: workspace and document history each fail with missing conversation rows, nested Connect fails because the real modal queue minimizes Coach, and Review fails on the unbound global router. Restoring the fix makes the same scenarios pass. No production-only exports or source-grep tests added.

Local validation:

- Mobile typecheck; repository `lint:agent` and `format:check`; Turbo boundaries (23 packages); whitespace check — passed.
- M6-T3: 17 transport/recovery + 23 completion integration scenarios — passed.
- M6-T4: 13 provider/settings scenarios — passed.

Android worker `a3f01913-0a85-4e3c-8f12-9ac68aa5d46c` notified for coordinated release rebundle/live verification. Native presentation, keyboard/back behavior, and activity-recreation verification remain device-worker work; Node harness is not native proof or CI. No native build, push, deployment, catalog, ledger, manifest, or lockfile edits performed here.


## Review correction: read-only Retry

Review of `f6d2c3030` found Retry bypassed the composer's readiness guard: after a failed reply, removing/disabling the usable provider still allowed Retry to call `regenerate` or resend a tool continuation. The shared Conversation Retry handler now returns before clearing the error or scheduling a request when read-only; its button also disables using the same effective read-only flag (server read-only or caller disabled).

The existing completion harness now fails a real Chat request, changes workspace provider readiness to unavailable, invokes Retry directly, and asserts no second request plus a disabled button. Restoring readiness enables Retry and produces the actual streamed answer. Before the fix, the scenario failed with two send requests instead of one; afterward it passes. This exercises the owner handler rather than merely asserting its visual prop. Composer, starters, Continue, and question-action rendering were inspected for the same exposed readiness bypass; no additional exposed action found. No broad refactor or production-only test seam.

Local mobile typecheck, repository lint/format, package boundaries, and full M6-T3 harness pass (17 transport + 24 completion scenarios); whitespace check passes. No native rebuild, catalog, ledger, dependency, or manifest edits. Final native verification remains with device workers. Reviewer short ID `e6efb014` did not resolve through the agent messaging tool; parent notified to forward the final SHA for the narrow recheck.
