# Completed PRs and remaining concurrency scope

Verified 2026-09-05 at approximately 19:21 UTC. Both PRs are open, fully reviewed, and unmerged. All hosted checks passed on the exact heads below. The planning task must not merge them.

| PR | Head | Behavior and verification |
| --- | --- | --- |
| [#3453](https://github.com/amruthpillai/reactive-resume/pull/3453) | `ccd111da894cf7d44cc3dee06c937f70d91fef24` | Saves queued edits before leaving the builder; failed saves retain the draft. A 10-second navigation wait limit leaves a hanging write in flight, keeps the draft/Saving state, and shows an informational notice. Late acknowledgments and queued edits complete normally. 805 web tests, three production Chromium/PostgreSQL regressions, typecheck, build, repository checks, boundaries, independent review, and all hosted checks passed. |
| [#3454](https://github.com/amruthpillai/reactive-resume/pull/3454) | `80b0d3ab02cc4292f8a4514db8c2516adc1f9dc3` | Thumbnail pixels follow measured card size and DPR with bounded canvas memory, resolution-aware query identity, retained previous images, resize debounce, and offscreen deferral. Superseded queries cancel active PDF.js work and clean up loading tasks. Fifteen focused tests, the earlier 804-test full web baseline, typecheck, build, repository checks, boundaries, 22 production density measurements, independent reviews, and all final hosted checks passed. |

No additional implementation or GitHub issue comments are authorized in this planning task. The 63-issue inventory excludes #3246 and #2828 because their current PRs were the two exceptions the maintainer asked to finish. That exclusion does not mean every historical claim in either report has been verified.

## #2828: separate concurrent-tab overwrite remains

PR #3453 fixes a current save/navigation loss path. It does not fix simultaneous edits from stale tabs. Preserve this distinction in any review, issue resolution, or later execution assignment.

### Verified reproduction

Use two authenticated tabs for the same disposable resume, loaded from the same saved revision:

1. In tab A, edit `basics.name`. In tab B, edit `basics.headline` without accepting an intervening stream update.
2. Intercept both outgoing whole-resume update requests before they reach the server. Hold them independently.
3. Release A and confirm the database contains the new name.
4. Release B and confirm the name reverts to its original value while B's new headline remains.

This order was reproduced with actual Chromium tabs and PostgreSQL. A sequential control—allow B to receive A's stream update before editing—preserves both fields. A separate queued-save-failure/retry control also preserves the newest local edits. These controls distinguish stale whole-document replacement from generic save unreliability. The original cloud report still lacks timestamps/version history, so its historical cause is not established by the new reproduction.

### Current implementation seams

- `apps/web/src/features/resume/builder/draft.ts`: `Runtime`, `setRuntimeBaseline`, `flushResumeSave`, `queueResumeSave`, and `useResumeUpdateSubscription` own local pending data, serialized saves, and remote updates.
- `packages/api/src/dto/resume.ts`: whole-resume update contract needs a revision precondition if that design is selected.
- `packages/api/src/features/resume/crud.ts` and `service.ts`: the whole-data write is currently unconditional. The existing row-lock seam is the place to compare the accepted revision before writing.
- The JSON Patch flow already has optional `expectedUpdatedAt`; it does not protect the builder's whole-document update path automatically.
- An unpublished guard prototype and tests exist in the advisor's separate worktree. Do not depend on that path or assume it is a complete fix. Reconstruct the accepted design from current source and tests when implementation is authorized.

### Pending product decision and required invariants

The maintainer has not chosen between automatically combining non-overlapping edits with explicit choices for collisions, and stopping on every concurrent change to compare drafts. Do not implement a conflict UI or silently pick a winner before that decision.

Any chosen design must:

- Pair the accepted baseline data with its revision. Metadata-only stream updates must not advance the data revision while the local draft still represents older content.
- Reject stale writes under the existing transaction/row lock before replacing stored data. Millisecond `updatedAt` values can collide; verify or establish a monotonic revision invariant rather than assuming two writes always have different clock timestamps. Coordinate all relevant update paths.
- Retain edits made while a request is in flight. On a conflict, fetch current server data and compare it with the paired baseline and the **current** draft, not just the request's older snapshot.
- Treat section items as stable-ID collections: combine edits to different fields/items when permitted by the chosen policy; preserve one-sided reordering plus independent item edits. A deleted item versus an edited item is a collision. Competing order changes must not discard independently resolved item content. Positional arrays require an explicit atomic policy.
- Keep unresolved local drafts intact and editable. Do not resolve conflict by reloading the page or replacing the draft wholesale. Recheck the latest revision before applying a user's conflict choices.
- Preserve #3453's serialized saving, late-acknowledgment behavior, navigation guard, and native unload warning. A waiter timeout must never launch a duplicate write.

### Required regression cases for a later plan

Use API tests beside `features/resume/service.test.ts`, pure merge tests in the owning resume-domain package if a merge policy is selected, builder tests beside `draft.test.ts`, and actual browser/database tests following `tests/e2e/specs/builder-save-navigation.spec.ts` from #3453.

Cover matching/stale revisions; two writes within one clock millisecond; unrelated scalar edits; same-field collisions; edits during an in-flight request; metadata-only events; independent stable-ID item edits; add/remove; deletion versus edit; one-sided reorder plus independent field edits; competing order changes; a second conflict while resolving the first; save failure/retry; and navigation while conflict resolution remains pending.

The ordinary-path control must preserve both edits without requiring manual conflict choices. The chosen conflicting-path behavior must retain both candidate values until the user or approved policy resolves them. A passing optional server guard alone is not completion: the builder must actually send and recover from the precondition.
