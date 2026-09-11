# Independent review: plan 11 JSearch/current tailoring documentation

Review only; do not edit, commit, push, open PR, mutate issues, or spawn subagents. Read current `AGENTS.md`, RTK,
issue/domain guidance, code-review/documentation skills, `.orchestration/plan-11-implementation.md`, and approved plan 11.
Trust local planning checkout only when HEAD equals `a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned `git show`
for `plans/11-job-search-policy.md`.

Fetch current `origin/main` and live issue/PR state. Inspect complete diff and verify every historical/runtime/UI claim against
Git history and current source/tests:

- v5.1.0 removal timing of JSearch/RapidAPI Job Listings is factual; removal motive remains unknown.
- Legacy settings redirect, current Integrations/provider setup, supplied job-description tailoring, attachments, review edits,
  patch inspection, and Restore labels/workflow match current UI/source.
- Provider-native live web search is clearly capability/provider/model-dependent and not equated with structured JSearch
  results. Unsupported setups can use pasted/attached content without implied live search.
- No stale model list, paid API restoration, credentials, quotas, unsupported attachment promise, unverified motive, or issue
  closing claim. Prose minimal and non-duplicative. Diff exactly three docs.

Rerun agent/capability tests, Git history/source checks, Markdown lint, links, diff/scope gates. Optional real provider/browser
flow remains a named skip. Findings first, severity-ordered with exact file/line/evidence; otherwise `No findings` plus risks.

Write `.orchestration/plan-11-review.md` with reviewed SHA/base, findings, commands/results, skipped gates, risks, and verdict
`ready for publication` or `changes required`. Final response at most ten lines.
