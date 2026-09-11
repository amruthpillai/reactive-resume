# Independent review: plan 02 synthetic recovery

Review only; do not edit, commit, push, open PR, mutate issues, or spawn subagents. Read current worktree `AGENTS.md`, RTK,
issue/domain guidance, code-review/receiving-code-review/testing skills, implementation report
`.orchestration/plan-02-implementation.md`, and approved plan 02. Trust local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise read
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/02-hosted-v4-account-recovery.md`.

Fetch current `origin/main` and GitHub issue/PR state. Confirm reviewed branch/commit and inspect complete
`origin/main...HEAD` diff. Treat prior report as a claim to verify. Review standards and approved-plan fidelity, especially:

- Comparator is pure, deterministic, non-networked, non-writing, current-schema-only, and never implies owner/source
  authenticity from hashes. Validate no import-time effects or accidental sensitive logging.
- Manifest contracts and tests correctly cover identical, old-only, divergent, owner/mapping/source blocks, malformed input,
  determinism, immutability, and stable IDs/hashes. Seek false positives and weak self-fulfilling tests.
- Docs distinguish hosted operator authority from self-hosted authority, require owner verification/mapping/private delivery,
  forbid overwrite/default public exposure, state no-source limits, and make no v4 conversion/recovery promise.
- Scope contains exactly four approved files. No private data or destructive recovery steps.

Rerun focused tooling test/typecheck, relevant API/auth tests, affected typechecks, boundaries, narrow Biome/Markdown checks,
and `git diff --check`; rerun broader tests only where a finding needs proof. Record skipped gates. Findings first, ordered by
severity with exact file/line and concrete evidence. If none, state `No findings` and residual risks.

Write `.orchestration/plan-02-review.md` with reviewed SHA/base, findings, commands/results, skipped gates, risks, and verdict
`ready for publication` or `changes required`. Final response at most ten lines.
