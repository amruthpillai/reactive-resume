# Plan 19 implementation report

## Dependency and live state

- Implemented on exact reviewed Plan 16 head `b170290e96b411bce46873b64b345e7d5b8e2fa1` on branch `codex/issue-3397-literal-whitespace`.
- Approved Plan 19 was read with `git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/19-literal-rich-text-whitespace.md` because the planning checkout did not match the pinned planning commit.
- Root Intent inventory was run before edits. No listed local skill matched the rich-text/PDF/DOCX concern, so no Intent skill was loaded.
- At final revalidation on 2026-09-06, issue #3397 remained open and no open PR matched `3397`. Plan 16 PR #3464 was merged as `999cd618cb2e54826aa860c298c7114045f8ebdd` while this work was in progress.
- Fetched `origin/main` is `695cdb851431a0fe7a17b05bbd9630129fdd0759`; merge-base with the stacked branch remains `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec`. This branch was intentionally not rebased because the execution brief requires the exact reviewed Plan 16 head.

## Implementation facts

- Editor persistence uses the approved `data-resume-whitespace="preserve"` marker on paragraphs and headings. Authored text replacement, paste, Enter, and block transformations mark affected nodes; mount, controlled prop updates, and unmarked legacy imports stay unmarked and do not emit saves.
- Marked editor nodes use scoped `white-space: pre-wrap`. Existing unsupported-table read-only behavior and Plan 16 supported table-cell grammar remain intact.
- HTML and plain-text clipboard input preserve exact leading, interior, and trailing spaces plus tab codepoints. Marks, hard breaks, undo/redo, paragraph/heading/list transitions, RTL locales, Unicode spaces, and supported table cells are covered.
- PDF normalization expands tabs only inside marked paragraph/heading descendants. Each tab becomes four ordinary, breakable spaces; the `react-pdf-html` CJS and ESM patch disables collapse only for marked nodes, not globally.
- Marked list paragraphs remain node-local instead of being unwrapped, and marked RTL paragraphs bypass pseudo-bullet conversion so leading whitespace is not reinterpreted.
- DOCX conversion expands marked tabs to four ordinary spaces and relies on generated `xml:space="preserve"`; unmarked tabs retain legacy behavior.
- `@tiptap/extension-heading` and `@tiptap/extension-paragraph` are direct web dependencies because their nodes are now imported directly. Frozen install accepts the regenerated dependency patch hash.

## TDD evidence

- Baseline GREEN before edits: web indentation 24/24; PDF paragraph-indent and Unicode-space tests 38/38; DOCX paragraph-indent 16/16.
- RED: seven new editor whitespace cases failed while 71 existing focused cases remained green; PDF node-local normalization/geometry cases failed while 95 existing focused cases remained green; DOCX marked-tab cases failed while 29 existing cases remained green.
- GREEN focused: web rich-input whitespace/indent/table suites 83/83; PDF literal-whitespace/rich-text/indent/Unicode/filtering suites 118/118; DOCX literal-whitespace/indent suites 20/20.
- GREEN full suite after one retry: all 19 Turbo test tasks passed. First full run hit an unrelated API statistics timeout; its late mock call contaminated the next case. The affected API file then passed 3/3 alone, and the complete suite passed on rerun.

## Verification

- `pnpm install --frozen-lockfile`: passed.
- `pnpm --filter web run typecheck`, `pnpm --filter @reactive-resume/pdf run typecheck`, `pnpm --filter @reactive-resume/docx run typecheck`: passed.
- `pnpm exec turbo boundaries`: passed, 1,415 files in 20 packages, no issues.
- `pnpm build`: passed, including production web/server/plugin builds.
- Narrow non-writing Biome check over all changed source/config files: passed. Write-capable `pnpm check` was not run.
- `git diff --check`: passed.
- Dedicated PostgreSQL E2E on `localhost:43219`: passed 1/1. It verified typed tab and real plain-text paste, exact persisted HTML, reload text/style, exact JSON, PDF start/gap/tail geometry against a four-space reference, and DOCX XML. Disposable database `rr_plan19_d9237449` and `/tmp/reactive-resume-plan19-task-d9237449` were removed afterward.
- Direct rendered DOCX visual geometry was skipped because LibreOffice/Word was unavailable. No visual-width claim is made for DOCX; XML and logical four-space expansion are verified.

## Files and commit

- Editor/dependencies: `apps/web/package.json`, `apps/web/src/components/input/rich-input.tsx`, `apps/web/src/components/input/rich-input-whitespace.ts`, `apps/web/src/components/input/rich-input.indent.test.tsx`, `apps/web/src/components/input/rich-input.whitespace.test.tsx`.
- PDF: `packages/pdf/src/templates/shared/rich-text-html.ts`, `packages/pdf/src/templates/shared/rich-text-html.test.ts`, `packages/pdf/src/literal-whitespace.integration.test.tsx`, `patches/react-pdf-html@2.1.5.patch`.
- DOCX: `packages/docx/src/html-to-docx.ts`, `packages/docx/src/literal-whitespace.test.ts`.
- Cross-surface: `tests/e2e/specs/literal-whitespace.spec.ts`, `pnpm-lock.yaml`, this report.
- Local commit message: `fix(editor): preserve literal rich-text whitespace`.

## Risks and issue coverage

- Fact: repository tests prove exact persisted codepoints and browser/PDF/DOCX contracts for marked content while preserving legacy unmarked behavior.
- Remaining uncertainty: DOCX applications can render ordinary spaces differently by font and justification; no local Word-compatible renderer was available to measure visual width.
- Issue #3397 coverage now includes literal indentation without list semantics, tabs, RTL, inline marks, line breaks, tables, save/remount, JSON, PDF, and DOCX exports. Existing paragraph-indent controls, Unicode spaces, and imported-table support remain covered.
- PR: not created. Nothing was pushed, merged, or written to issue/ledger state.
