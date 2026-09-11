# Plan 20: Distinguish hidden sections from sections missing from the layout

> Follow the verification gates in order. This is a plan for a later executor, not a claim that all three reports have the same cause. Stop when the source or reproduction contradicts the stated assumptions. Use the repository's execution and review skills when available.

## Status and scope

- **Issues:** [#3378](https://github.com/amruthpillai/reactive-resume/issues/3378), [#3265](https://github.com/amruthpillai/reactive-resume/issues/3265), [#2921](https://github.com/amruthpillai/reactive-resume/issues/2921).
- **Planned against:** `7a98f6662`, 2026-09-05.
- **Priority / effort / risk:** P2 / M / medium. A mistaken restore operation can duplicate section IDs or change output visibility.
- **Readiness:** #2921 describes a verified missing UI distinction. The historical removal paths in #3378 and #3265 remain unverified. Do not claim those reports fixed merely because a deliberately unplaced fixture becomes recoverable.
- **Goal:** Keep hidden sections discoverable without full editor panels occupying the normal sidebar; let a user explicitly place an existing, unplaced section without recreating its content.
- **Architecture:** Derive placement and hidden state from existing resume data. Reuse `useUpdateResumeData` for mutations so autosave and undo remain intact. No new persisted visibility flag and no automatic repair of imported layouts.
- **Stack:** React 19, Zustand/Immer builder drafts, TanStack Query, Base UI primitives, Zod resume schemas, Vitest, Playwright.

## Issue-specific evidence

| Issue | Requested behavior | Verified facts and limits | Required final evidence |
| --- | --- | --- | --- |
| #3378 | Re-add an existing section after removal in Layout without Undo. | Current Layout has no section-delete action; deleting a page moves its IDs to another page. Show toggles visibility but does not recreate a missing layout reference. Reporter has not supplied version or affected JSON. | Reproduce the reported action or inspect its JSON; prove IDs/content survive and explicit placement restores output without duplicates. |
| #3265 | Missing drag targets in Leafish Layout. | Layout intentionally excludes hidden sections and sections without a visible item with a primary title. A screenshot alone does not distinguish those states from missing IDs. | Match affected section IDs and content to the screenshot, then test the exact visibility/placement cause. |
| #2921 | Separate hidden sections in the left sidebar and distinguish them in Layout. | Left sidebar still mounts every section editor; Layout already filters hidden items. The existing hidden flag controls resume output, not just editor visibility. | A hidden built-in, summary, and custom section each appears in a compact recovery area, stays absent from output, and returns to its original position on Show. |

The owner previously accepted investigating the combined hidden-section UX in #2921. There is no authorization to reinterpret `hidden` as a builder-only preference.

## Current state and source anchors

Paths are repository-relative. Run this drift check before changing code:

```sh
rtk proxy git diff --stat 7a98f6662..HEAD -- packages/resume apps/web/src/features/resume/builder apps/web/src/routes/builder apps/web/src/libs/resume
```

Inspect changed source before using this plan; stop if section identity, ownership, or layout semantics have changed.

1. `apps/web/src/routes/builder/$resumeId/-sidebar/left/index.tsx`, `BuilderSidebarLeft`, around lines 78–84, renders all entries:

   ```tsx
   {leftSidebarSections.map((section) => (
     <Fragment key={section}>
       {getSectionComponent(section)}
       <Separator />
     </Fragment>
   ))}
   ```

2. `apps/web/src/routes/builder/$resumeId/-sidebar/right/sections/layout/pages.tsx`, around lines 250–260, passes filtered arrays to `PageContainer`:

   ```tsx
   main: filterVisibleLayoutSectionIds(page.main, resume.data),
   sidebar: filterVisibleLayoutSectionIds(page.sidebar, resume.data),
   ```

3. Its `visibility.ts` checks summary content and item primary titles. `hasVisibleItems` returns `!section.hidden && section.items.some((item) => !item.hidden && hasValidPrimaryTitle(item, sectionType))`. This explains why an empty section may be absent without being lost. Do not use this content filter to decide whether a section exists.
4. `left/shared/section-menu.tsx`, `onToggleVisibility`, changes only `summary.hidden` or `sections[type].hidden`. Reset removes content after confirmation. Preserve that distinction.
5. `left/sections/custom.tsx` owns custom-section editor cards and their menu. Custom IDs come from `data.customSections`; the left sidebar's `custom` entry is an editor container, not a printable section ID.
6. `apps/web/src/features/resume/builder/draft.ts` owns `useUpdateResumeData`, undo/redo, and save scheduling. Call its public hook; do not mutate a fetched Query cache or add an independent save request.

## Files and boundaries

- Add pure derivation tests and helpers at `packages/resume/src/section-availability.ts` and `.test.ts`, with an explicit `./section-availability` export in `packages/resume/package.json` if no equivalent helper exists at execution time.
- Add the workflow component and DOM tests under `apps/web/src/features/resume/builder/section-recovery.tsx` and `.test.tsx`.
- Modify the left sidebar, its custom-section renderer, and Layout page composition only where needed to expose the recovery UI and route existing sidebar navigation to it.
- Extend `tests/e2e/specs/section-editing.spec.ts`, or add a focused `section-recovery.spec.ts` using the same authenticated fixture from `tests/e2e/fixtures/test.ts`.
- Update relevant Lingui catalogs through existing extraction/translation workflow for new labels.
- Do not alter PDF filtering, importer migrations, title defaults, section deletion/reset semantics, or the saved schema. Do not create missing custom section records from unknown layout IDs.

## Ordered work and verification

### 1. Characterize visibility and placement independently

- [ ] Clone `sampleResumeData` in a test. Construct cases with: visible placed section; hidden placed section; visible unplaced section; hidden unplaced section; empty placed section; custom section; unknown layout ID; and an existing ID on a later page's sidebar.
- [ ] Preserve all original item IDs and text in these fixtures. To model an unplaced section, remove its ID from every `metadata.layout.pages[*].main/sidebar` array without changing its section record.
- [ ] Define a proposed pure API with these concepts: `getSectionAvailability(data)` returns known printable section IDs, their hidden state, and zero or more `{ pageIndex, columnId }` locations. A separate placement operation validates the target and appends only when the ID is currently unplaced. Unknown IDs and invalid targets produce an explicit failure and leave input unchanged. Repeated placement must be a no-op, not a duplicate.
- [ ] Assert that "hidden" and "unplaced" can both be true; never use one boolean for both conditions. Assert the derivation does not mutate input.

Run `rtk proxy pnpm --filter @reactive-resume/resume exec vitest run src/section-availability.test.ts`. New assertions must fail before the helper exists and pass after implementing it. Use existing `packages/resume/src/export-sections.test.ts` as the data-driven Vitest style exemplar, not as evidence of placement correctness.

Use this proposed helper contract so the later UI does not invent a second definition of placement:

```ts
type SectionLocation = { pageIndex: number; columnId: "main" | "sidebar" };
type SectionAvailability = {
  sectionId: string;
  hidden: boolean;
  locations: SectionLocation[];
};
// Include summary, every built-in section, and each real custom section.
// Exclude picture, basics, and the UI-only "custom" container.
function getSectionAvailability(data: ResumeData): SectionAvailability[];
```

The declaration is a proposed interface, not an existing export. Derive locations from the saved arrays, never the filtered Layout UI arrays. Keep localized titles in the web component rather than introducing Lingui into the pure helper. A concrete regression assertion is:

```ts
const data = structuredClone(sampleResumeData);
data.sections.experience.hidden = true;
for (const page of data.metadata.layout.pages) {
  page.main = page.main.filter((id) => id !== "experience");
  page.sidebar = page.sidebar.filter((id) => id !== "experience");
}
const before = structuredClone(data);
expect(getSectionAvailability(data).find((entry) => entry.sectionId === "experience"))
  .toEqual({ sectionId: "experience", hidden: true, locations: [] });
expect(data).toEqual(before);
```

Wrap this assertion in a Vitest test, importing the sample from `@reactive-resume/schema/resume/sample`. Add a second test that places the same section on an existing later page and expects that exact location even while hidden. These assertions distinguish content availability from presentation filtering.

### 2. Implement compact hidden-section recovery

- [ ] Keep Picture and Basics in the normal editor flow. Filter only printable, hidden sections out of full-size panels; do not suppress the entire custom-section container because one child is hidden.
- [ ] Render a compact, named Hidden sections area listing each hidden section by its effective localized title. Reuse Button/Collapsible primitives and named props types. A Show action changes only the existing `hidden` flag through `useUpdateResumeData`.
- [ ] Keep hidden section IDs at their existing layout locations. A Show action on a hidden-but-unplaced section must not silently choose a new page; expose its placement action separately.
- [ ] Update sidebar edge navigation: clicking a hidden section's icon must focus/open its recovery entry, not scroll to a nonexistent full editor. Keep locked resumes disabled through the existing fieldset.
- [ ] DOM tests must verify built-in, summary, and custom cases; keyboard-accessible names; no full hidden editor mounted; Show retains items and order; Undo restores the prior hidden state; and locked controls do not write.

Run `rtk proxy pnpm --filter web exec vitest run src/features/resume/builder/section-recovery.test.tsx`. Assert user-visible behavior and emitted data, not source-string presence. Use `left/shared/section-menu.test.tsx` as the existing provider/menu test pattern.

### 3. Expose explicit placement for existing unplaced sections

- [ ] In Layout, display known section records missing from all authored pages in a clearly named Unplaced sections area. Do not remove the current filtering of empty/hidden entries from normal drag targets.
- [ ] Reuse the existing Move section menu's page/column choices to select a target. The operation must insert the existing ID once; it must not clone a section, unhide it, clear content, or reorder other IDs.
- [ ] Keep empty unplaced sections editable/recoverable even though they will not appear in PDF until they contain printable content. Explain their empty state without calling it a rendering failure.
- [ ] Test a deleted-page operation separately: it must still move IDs to a surviving page and must not create spurious unplaced entries.

Run the new helper and DOM tests, plus the existing Layout visibility tests:

```sh
rtk proxy pnpm --filter web exec vitest run 'src/routes/builder/$resumeId/-sidebar/right/sections/layout/visibility.test.ts'
rtk proxy pnpm --filter web typecheck
rtk proxy pnpm --filter @reactive-resume/resume typecheck
rtk proxy pnpm exec turbo boundaries
```

Each command must exit 0. If implementing this step requires changing import behavior or persisted schema, stop and revise the plan with the maintainer first.

### 4. Validate persistence and issue coverage

- [ ] Use a disposable test account and resume. Hide built-in/summary/custom sections, save, reload, and verify compact entries and unchanged layout references. Show each and confirm the same output placement returns.
- [ ] Import the controlled unplaced fixture, choose a target, save/reload, export JSON, and assert exact section content plus exactly one reference in the selected column. Undo/redo must restore/reapply placement once.
- [ ] Export PDF before/after Show and placement. Verify the targeted text is absent/present as expected while unrelated text and authored page assignments remain unchanged.
- [ ] Repeat the affected Leafish case for #3265 when its source JSON becomes available. The controlled fixture alone is not a historical reproduction.

Run production E2E with a dedicated database and repository environment setup:

```sh
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.local -- pnpm exec playwright test tests/e2e/specs/section-recovery.spec.ts --reporter=list
```

The test fixture owns its disposable account/data. Never point this command at a production database. Run `pnpm check` only after acknowledging that it writes files, and inspect the resulting diff before committing.

## Completion, dependencies, and stop conditions

- [ ] #2921: hidden UI distinction verified for all three section kinds with restore, lock, keyboard, persistence, and output tests.
- [ ] #3378/#3265: record separately whether the original action/data now reproduces and is resolved, or whether only a defensive recovery path was added. Use related-issue links rather than auto-closing an unmatched historical report.
- [ ] No duplicate layout IDs, data loss, new visibility setting, automatic imported-layout rewrite, or package-boundary violation.
- [ ] Plan 21 (heading visibility) remains separate: hiding a heading is not hiding a section. Plan 23 must preserve the same authored-page identity when adding pagination controls.

Stop if the source section record is actually gone; layout placement cannot recover deleted content. Stop if the requested UX requires treating hidden sections as visible output. Stop if an external update changes page/section identity during implementation. Preserve those findings for the maintainer instead of inventing a migration.
