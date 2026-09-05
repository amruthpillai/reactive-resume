# Cover Letter Library Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task by task. Backend ownership belongs to audit_builder; apps/web ownership belongs to root. Leave changes uncommitted for root review.

**Goal:** Persist cover letters independently, edit the same document from the library and builder, and export immutable application attachments.

**Architecture:** A user-owned cover_letter row stores rich text plus copied resume styling and sender information. Source resume/application links supply context, never synchronized content. Existing embedded letters remain independent and support explicit copying into the library.

**Tech Stack:** TypeScript, Zod, Drizzle/PostgreSQL, oRPC, React PDF, TanStack Query.

**Spec:** The contract and lifecycle below implement approved issue #3255 hybrid behavior.

## Global Constraints

- Base: origin/main e549d114ea020380b156197f6460faddbe3022fd; branch codex/issue-3255-cover-letter-library.
- No commits, pushes, merges or application attachment implementation in this worker.
- All shell commands use rtk. Source package boundaries follow AGENTS.md.
- Styling is copied at creation and on explicit refresh. Source deletion sets provenance IDs to null; saved appearance and content survive.
- Resume embedded cover-letter sections and their existing JSON imports remain untouched.
- Rich HTML must not introduce executable markup. Generated plain text is HTML-escaped before paragraph composition.

## Shared contract

```ts
type CoverLetterStyle = {
  basics: ResumeData["basics"];
  picture: ResumeData["picture"];
  metadata: Omit<ResumeData["metadata"], "notes" | "layout">;
  sectionId: string;
  itemId: string;
};
type CoverLetter = {
  id: string; name: string; recipient: string; content: string;
  style: CoverLetterStyle;
  sourceResumeId: string | null; sourceApplicationId: string | null;
  revision: number; createdAt: Date; updatedAt: Date;
};
type CoverLetterDocument = {
  format: "reactive-resume-cover-letter"; version: 1;
  name: string; recipient: string; content: string; style: CoverLetterStyle;
};
```

Exported types/schema: `@reactive-resume/schema/cover-letter/data`.
Pure helpers: `@reactive-resume/resume/cover-letter` exposes `createCoverLetterResumeData(letter: Pick<CoverLetter, "name" | "recipient" | "content" | "style">): ResumeData`, `copyCoverLetterStyle(data: ResumeData, sectionId?: string, itemId?: string): CoverLetterStyle`, and `coverLetterTextToHtml(text: string): string`.

oRPC namespace `coverLetters`:

| Procedure | Input | Output |
| --- | --- | --- |
| list | `{ search?, resumeId?, applicationId?, limit?: number, offset?: number }` | `{ items: CoverLetter[], total: number }` |
| getById | `{ id }` | `CoverLetter` |
| create | `{ name, recipient?, content?, resumeId?, applicationId? }` | `CoverLetter` |
| update | `{ id, expectedRevision, name?, recipient?, content? }` | `CoverLetter` |
| refreshStyle | `{ id, expectedRevision, resumeId }` | `CoverLetter` |
| duplicate | `{ id, name? }` | `CoverLetter` |
| delete | `{ id, expectedRevision }` | `void` |
| copyEmbedded | `{ resumeId, sectionId, itemId, name? }` | `CoverLetter` |
| export | `{ id }` | `CoverLetterDocument` |
| import | `{ document: CoverLetterDocument }` | `CoverLetter` |

List defaults limit=20, offset=0; limit max100; literal case-insensitive name search. Stable ordering updatedAt descending, id descending. IDs and dates are server-owned. Every read/write enforces user ownership; inaccessible contexts return NOT_FOUND. Atomic revision predicates return CONFLICT for stale same-user mutations, NOT_FOUND for absent/foreign documents. Import always creates a new owned ID and clears provenance.

AI `applications.ai.draftMessage` retains `{ text }` and adds optional `coverLetterId`; cover-letter generation persists before returning. Follow-up generation stays transient. Client opens saved document by ID rather than making another copy.

## Lifecycle and UI integration

Library and builder select the same row. Editor uses RichInput and explicit Save with revision; CONFLICT offers reload without discarding current edits automatically. Name/content views render text or existing trusted rich-editor/PDF pathways, never raw HTML insertion. Empty document creation uses default resume styling; chosen resume copies basics/picture and metadata except private notes and resume layout. Composer includes only one full-width cover-letter section with empty standard sections and notes.

Refresh explicitly replaces copied styling/sender only, preserves letter text/name and identity. Embedded copy preserves original section/item IDs so existing targeted style rules continue to apply. Original embedded letter remains unchanged and independently editable. Account export includes coverLetters; standalone versioned JSON has content and styling needed to render without original context IDs. Images remain URL references, not embedded bytes. Resume deletion removes screenshots/PDFs only and keeps picture assets; deleting the entire account removes its owned assets and documents.

PDF uses `createResumePdfBlob(createCoverLetterResumeData(letter))`. Application action uploads the resulting File via existing `applications.attachDocument({id,kind:"cover-letter",file})`. Later edits/deletion of source letters never mutate uploaded attachment snapshots. PR #3395's escaping and composition move into pure domain helper; its attachment endpoint is reused.

## Task 1: Schema and pure composition

Files: packages/schema/src/cover-letter/data.ts; packages/resume/src/cover-letter.ts; their tests and package export maps.

- [ ] Add failing tests for snapshot isolation and preserved sender/target IDs; escaped `<script>` plain text; absence of resume sections/notes in composed data; round-trip document shape.
- [ ] Run `rtk proxy pnpm --filter @reactive-resume/resume exec vitest run src/cover-letter.test.ts` and capture RED.
- [ ] Implement exported contract and pure helpers; verify `expect(result.basics).toEqual(source.basics)` and `expect(result.metadata.notes).toBe("")`.
- [ ] Run schema/domain tests and typechecks to GREEN.

## Task 2: Owned persistence and contracts

Files: packages/db/src/schema/cover-letter.ts, schema/index.ts, generated migrations; packages/api/src/dto/cover-letter.ts; features/cover-letters/{service,router,html}.ts; routers/index.ts.

- [ ] Add failing service/procedure tests for account isolation, literal search and paging, stale update/delete/refresh conflicts, duplication, refreshed style preserving content, foreign context rejection and JSON import clearing context.
- [ ] Run `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/cover-letters` and capture RED.
- [ ] Implement explicit user predicates on all queries and atomic `{userId,id,revision}` update/delete conditions with revision increment.
- [ ] Add allowlisted rich-HTML sanitization at every persistence boundary, covering script/event/style/unsafe URL removal and rich-text formatting retention.
- [ ] Generate additive table migration with cascade owner and SET NULL source FKs; verify disposable DB preserves snapshots after source deletion.
- [ ] Run API tests and DB/schema/API typechecks; distinguish known email baseline errors.

## Task 3: Generation and backup integration

Files: packages/api/src/features/applications/ai.ts and tests; packages/api/src/features/auth/service.ts and tests.

- [ ] Test generation stores escaped content before response, persistence failure rejects operation, follow-up does not create a letter, and owner backup includes independent documents.
- [ ] Persist generated letter with linked application/resume context and return `coverLetterId` beside original text.
- [ ] Include owned cover-letter data in account backup without introducing restore assumptions for resume imports.
- [ ] Run focused and package tests; review root UI integration against fixed contract.

## Task 4: Verification and handoff

- [ ] Run scoped Biome, package typechecks, boundary check, generated migration no-changes check and meaningful regression suites.
- [ ] Send root exact changed files, RED/GREEN evidence, migration order and any unresolved limitations. Root performs final review and publishing.
