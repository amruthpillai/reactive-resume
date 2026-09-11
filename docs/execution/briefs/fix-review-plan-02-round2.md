# Address second independent review: plan 02

Read `.orchestration/plan-02-rereview.md`, pinned approved plan 02, current `AGENTS.md`, RTK, and applicable
receiving-code-review/TDD/documentation skills. Reproduce the remaining finding before editing.

Use strict TDD. Add failing regressions first, then make the smallest conservative fix within the original four-file scope:

- For non-string object input, validate the supplied object in its original form before any serialization. Schema-invalid
  objects must return a deterministic blocked manifest and must never produce `no-op`.
- Cover at least a boxed string (`new String("")`) that serializes to a valid primitive and a schema-invalid object with a
  custom `toJSON`. Assert the latter is not executed before validation when the input is invalid.
- Keep JSON-text behavior: parse text, validate the parsed value exactly, and retain raw-versus-parsed normalization checks.
- Preserve target presence invariants, strict source/target validation, deterministic hashes and reasons, pure/non-networked/
  non-writing behavior, and existing documentation claims. Change docs only if implementation makes a current sentence false.

Do not access private data, add DB/filesystem writes, implement legacy conversion, widen scope, or rewrite prior reports.
Run focused RED/GREEN tests, tooling typecheck, relevant API/auth checks, boundaries, narrow Biome/Markdown when applicable,
diff and four-file scope gates. Add a normal follow-up commit.

Write `.orchestration/plan-02-review-fix-round2.md` with reproduction, RED/GREEN, exact commit/files, commands/results,
skipped gates, and remaining risks. Do not push/open PR/merge/mutate issues/spawn subagents. Final response at most ten lines.
