# Address independent review: plan 09

Read `.orchestration/plan-09-review.md`, pinned plan 09, current `AGENTS.md`, RTK, and applicable
receiving-code-review/documentation skills. Verify two findings against current source before editing; both are provisionally
accepted.

Edit only two approved guide files:

- In export guide, scope “excludes cover letter sections” to rendered PDF/DOCX/Markdown output and state JSON retains
  embedded cover-letter custom sections. Keep distinction from independent cover-letter JSON.
- In version-history guide, do not claim template changes create independent checkpoints. Describe template changes as
  ordinary editing covered by throttled snapshots; retain accurate explicit import/AI/API/restore checkpoint statements.

Do not alter local Git workflow, add runtime code, promise whole-account restore/sync, or widen scope. Rerun focused source
checks, API/import/schema/web tests if wording relies on them, Markdown lint, synthetic Git workflow as needed,
`git diff --check`, and two-file scope gate. Add normal follow-up commit. Write `.orchestration/plan-09-review-fix.md` with
exact commit/files, verified source facts, commands/results, skipped gates, and risks. Do not push/open PR/merge/mutate
issues/spawn subagents. Final response at most ten lines.
