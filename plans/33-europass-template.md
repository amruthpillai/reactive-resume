# Plan 33: Approve an official Europass reference and data mapping before template code

## Selected direction and authority

Agent judgment: research a current official Europass reference, map existing data, and produce a reviewable template proposal. Do not implement until the user approves the concrete visual artifacts/reference. No DIN, mandatory-country, or universal legal-compliance claims.

Research and fixture mapping can proceed now. Visual approval remains a material future decision because the exact design is not yet available to review.

## Status and decision gate

- **Issue:** [#2689](https://github.com/amruthpillai/reactive-resume/issues/2689).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3, effort L, risk medium/high for unsupported standards claims and a new template surface.
- **Readiness:** Research/data mapping and visual proposal are selected by agent judgment and ready for later execution. Stop before template code for review of the actual proposed visual artifacts; their layout does not yet exist to approve.
- **Evidence:** The issue asks for a built-in Europass option and makes claims about German requirements/DIN 5008. Those claims are unverified and must not be repeated as facts. A third-party XML-to-v5 converter comment is not an official template specification or import contract.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/templates.ts packages/pdf/src/templates/index.ts packages/pdf/src/semantic apps/web/src/dialogs/resume/template apps/web/public/templates`.

- `packages/schema/src/templates.ts` lists 15 template IDs; Europass is absent.
- `packages/pdf/src/templates/index.ts` maps template IDs to renderer implementations. Each current template has a page component and semantic manifest, for example `onyx/OnyxPage.tsx` and `onyx/semantic.ts`.
- New templates require coordinated schema registration, PDF renderer mapping, semantic manifest/binding coverage, template gallery metadata, and public JPG/PDF previews. The repository AGENTS.md explicitly names these owners.
- Existing resume data has Experience, Education, Languages, Skills, custom sections, and free-form periods. It is not an implementation of the Europass XML schema.

## Scope and dependencies

Initial deliverable is a cited design/specification and synthetic reference fixture. Conditional implementation would add a new template directory, registration/manifest, gallery data/tests, and generated previews. Do not alter existing template defaults, create XML import/export, claim DIN/legal compliance, or infer required personal fields. Coordinate plan 24 if a date column is desired and plan 31 for accessibility; both remain separately gated.

## Steps and gates

1. **Acquire authoritative references.** At execution time, browse official Europass sources for the current CV format, permitted branding/template reuse, export examples, and documented optional fields. Record source URLs, access date, and which statements are visual guidance versus formal requirements. Use a public official reference PDF or recreate a nonprivate example from official guidance; include it in the later visual review rather than asking the user to choose a reference before research. Do not use the issue's legal claims as requirements.

   **Gate:** A repository design note contains primary-source citations and an explicit unresolved-claims section. If no stable official layout or reuse terms can be established, stop and ask for the intended reference.

2. **Map data before drawing the template.** Produce a table mapping each proposed visual field/section to existing ResumeData, including date strings, languages/proficiency, skills, personal details, custom sections, hidden items, and empty fields. Mark unsupported fields rather than adding schema fields by assumption. Specify multi-page flow, optional photo, localization, RTL, and long text behavior.

   **Gate:** Every displayed field has a source or is marked as a proposed omission for visual review; the synthetic fixture covers all agreed sections. No required field silently has a placeholder.

3. **Produce reviewable visual artifacts and stop.** Generate a static mock/reference comparison with one-page and overflowing content, then have the user approve it. Record exact template naming, whether official branding is permitted, and deviations from the source. A design approval is required before renderer implementation.

   **Gate:** Approved artifacts are repository-addressable or linked from the design note; the decision is recorded. Do not replace missing approval with a guess based on an existing template.

4. **Implement the approved template through existing contracts.** Only after approval, add the page component and semantic manifest, register the ID in schema/PDF/gallery, and generate previews from repository synthetic data. Reuse shared filtering, section primitives, font registration, and page metrics. If a required layout cannot be represented without broad shared changes, stop and isolate that design before proceeding.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/schema test`, `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/semantic/template-manifest.test.ts src/semantic/binding-inventory.test.ts src/semantic/all-templates-presentation.test.ts`, and `rtk proxy pnpm --filter web exec vitest run src/dialogs/resume/template/data.test.ts src/dialogs/resume/template/gallery.test.tsx` pass. Extend tests so the new ID is actually exercised, not merely accepted by an enum.

5. **Validate data fidelity and pagination.** Export one-page and overflow PDFs; assert every visible fixture token appears once, hidden content is absent, long date/heading columns do not overlap, and localized glyphs remain visible. Generate deterministic JPG/PDF previews using the approved synthetic fixture and verify gallery selection/save/reload.

   **Gate:** PDF raster/text assertions, schema/PDF/web typechecks, build, and boundaries pass. A visual comparison against the approved reference is reviewed explicitly.

## Done criteria and STOP conditions

- [ ] Official references, naming/reuse terms, and approved deviations are documented.
- [ ] Design and field mapping are approved before code.
- [ ] New template participates in semantic, gallery, preview, pagination, and data-fidelity tests.
- [ ] No XML support, mandatory-country claim, or legal-compliance promise is implied.

Stop for unclear reference/reuse terms, missing visual approval, required data absent from the current model, or a request for verified legal compliance. That requires a separate evidence-backed scope, not a template label.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
