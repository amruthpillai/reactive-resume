# Independent hosted review: Plan 15A picture fitting

Review only in `/Users/amruth/orca/workspaces/reactive-resume/issue-2782-picture-fit` and live PR #3461.
Exact target head: `6145d5a5925373287b87dfaa30ab675ebc84e105`. Do not edit tracked files, commit, push, reply,
resolve threads, merge, or mutate issues.

Read current repository instructions, pinned approved Plan 15, implementation and review reports, full
`origin/main...HEAD` diff, issue #2782, live PR checks/reviews, and every current review thread. Refresh base and verify
exact head. Run root Intent inventory and load matching review skill if any; no subagents.

Adjudicate hosted feedback independently. Current Codacy threads note:

- Contain uploads intentionally bypass cropping to preserve original image; users can only access crop flow in Cover.
- `PictureFitField` could map over fit-option metadata instead of declaring two buttons.

Determine whether either is a real Standards or approved-Spec defect. Verify selected-mode behavior, accessible labels,
autosave/lock behavior, original-file preservation, warning copy, test mutation sensitivity, and whether refactoring would
improve correctness rather than merely alter style. Inspect any CodeRabbit or later threads that exist at review time.

Run focused web/schema/PDF tests and narrow non-writing formatting/diff gates as needed. Report findings first with
severity and anchors, exact-head/check state, each thread disposition, and publication verdict in
`.orchestration/plan-15a-hosted-review.md`; send `worker_done`.
