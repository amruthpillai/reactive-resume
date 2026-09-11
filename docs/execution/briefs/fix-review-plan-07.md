# Address independent review: plan 07

Read `.orchestration/plan-07-review.md`, approved plan 07 from pinned planning head, current `AGENTS.md`, RTK, and applicable
documentation/receiving-code-review skills. Verify finding against current diff and runtime files. Finding is provisionally
accepted: current update recipe pulls all Compose services while `postgres:latest` can cross major versions, contradicting
separate-upgrade guidance.

Edit only `docs/self-hosting/docker.mdx`. Make normal app update path pull and recreate only `reactive-resume`; do not pull or
recreate PostgreSQL as part of app update. Direct database updates to separately chosen major-pinned image/provider upgrade
procedure with backup/restore verification. Preserve existing app migration explanation and two-service topology. Do not add
unsafe generic PostgreSQL commands, Compose/runtime changes, or new scope.

Rerun focused update/PostgreSQL `rg`, Compose config, two-doc Markdown lint, internal-link inspection, `git diff --check`,
and name-only scope. Amend or add a normal follow-up commit; do not rewrite reviewer report. Write
`.orchestration/plan-07-review-fix.md` with exact commit, change, commands/results, skipped gates, and remaining risk. Do not
push, open PR, merge, mutate issues, or spawn subagents. Final response at most ten lines.
