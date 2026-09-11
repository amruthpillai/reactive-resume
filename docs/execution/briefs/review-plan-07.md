# Independent review: plan 07 self-hosting documentation

Review only; do not edit, commit, push, open PR, mutate issues, or spawn subagents. Read current worktree `AGENTS.md`, RTK,
issue/domain guidance, code-review/documentation skills, implementation report `.orchestration/plan-07-implementation.md`,
and approved plan 07. Trust local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned `git show` for `plans/07-aio-deployment.md`.

Fetch current `origin/main` and live issue/PR state. Confirm reviewed branch/commit and inspect complete
`origin/main...HEAD` diff. Verify every runtime/config claim against current Dockerfile, Compose, env validation/example, and
startup code. Review approved scope and reader safety:

- State supported one-app-container plus separate PostgreSQL topology and no planned AIO image without claiming issue 2722
  implemented or closed.
- Smallest checklist and generic Unraid/homelab guidance use exact current service/path/port/env facts, warn that container
  `localhost` is wrong for PostgreSQL, and never expose DB publicly or assert official Unraid support.
- Managed PostgreSQL reuse, optional Redis/S3 boundaries, database/upload backups, container updates, and PostgreSQL major
  upgrades are accurate, non-duplicative, cross-linked, and safe for novice operators.
- Diff contains only two approved docs and retains existing MDX structure/links.

Rerun focused `rg`, Compose config, Markdown lint, link inspection, and `git diff --check`. Record unavailable Unraid/Mintlify
checks as residual gates, not success. Findings first, ordered by severity with exact file/line and evidence. If none, state
`No findings` and residual risks.

Write `.orchestration/plan-07-review.md` with reviewed SHA/base, findings, commands/results, skipped gates, risks, and verdict
`ready for publication` or `changes required`. Final response at most ten lines.
