# Address third independent review: plan 02

Read `.orchestration/plan-02-rereview-round3.md`, pinned approved plan 02, current `AGENTS.md`, RTK, and applicable
receiving-code-review/TDD/documentation skills. Reproduce both findings before editing.

Use strict TDD. Narrow comparator public input contract to one serialized JSON request string. This is approved engineering
correction: object-envelope inputs are no longer accepted. A non-string runtime argument must be rejected immediately,
before any property access, schema parsing, serialization, accessor call, proxy trap, or caller method. Keep returned
manifest deterministic and add an explicit stable invalid-input reason/identity convention where needed.

After parsing the primitive string with `JSON.parse`, strictly validate complete envelope before hashing:

- non-empty string case/source IDs and either null or non-empty string target ID;
- literal booleans for all three safety flags; named gate failures still apply only to valid `false` values, while truthy
  non-booleans are invalid input;
- required JSON-compatible source/target values with target presence invariant retained;
- no unknown envelope keys, executable/non-JSON values, NaN/Infinity, or lossy envelope normalization.

Parsed JSON creates inert data; retain exact current-v5 resume validation, raw-vs-schema canonical equality checks,
deterministic SHA-256 hashes, no-op/export-copy semantics, and pure/no-network/no-write/no-output behavior. Update migration
docs to say comparator accepts a serialized comparison request only, not object arguments.

RED regressions must cover each reported bypass: string `"false"` for each safety flag; numeric/empty IDs; top-level
accessor/proxy objects with zero getter/trap calls; schema-valid changing getters if passed as object; malformed request
JSON/NaN; distinct non-JSON-versus-null identity; all prior boxed-string/custom-`toJSON`/template/target mismatch cases.
Adapt success tests to serialized request input. Prefer a small strict Zod input schema if available through public package
exports; avoid custom recursive proxy detection because narrowing to JSON text removes that surface.

Run focused RED/GREEN tests, tooling typecheck, relevant API/auth checks and typechecks, boundaries, narrow Biome/Markdown,
static import, diff/four-file scope gates. Add normal follow-up commit. Write `.orchestration/plan-02-review-fix-round3.md`
with reproductions, RED/GREEN, exact commit/files, commands/results, skipped gates, risks. Do not push/open PR/merge/mutate
issues/spawn subagents. Final response at most ten lines.
