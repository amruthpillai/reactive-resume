# Plan 22: Choose and implement an explicit skill keyword presentation mode

## Selected direction and authority

Per-section Inline/Bulleted list for built-in and custom Skills, inline by default, with PDF/DOCX parity. This is an agent-selected routine direction under the updated interview policy, not an explicit maintainer approval.

Implement the selected section-level mode; do not add per-item overrides.

## Status

- **Issues:** [#2785](https://github.com/amruthpillai/reactive-resume/issues/2785).
- **Planned at:** `7a98f6662`, 2026-09-05.
- **Priority / effort / risk:** P3 / M / medium because Skills is shared by all templates.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Confidence:** High for unconditional comma joining; the selected new mode is backward compatible with existing output.

## Current state and evidence

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume packages/pdf/src/templates/shared apps/web/src/routes/builder apps/web/src/dialogs/resume/sections/skill.tsx packages/docx/src/section-renderers.ts`.

- `packages/schema/src/resume/data.ts:261` stores `keywords: z.array(z.string()).catch([])` on each skill.
- `packages/pdf/src/templates/shared/sections.tsx:1216` renders `<Small semanticField="keywords">{item.keywords.join(", ")}</Small>` regardless of template.
- `SkillsSection` separately reads `skills.layout === "inline"`; its purpose is positioning the skill name and secondary fields, not choosing bullet versus comma presentation.
- `packages/docx/src/section-renderers.ts:268` joins keywords with commas too. `ResumeAccessibleText` also flattens keywords into text.
- `apps/web/src/routes/builder/$resumeId/-sidebar/left/shared/section-menu.test.tsx` and `left/sections/skills.test.tsx` provide menu and editor test patterns. Do not overload item level, proficiency, or the section's column count.

## Scope and dependencies

Add the selected field in the owning schema and matching menu/form, shared Skills renderer, semantic keywords binding, DOCX renderer, and focused tests. Coordinate plan 34's level ordering; one change must not place bullets after ratings accidentally. Interest keywords remain out of scope unless explicitly approved. Preserve default comma output for older JSON.

## Ordered work and verification

### 1. Characterize current modes

Create a Leafish fixture with one skill, keywords `Alpha`, `Beta`, `Gamma`, nonempty proficiency, and level 3. Render stacked and existing inline layouts with one and two columns. Record PDF text and raster output. Assert each keyword is present once and comma rendering is current behavior.

**Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/sections.test.ts src/templates/shared/skill-level-alignment.test.tsx` passes. Store the fixture generator next to a new keyword-presentation test, not in a temporary directory.

### 2. Add a backward-compatible section mode

Add `keywordLayout: z.enum(["inline", "list"]).catch("inline")` to the Skills section schema and custom Skills schema path. Use a section-menu select labeled Inline/Bulleted list. `list` means one standard bullet per keyword; it is not the existing `layout` field. Do not add per-item overrides. Include default/sample data and JSON schema serialization in the change.

**Gate:** A schema parsing test shows old JSON produces the default mode and explicit selected modes survive export/import; invalid values fall back to inline consistently with the existing presentation enum policy.

### 3. Implement output without corrupting keyword data

Keep keywords as a string array. Branch in the shared Skills renderer: inline uses the existing single semantic keywords field; list maps strings to separate rows with the standard bullet marker. Preserve semantic identity and any existing color/typography rules. Do not concatenate `<li>` into a plain string or change stored keywords. Use the current section/item layout rules for columns and width. Add the selected UI control through the draft update hook and Lingui.

**Gate:** New `src/templates/shared/skill-keyword-presentation.test.tsx` assertions fail before the change and pass after: all modes, zero/one/many keywords, wrapping long keywords, Unicode, two columns, hidden items, custom Skills, and no repeated markers after pagination. Run `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/skill-keyword-presentation.test.tsx src/templates/shared/skill-level-alignment.test.tsx`.

### 4. Define export parity and verify interaction

Apply the selected mode to DOCX using real paragraph/bullet constructs. Extend the existing accessible mirror rather than duplicating it. Web tests exercise selection, undo, save/reload, and locked state. A real Leafish PDF must show three list entries with expected markers and no commas, while default mode remains visually unchanged.

**Gate:** `rtk proxy pnpm --filter @reactive-resume/schema test`, `rtk proxy pnpm --filter @reactive-resume/docx test`, and affected web/PDF typechecks pass.

## Done criteria

- [ ] Section mode, Inline/Bulleted list choices, and PDF/DOCX parity match the selected direction.
- [ ] Existing inline item layout and comma default remain compatible.
- [ ] Leafish list fixture renders each keyword once with correct wrapping.
- [ ] Undo, persistence, custom-section behavior, and level alignment regressions pass.

## Issue-specific STOP conditions

Stop if supporting list mode requires changing global rich text, or if template-specific markers require changing unrelated list rendering. No per-item precedence exists in this plan. Do not call the existing inline layout a solution to bullet formatting.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
