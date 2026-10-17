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
- `rtk proxy node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M6-T3/verify.mjs` — 17 existing transport/recovery scenarios plus 11 completion integration scenarios passed.
- `git diff --check` — passed.

## Deferred verification

No native build, simulator/emulator run, screenshots, live provider/account, or real-server assistant run performed. Existing smoke workers should verify Coach sheet keyboard/scroll behavior, letter assistant rendering/accept/Undo/history, and single-strip company/role/badges on both platforms. Coordinator retains cross-harness review and translation extraction. Existing CI has no mobile harness task; these results are local, not CI evidence.
