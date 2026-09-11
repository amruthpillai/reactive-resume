# Address independent review: plan 02

Read `.orchestration/plan-02-review.md`, pinned approved plan 02, current `AGENTS.md`, RTK, and applicable
receiving-code-review/TDD/documentation skills. Verify each finding with direct probes before editing. Three findings are
provisionally accepted: lossy schema fallback can yield false no-op, target ID/data states can contradict, and migration docs
overstate raw v4 JSON support.

Use strict TDD. Add failing regressions first, then smallest conservative fixes within original four-file scope:

- A source with schema-invalid value that current Zod `.catch` would normalize to target must never return `no-op`. Validate
  without accepting lossy coercion/default mutation, or hash validated raw canonical input while explicitly detecting and
  blocking lossy schema changes. Prefer safe false-block/export over false no-op. Cover source and target variants.
- Enforce target presence invariant: target data and target resume ID are either both absent or both present. Encode a
  discriminated input contract where practical and keep runtime validation for untyped callers. Both mismatch directions
  return deterministic blocked manifest with named reason; no contradictory target hash/ID.
- Clarify migration guide: only JSON text already conforming exactly to current v5 resume-data schema is accepted; raw v4
  exports are unsupported; comparator performs no conversion; historical converter review remains separate prerequisite.
- Add sentence that hashes prove content equality only, never ownership/source authenticity/recipient identity.

Preserve pure/non-networked/non-writing behavior and deterministic manifest. Do not access private data, add DB/filesystem
writes, implement legacy conversion, widen scope, or rewrite prior reports. Run focused RED/GREEN tests, tooling typecheck,
relevant API/auth checks, boundaries, narrow Biome/Markdown, diff and four-file scope gates. Add normal follow-up commit.

Write `.orchestration/plan-02-review-fix.md` with probes, RED/GREEN, exact commit/files, commands/results, skipped gates, and
remaining risks. Do not push/open PR/merge/mutate issues/spawn subagents. Final response at most ten lines.
