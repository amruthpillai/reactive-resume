# Task 4 Fix 2 Report

## Outcome

Implementation commit: `2e9be4dcd` (`fix: align RRSS reference hints with cascade`)

- The generated RRSS property table no longer advertises `%` for `size` or `-rr-min-presence-ahead`.
- `-rr-min-presence-ahead` no longer advertises generic length keywords that structural resolution rejects.
- The compiler still accepts the existing generic length grammar; reference hints are now narrower than parser grammar where runtime support requires it.
- `-rr-fixed: 0` and `-rr-fixed: 1` now resolve to `false` and `true`, preserving the existing accepted and documented contract.
- `@reactive-resume/tooling` now exposes the conventional `test:ci` script, so the root Turbo task runs the committed three-artifact synchronization assertion.

## Rationale

The property registry was serving two related but different purposes: compiler grammar and public completion/reference hints. Narrowing `PROPERTY_REGISTRY_V1` alone would have silently removed already accepted compiler grammar. The minimal coherent split keeps generic length keyword parsing backed by `RRSS_LENGTH_VALUE_KEYWORDS_V1`, while the registry publishes only values and units that survive full cascade resolution.

The cross-layer regression test compiles and resolves every registry keyword and a representative value for every advertised unit against an applicable semantic node. This catches metadata that is parser-valid but resolver-invalid. Its first run exposed the reported `size` and `-rr-min-presence-ahead` mismatches plus the pre-existing `-rr-fixed: 0/1` resolver mismatch.

## TDD Evidence

Red:

- `pnpm --filter @reactive-resume/resume exec vitest run src/stylesheet/cascade.test.ts`
  - Failed 13 advertised hints: `size: 1%`, `-rr-min-presence-ahead` with nine generic length keywords and `1%`, and `-rr-fixed: 0/1`.
- `pnpm --filter @reactive-resume/resume exec vitest run src/stylesheet/cascade.test.ts -t 'maps the accepted -rr-fixed'`
  - Failed both direct mapping cases because `structural.fixed` remained undefined.
- `pnpm --filter @reactive-resume/resume exec vitest run src/stylesheet/values.test.ts -t 'preserves the accepted generic length keyword'`
  - Passed 9 characterization cases before the registry/parser split.

Green:

- `pnpm --filter @reactive-resume/resume exec vitest run src/stylesheet/cascade.test.ts`
  - Passed 1,365 tests.
- `pnpm --filter @reactive-resume/resume exec vitest run src/stylesheet/values.test.ts -t 'preserves the accepted generic length keyword'`
  - Passed 9 tests.

## Generation and Verification

- `pnpm docs:gen`
  - Passed without secrets and regenerated only `docs/guides/semantic-css-reference.mdx`.
- Second `pnpm docs:gen`, comparing `git hash-object` output before and after for:
  - `docs/guides/semantic-css-reference.mdx`
  - `docs/guides/json-resume-schema.mdx`
  - `skills/resume-builder/references/schema.md`
  - `docs/spec.json`
  - Passed; all artifact hashes were identical.
- `pnpm --filter @reactive-resume/resume test`
  - Passed 17 files and 1,540 tests.
- `pnpm --filter @reactive-resume/tooling test:ci -- semantic-css/generate-reference.test.ts`
  - Passed 1 file and 9 tests, including the non-mutating committed-artifact synchronization assertion.
- `pnpm --filter @reactive-resume/resume typecheck`
  - Passed.
- `pnpm --filter @reactive-resume/tooling typecheck`
  - Passed.
- `pnpm exec biome check packages/resume/src/stylesheet/cascade.test.ts packages/resume/src/stylesheet/cascade.ts packages/resume/src/stylesheet/registry/properties.ts packages/resume/src/stylesheet/values.test.ts packages/resume/src/stylesheet/values.ts tooling/package.json`
  - Passed; 6 files checked with no fixes.
- `pnpm exec markdownlint-cli2 docs/guides/semantic-css-reference.mdx`
  - Passed with zero issues.
- `pnpm exec turbo boundaries`
  - Passed; 908 files across 19 packages.
- `pnpm exec turbo run test:ci --dry=json | jq -r '.tasks[] | select(.package == "@reactive-resume/tooling") | [.taskId, .command] | @tsv'`
  - Confirmed `@reactive-resume/tooling#test:ci` is in the root task graph with the conventional Vitest CI command.
- `git diff --check`
  - Passed.

No Chrome or Playwright browser session was used.

## Concerns

None. Manual prose coverage for two-number `flex` remains outside this fix as assigned.
