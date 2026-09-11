# Implement plan 02 synthetic recovery procedure

Read first:

1. Entire approved plan from local planning checkout only when its HEAD equals
   `a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned `git show` fallback below.
2. Audit evidence: `/Users/amruth/orca/workspaces/reactive-resume/codex-audit-backend-01-06/.orchestration/revalidate-backend-01-06.md`, plan 02 section.
3. Current worktree `AGENTS.md`, referenced issue/domain instructions, relevant ADRs, `/Users/amruth/.codex/RTK.md`.
4. `/Users/amruth/.agents/skills/test-driven-development/SKILL.md`, its `writing-good-tests.md` reference,
   `/Users/amruth/.agents/skills/karpathy-guidelines/SKILL.md`, and
   `/Users/amruth/.agents/skills/documentation-writer/SKILL.md`.

Portable plan fallback: fetch PR #3455 and use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/02-hosted-v4-account-recovery.md`.

Implement only synthetic, non-networked recovery support. This is partial support for #3181, not production recovery; #2760
remains a separate diagnostic. Do not access private/production data, spawn subagents, touch coordinator ledger/other
worktrees, merge, push, create PR, or mutate issues.

Required execution:

- Confirm clean worktree; fetch current `origin/main`; rename branch `codex/issue-3181-recovery-procedure`; verify exact base;
  run plan drift command; fetch live #3181/#2760 evidence; run root intent discovery.
- Modify only `docs/self-hosting/migration.mdx`, `docs/guides/accessing-the-previous-version.mdx`, and new
  `tooling/recovery/compare-resume.ts` plus `tooling/recovery/compare-resume.test.ts`. Stop if another file is truly required
  and report before broadening.
- TDD tooling strictly: write focused behavior test, run it and capture expected missing-feature failure, implement minimum,
  rerun green, then refactor. Tests must exercise real function and hand-derived outcomes/hashes; no tautological helpers or
  mock assertions.
- Tool accepts already-exported JSON/current resume-shaped data only; no database URL or writes. Produce deterministic dry-run
  manifest with synthetic IDs, source/target hashes, and outcome `no-op`, `export-copy`, or `blocked`. Cover identical,
  old-only/divergent, owner-unverified/mapping-missing, unavailable snapshot, invalid source/target JSON, determinism, and no
  input mutation. Use current schema/default exports through package public exports. Do not invent legacy fields or convert v4.
- Docs specify per-owner case record, source snapshot time, owner verification, target ID, content hash, proposed outcome,
  default private export, separate copy/no overwrite, hosted-vs-self-hosted authority, missing-source factual limit, and
  private delivery gate. Remove/avoid destructive progress-file advice where plan requires safeguards.
- Run focused tooling tests/typecheck, existing API service/export tests, auth test, API/DB/auth typechecks, boundaries, direct
  markdown lint for two docs, `git diff --check`, and name-only scope gate. Record any environment-gated skips exactly.
- Self-review every plan acceptance and STOP condition. Commit normal message. Leave branch local for independent review.

Report `.orchestration/plan-02-implementation.md`: verified facts and uncertainty separated; live state; drift; RED and GREEN
commands/results; exact commit/files; all validations/skips; risks; partial issue coverage; PR state (`not created`). Final
response: status, commit, one-line tests, report path, concerns; at most ten lines.
