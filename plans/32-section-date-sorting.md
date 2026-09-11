# Plan 32: Define explicit date sorting with stable unknown-date behavior

## Selected direction and authority

Agent judgment: one-shot reverse chronological sorting for Experience/Education first; ongoing entries first, then descending end date and start date, stable ties, unresolved/reversed ranges stable at the end with a concise notice identifying affected entries. Preserve every free-text date. Year-only endpoints retain year precision; a missing month gets a deterministic lower tie-break rank within that year, never a fabricated persisted month.

No persistent autosort or implicit sorting of roles/custom sections in this increment. Document that the original automatic/manual toggle request is only partially addressed by a one-shot action; do not close it as fully implemented without accepting that limitation.

## Status

- **Issue:** [#2725](https://github.com/amruthpillai/reactive-resume/issues/2725).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort M, risk medium for unexpected reorder and free-form dates.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Confidence:** High that period strings are free-form and existing parsing can be reused for some cases; the selected comparator remains subject to the parser’s nullable results.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/resume/src/ats/period.ts packages/schema/src/resume/data.ts apps/web/src/routes/builder apps/web/src/dialogs/resume/sections`.

- Experience/Education items store `period: z.string()` in `packages/schema/src/resume/data.ts`; they do not store authoritative start/end timestamps for sorting.
- `packages/resume/src/ats/period.ts:199` exports `parsePeriod(value, locale = "en-US"): ParsedPeriod | null`. It recognizes localized months, several range separators, ongoing tokens, partial years, and returns null for unsupported text.
- `ParsedPeriod` contains optional start/end endpoints and `ongoing`. A standalone ongoing token can return null. Do not assume every “Present” value is sortable.
- `packages/import/src/date.ts` formats ISO dates into display strings; it is not a reverse parser and is not a safe sort key generator.
- Existing section editors/menus mutate arrays through `useUpdateResumeData`; a pure sorting operation must return existing item IDs without rewriting their content.

## Scope and dependencies

Scope: a pure domain helper in `packages/resume/src/section-sort.ts` with an explicit export if needed, its tests, and Experience/Education menu controls. Reuse the existing period parser through an existing or explicit domain export rather than copying locale logic. Persistent autosort would require a separate approved schema/interaction design. Do not sort all section types or individual roles implicitly. Coordinate plan 24 only for presentation; visual date position must not alter sort keys.

## Steps and gates

1. **Characterize parse coverage.** Build a table for `2020 - 2024`, `January 2024 - Present`, localized month names, year-only endpoints, reversed ranges, empty strings, `Present`, arbitrary prose, and equal ranges. Call the existing parser with each resume locale and record nullable results. Keep input strings unchanged.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/resume exec vitest run src/ats/period.test.ts` passes. A new characterization table explicitly marks unsupported cases rather than coercing them to zero dates.

2. **Encode the stable comparator.** Partition ongoing, known-ended, and unresolved/reversed entries. Ongoing sorts by descending start; known-ended by descending end then start; ties keep original index. Use a lexicographic endpoint key `[year, month ?? 0]` for descending sort. Zero is an internal missing-month rank, not a January date; never write it back. This total order prevents a mixed-precision comparator from becoming non-transitive. Missing optional endpoint sorts after a known endpoint in the same group. Unresolved entries preserve original order at the end. Do not invoke sorting from autosave or render.

   **Gate:** A table-driven test with ongoing 2024, ongoing 2020, ended 2025, ended 2024, two equal 2023 ranges, empty, and prose expects that exact order; add mixed-precision, missing endpoint, and reversed-range cases. Do not use Date.parse on display strings.

3. **Implement a pure projection first.** Use this proposed helper contract: `sortSectionItemsByPeriod(items, locale)` returns `{ items, unresolvedIds }`; returned items are the original objects/IDs in a new array. Use an original-index tie breaker and never mutate descriptions/periods. For unsupported or reversed dates, use the specified unresolved behavior. Export through package.json only if an existing public domain subpath cannot own it.

   **Gate:** New `src/section-sort.test.ts` fails before implementation and passes after. Assert stable ties, unknown handling, locale parsing, input immutability, identical item ID multiset, comparator transitivity across mixed precision, deterministic repeated invocation, empty/one-item input, and ongoing cases. `rtk proxy pnpm --filter @reactive-resume/resume exec vitest run src/section-sort.test.ts src/ats/period.test.ts` passes.

4. **Add the selected action through existing menus.** Apply one draft mutation replacing only the selected section's items. Undo must restore exact original order; autosave/reload must keep the chosen order; later field editing must not resort when one-shot behavior was selected. If unresolved IDs are reported, show a concise notice naming only unresolved entries in the current section without exposing unrelated personal data. Respect locked state; this increment targets built-in Experience/Education, with no implicit role/custom-section sorting.

   **Gate:** Web menu tests cover action, undo, save/reload, later edit stability, unresolved notice, and disabled state. `rtk proxy pnpm --filter web typecheck` and boundaries pass.

## Done criteria and STOP conditions

- [ ] Selected one-shot policy and examples specify tie/unknown behavior; persistent autosort remains explicitly deferred.
- [ ] Every original item survives once with unchanged content and ID.
- [ ] Undo and later manual ordering remain usable under the selected interaction.
- [ ] Locale/free-form limitations are visible; unsupported text is not guessed into dates.

Stop if unknown dates would be silently dropped, or if parser changes for sorting would alter ATS checks without separate regression evidence.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
