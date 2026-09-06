# Plan 21 implementation evidence

## Revision and scope

- Worktree: `issue-3060-section-heading-visibility`
- Base: current `origin/main` at dispatch, `2a4a1583b` (`fix(pdf): restore Gengar skill rating order (#3473)`)
- Product decisions applied: Q1 explicit Show heading toggle; Q2 Move-to continuations default visible; Q3 visual omission in preview/PDF/DOCX with accessible outline labels retained.
- No `.codegraph/` directory exists in this worktree, so CodeGraph was skipped after the required presence check.
- Intent discovery ran before edits; no matching local skill was available for this schema/PDF/DOCX/web change.

## Implementation

- Added backward-compatible `showHeading` section data for summary, built-ins, and custom sections. `parseResumeData` normalizes absent legacy values to `true`; explicit `false` survives round trips.
- Added heading toggles to built-in/summary and custom section menus. Toggle mutations use `useUpdateResumeData`, preserving undo/autosave/save/reload behavior; legacy absent values are treated as visible. Existing lock fieldset remains authoritative.
- Move-to-created custom sections explicitly set `showHeading: true`, independent of source heading state or copied title.
- `SectionShell` omits complete heading/icon/decoration output when disabled in both icon and no-icon branches. Empty titles still resolve localized defaults.
- DOCX section renderers omit visible heading paragraphs for summary, built-in, and custom sections while retaining content. Screen-reader mirror continues to expose section labels regardless of visual setting.
- Added characterization for Semantic CSS `section[id="..."] section-heading { display: none; }`; body remains while heading is omitted.
- Updated default/sample fixtures, generated schema references, recovery hashes, and compatibility tests; existing Gengar renderer/order changes remain untouched.

## Verification

- `pnpm --filter @reactive-resume/schema test`: 9 files, 132 tests passed.
- `pnpm --filter @reactive-resume/pdf test`: 81 files, 1059 tests passed.
- `pnpm --filter @reactive-resume/docx test`: 9 files, 76 tests passed.
- `pnpm --filter web test`: 135 files, 942 tests passed.
- `pnpm test`: full Turborepo suite passed (19 successful tasks; 10 cache hits).
- Affected typechecks passed: schema, PDF, DOCX, web.
- Focused menu, Move-to, accessible-outline, schema, PDF semantic, and DOCX renderer tests passed.
- `pnpm exec turbo boundaries`: passed (1108 files, 20 packages).
- Read-only `pnpm exec biome check` on 22 changed source/test files: passed; no write-capable `pnpm check` run.
- `git diff --check`: passed.
- Final diff review completed; local commit follows.
