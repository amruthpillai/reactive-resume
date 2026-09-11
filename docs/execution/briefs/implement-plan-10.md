# Implement plan 10: prospective retired-link attempt notices

Read approved plan 10 from local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/10-legacy-link-routing.md`. Read current `AGENTS.md`, RTK,
issue/domain/DB migration guidance, ADRs, and applicable brainstorming/TDD skills. Approved prospective direction and routine
limits bind; do not ask them again. Run root Intent inventory and load matching local skill before edits. Do not spawn
subagents, touch ledger, mutate issues, merge, push, or create PR.

Start clean from refreshed `origin/main`, rename branch `codex/issue-2836-retired-link-notices`, revalidate issue 2836/open
PRs/current source, and run exact drift. Historical cause remains unknown: reference issue without closing keyword. Scope is
future slug changes under unchanged current username, 90 days, newest 50 per resume, aggregate owner-only attempts, safe 404;
no redirects, email/push, backfill, username history, visitor identity, or historical recovery.

Strict TDD, one coherent migration/API/UI/docs/E2E unit:

- Add additive `resume_retired_link` table: generated ID, cascading owner/resume FKs, retired username/slug/timestamp,
  aggregate attempt count and nullable last attempt. Unique username+slug, resume+retired index. No IP, UA, email, content.
  Generate one migration via repository workflow against disposable PostgreSQL only; review SQL/snapshot for no drops/rewrites.
- Add pure/service tests before code for old-path capture inside existing locked slug transaction, unchanged slug no-op,
  rollback atomicity, prune expired and beyond newest 50, live-path reuse removal, same-owner reuse, current-route priority,
  renamed username/deleted/private/expired/competing route denial.
- On no-current-row lookup only, recognize valid retired path, best-effort increment outside rolled-back NOT_FOUND transaction,
  and always return original indistinguishable 404. Owner excluded. Separate one-hour dedup with hard 50,000 active-entry cap:
  prune expired then evict oldest. Unknown probes allocate nothing. Count failure remains 404 and never increments views.
- Protected owner listing only: verify resume ownership, lazy expiry prune, at most 50 sanitized newest-first records. Preserve
  existing statistics response shapes. Another owner/missing resume denied.
- Owner Statistics UI: empty state omitted; recorded paths show aggregate count/last attempt and explicit prospective
  90-day/50-path/same-username limits. No visitor data or notification toggle. Lingui messages and focused DOM tests.
- Public sharing guide documents exact limits. No public route response change needed.
- E2E with disposable accounts/DB: rename first→second, anonymous old 404 increments once with dedup, live new path view
  independent, owner old-path excluded, cross-owner denied, private/deleted/expired no leak, live reuse wins/removes retired
  attribution. Correct audit gate: run `public-sharing.spec.ts`, not unrelated dashboard `resume-views.spec.ts`.

Use `.env.retired-links-test.local` only if it is clearly disposable; never production DB. Run RED/GREEN DB/API/web tests,
migration generate/apply fresh and populated upgrade, DB/API/web typechecks, translation extraction, boundaries, build,
focused E2E plus public-sharing, narrow non-writing Biome, and diff/migration/scope review. Disclose/inspect write-capable
`pnpm check`. Stop on unreliable transaction attribution, uniqueness drift, migration uncertainty, or privacy leak. Commit
locally; no push/PR before independent review.

Write `.orchestration/plan-10-implementation.md`: live/drift state, exact migration/base, facts vs uncertainty, RED/GREEN,
commit/files, tests/results, skipped DB/E2E gates, privacy/transaction risks, partial issue coverage, PR `not created`. Final
response at most ten lines.
