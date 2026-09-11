# Plan 25: Add Experience logos through the existing image ownership contract

## Selected direction and authority

Agent judgment: uploaded images on Experience entries only, reusing existing authenticated image storage; preserve aspect ratio in a bounded logo slot, reserve no space when absent, and treat the logo as decorative alongside company text. Support builder/public PDF first; DOCX parity must be implemented using its existing image adapter if available, or recorded as an explicit follow-up limitation. No arbitrary URL input or employer lookup.

Use the existing uploader limits and ownership rules. The storage inventory is a technical prerequisite, not a request for another routine UI decision.

## Status

- **Issue:** [#3379](https://github.com/amruthpillai/reactive-resume/issues/3379).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P3; effort L; risk medium/high because storage, export, and schema are involved.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Confidence:** High that no first-class Experience logo field exists. No decision to support arbitrary remote URLs or employer logo discovery has been made.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/schema/src/resume/data.ts apps/web/src/dialogs/resume/sections/experience.tsx packages/pdf/src/templates/shared packages/api/src/features/storage packages/docx`.

- `packages/schema/src/resume/data.ts:162`, `experienceItemSchema`, has company, position, location, period, website, description, and roles. A company logo field is absent.
- `apps/web/src/dialogs/resume/sections/experience.tsx:116` renders the Company input and its existing role progression form. New logo controls belong to this entry workflow, not global Picture settings.
- `packages/pdf/src/templates/shared/sections.tsx` renders Experience through shared entry/header primitives. A first-class logo needs an actual layout slot so descriptions, dates, and multi-role entries align correctly.
- Existing resume Picture image handling is not proof that per-entry uploads have equivalent ownership/deletion rules. Before design, inspect the actual image upload API and storage helpers through CodeGraph when indexed; exact API reuse is unresolved and must not be guessed.

## Scope and dependencies

Scope includes the storage contract inventory, generated fixtures, and the selected feature. Code owners are Experience schema/form, shared Experience PDF rendering, existing storage API, and existing export adapters. A reusable image API must remain in the current storage owner; do not add a second uploader. No employer lookup service, automatic third-party scraping, Education logos, or avatar migration. Coordinate plan 31 for decorative versus informative alternative text and plan 30 for ATS expectations.

## Steps and verification

1. **Inventory existing image ownership.** Locate the current Picture upload mutation, accepted file types/size limits, object key ownership check, deletion lifecycle, public resume image access, and server PDF image resolution. Record exact paths/symbols in this plan before coding. Follow their tests and prove whether one user can reference another user's object. Do not make live requests with private assets.

   **Gate:** `rtk proxy rg -n "upload|storage|picture" apps/web/src/dialogs/resume/sections/experience.tsx packages/api/src/features` is only a discovery fallback in a nonindexed worktree; the recorded owner/test paths must exist. Run their focused existing tests and record exit 0. If the storage contract cannot safely support entry assets, stop with a narrow API proposal.

2. **Specify the existing storage contract.** Use uploads for Experience only, current uploader file/size limits, aspect-preserving contain fit in a 32pt square maximum slot, and no reserved space for absent/broken logos. Company text supplies the accessible name; decorative logos get no redundant announcement. Document actual storage key ownership and reference lifetime. Retain uploaded objects while draft undo/copies can reference them; use the existing orphan-cleanup policy rather than eager deletion. Inspect DOCX image support and implement parity through it, or record its exact technical blocker as a follow-up.

   **Gate:** Every contract field is explicit. No guessed storage URL field or arbitrary remote fetch is introduced.

3. **Implement schema and upload lifecycle.** Add an optional/backward-compatible logo reference according to the verified existing storage contract, and migration/round-trip tests showing old resumes render unchanged. Reuse authenticated upload and error feedback in the Experience dialog. Persist through its existing submit path. Test failed upload, replacement, item deletion, undo, save/reload, and a copied item. Do not delete a referenced object before undo/other references are accounted for.

   **Gate:** Schema and actual storage-owner tests pass; a cross-user reference is rejected, and upload failure leaves the previous logo and other entry fields intact. Stop if the chosen deletion model cannot support undo without data loss.

4. **Render and validate.** Add `packages/pdf/src/templates/shared/experience-logo.test.tsx` using generated local image bytes (square, wide, tall, transparent) and a multi-role entry. Assert company/period/description tokens occur once, logo uses aspect-preserving fit and width, absent/broken image behavior is deterministic, and pagination retains all text. Test narrow sidebar and full-width placement across the supported template set. Use DOCX’s existing image support for parity; if unavailable, record the bounded follow-up and do not claim DOCX logo support.

   **Gate:** `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/templates/shared/experience-logo.test.tsx`, schema/API/web typechecks, and boundaries pass. A browser test uploads a generated image, reloads, and downloads the specified outputs from a disposable account.

## Done criteria and STOP conditions

- [ ] Source/ownership/output contract matches the selected direction and documents actual API paths.
- [ ] Old JSON remains compatible; image failure never blocks editing or loses the previous image.
- [ ] Logo fit, role progression, narrow layout, public access, and authorization tests pass.
- [ ] No external employer lookup, unrelated image refactor, or unsupported ATS claim is introduced.

Stop for uncertain storage ownership/deletion, unsafe remote fetching, or a rendering/storage change that requires a new asset system. Do not turn this feature request into a broad asset system redesign.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
