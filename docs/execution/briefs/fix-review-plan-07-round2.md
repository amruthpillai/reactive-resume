# Plan 07 late hosted-review fix

Work in `/Users/amruth/orca/workspaces/reactive-resume/issue-2722-postgres-docs` on
`codex/issue-2722-postgres-docs`. Current remote/local head should be
`a7b8c4cc5754c1249534d0ed8993e67e57e2cb87`; PR #3457 stays open and unmerged.

Read current instructions, pinned approved Plan 07, all implementation/review reports, complete `origin/main...HEAD`
diff, and live PR thread `PRRT_kwDODuah5s6fnaBa` / comment `3942253797`. Revalidate current base/head/checks first.
Run root Intent inventory before edit. Do not spawn subagents.

Finding: numbered update flow is correctly introduced as image-quickstart-only, and repository alternative already uses
`reactive_resume`; however repository users following that alternative can continue to image-only step 4 and run logs
against nonexistent `reactive-resume`. Make path separation unmistakable and provide correct repository log command
`docker compose logs -f reactive_resume` adjacent to its build update. Preserve image commands and app-only `--no-deps`
policy; do not widen into dependency lifecycle or PostgreSQL upgrade changes.

Use minimal docs edit. Validate both Compose service names/commands against current files, run Compose dry-runs,
PostgreSQL/docs gates proportionate to changed claim, Markdown/link/command/diff/exact-scope checks. Commit locally with
normal message. Do not push, reply, resolve thread, mutate issue, or merge. Write
`.orchestration/plan-07-hosted-review-fix-round2.md` and send worker_done.

