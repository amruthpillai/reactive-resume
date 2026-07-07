# Application Tracker REST and MCP Parity

## Status

Approved design for implementation planning. Campaign tracking is out of scope because the current app, database schema, changelog, guides, and tests do not ship a campaign field or campaign endpoint.

## Goal

Make every shipped Application Tracker capability available outside the web UI through:

- the public REST/OpenAPI surface under `/api/openapi`;
- Reactive Resume MCP tools for agent-only workflows;
- the bundled `resume-builder` skill, so agents know the application tracker tools exist.

The result should let a user track applications through an MCP client alone: create records, import existing rows, move stages, log notes, manage contacts and follow-ups, attach sent documents, run AI copilot actions, and inspect pipeline health.

## Current Shipped Capabilities

The current application tracker supports:

- application records with company, role, location, salary, source, source URL, job description, notes, tags, status, archive state, linked resume, sent resume PDF, cover-letter PDF, contacts, follow-up date/note, applied date, and activity timeline;
- fixed stages: `saved`, `applied`, `screening`, `interview`, `offer`, `rejected`;
- create, edit, archive/unarchive, mark rejected, move stage, delete;
- board, table, search, sort, tag filter, archived toggle, and command-palette open/create shortcuts;
- bulk table actions: move stage, add tag, archive, delete;
- CSV import with header mapping and a 500-row cap;
- insights from aggregate stage/source counts plus client-derived weekly application velocity;
- timeline notes and automatic created/stage activity entries;
- contacts embedded on each application;
- Application Copilot actions: job-posting autofill, resume match score, tailored resume copy, cover-letter draft, follow-up draft;
- PDF upload/remove for resume file and cover letter through the generic storage route.

## Existing API Coverage

The app already routes most behavior through `packages/api/src/features/applications`:

- `list`, `getById`, `create`, `import`, `update`, `addNote`, `delete`;
- `bulkUpdate`, `bulkDelete`, `stats`, `tags`;
- `ai.autofill`, `ai.matchScore`, `ai.draftMessage`, `ai.tailorResume`.

These procedures are already authenticated and user-scoped through `protectedProcedure` and `applicationService`. The implementation should reuse them instead of adding a parallel controller or new business layer.

## REST Design

Keep the existing application procedures and improve parity with the public OpenAPI surface.

### Public Application Endpoints

Existing endpoints remain:

- `GET /applications`
- `GET /applications/{id}`
- `POST /applications`
- `POST /applications/import`
- `PUT /applications/{id}`
- `POST /applications/{id}/notes`
- `DELETE /applications/{id}`
- `POST /applications/bulk-update`
- `POST /applications/bulk-delete`
- `GET /applications/stats`
- `GET /applications/tags`
- `POST /applications/ai/autofill`
- `POST /applications/{id}/ai/match-score`
- `POST /applications/{id}/ai/draft-message`
- `POST /applications/{id}/ai/tailor-resume`

Add public document endpoints under the Applications tag:

- `POST /applications/{id}/documents/{kind}` where `kind` is `resume` or `cover-letter`.
  - Accept a PDF file via OpenAPI file upload.
  - Store through the existing storage service.
  - Update only the matching application fields:
    - resume: `resumeFileUrl`, `resumeFileName`;
    - cover letter: `coverLetterUrl`, `coverLetterName`.
  - Return the updated application.
- `DELETE /applications/{id}/documents/{kind}`.
  - Delete the owned storage object best-effort.
  - Clear only the matching application fields.
  - Return the updated application.

This makes the document upload/remove UI available through public REST without exposing the generic storage route, which remains tagged `Internal` because it also serves profile-picture use cases.

### REST Behavior Details

- Use existing ownership checks: every application mutation must be scoped by `userId`.
- Reject non-PDF document uploads, matching the UI.
- Keep file size at the existing storage limit: 10MB.
- Preserve existing delete cleanup for uploaded documents when an application is deleted.
- Do not add server-side search/sort endpoints for board/table parity. The UI derives search and sort from `list`, and external clients can do the same. `list` already exposes status, tags, and archive filtering.
- Do not add campaign fields or endpoints.
- Regenerate or update `docs/spec.json` so the public API reference includes all application endpoints.

## MCP Design

Add application tools to `packages/mcp` using the existing metadata pattern:

- add names to `MCP_TOOL_NAME`;
- add schemas/descriptions to `TOOL_META`;
- add behavior hints to `TOOL_ANNOTATIONS`;
- register handlers in `registerTools`;
- let `buildMcpServerCard` derive tool entries from `TOOL_META`;
- add focused tests so tool registration, annotations, and server card stay synchronized.

All MCP handlers should call the injected in-process oRPC `RouterClient`. They should not import database code or reimplement ownership checks.

### MCP Tools

Read/discovery:

- `list_applications`: list applications, with optional `status`, `tags`, and `includeArchived`.
- `read_application`: read one full application by ID.
- `list_application_tags`: list distinct tags.
- `get_application_stats`: return aggregate stage/source counts.

Write:

- `create_application`: create an application.
- `update_application`: update editable fields, including stage, archive state, contacts, follow-up, tags, linked resume, source URL, job description, notes, and document URLs.
- `add_application_note`: append a timeline note.
- `delete_application`: permanently delete one application.
- `bulk_update_applications`: move, archive/unarchive, or add tags to multiple applications.
- `bulk_delete_applications`: permanently delete multiple applications.
- `import_applications`: bulk-create parsed application rows, matching the REST `import` shape.
- `attach_application_document`: attach a sent resume or cover letter PDF.
- `remove_application_document`: remove a sent resume or cover letter PDF.

AI:

- `autofill_application_from_job`: extract company, role, location, salary, and job description from a job posting URL or pasted job description.
- `score_application_match`: score the linked resume against the job description and persist match metadata.
- `tailor_resume_for_application`: create and link a tailored resume copy.
- `draft_application_message`: draft either a cover letter or follow-up message.

### MCP Attachment Input

`attach_application_document` should support agent-only use. The tool should accept:

- `id`;
- `kind`: `resume` or `cover-letter`;
- `fileName`;
- `contentType`: `application/pdf`;
- `dataBase64`: PDF bytes encoded as base64.

The handler can decode the base64 and call the same shared application-document service used by the public REST file upload. This avoids forcing MCP clients to provide browser `File` objects while still giving agents the same document capability as the UI.

### MCP Output Shape

Prefer JSON text outputs for data-bearing tools. Human-readable success strings are fine for destructive/simple tools only when no structured data is useful. For create/update/read/list/stats/AI tools, return JSON so agents can chain calls reliably.

### Tool Annotations

- Read tools: read-only, idempotent, non-destructive.
- AI generation tools:
  - `autofill_application_from_job` is read-only but non-idempotent if it fetches a URL or calls AI.
  - `draft_application_message` is read-only but non-idempotent.
  - `score_application_match` and `tailor_resume_for_application` are write, non-idempotent.
- Delete tools are destructive.
- `update_application`, `bulk_update_applications`, and document remove are write/idempotent when the same input repeats, except tag append remains effectively idempotent because the service de-duplicates tags.
- `create_application`, `import_applications`, note append, and document attach are write/non-idempotent.
- `openWorldHint` should be `false` for closed account data tools and `true` only for job-posting autofill because it can fetch an external URL.

## Skill Update

Update `skills/resume-builder/SKILL.md` in place.

Add concise guidance that Reactive Resume MCP can manage applications as well as resumes. The skill should tell agents:

- use application tools when the user wants to track job applications, import a spreadsheet, move an opportunity through stages, add notes/contacts/follow-ups, attach sent documents, or use Application Copilot;
- use `list_applications` before acting on existing records;
- use `create_application` or `import_applications` for new records;
- use `tailor_resume_for_application` after a linked resume and job description exist;
- review AI-generated cover letters and follow-ups before sending.

Do not turn the skill into a full API reference. Keep it short and point agents at MCP tools by name.

## Documentation Updates

Update:

- `docs/guides/using-the-mcp-server.mdx`: add Application Tracker tools, examples, and troubleshooting notes.
- `docs/use-cases/api-mcp-resume-automation.mdx`: expand scope from resume-only automation to resume plus application tracking.
- `docs/spec.json`: refresh the public OpenAPI spec so docs show application routes.

The existing job application and CSV guides already describe the UI behavior accurately and should not need broad rewrites.

## Testing Plan

Focused tests:

- API/service tests for attaching/removing resume and cover-letter documents, including ownership and storage cleanup.
- DTO/router tests for application document upload constraints if the route logic is not already covered through service tests.
- MCP tests that:
  - every `MCP_TOOL_NAME` has metadata and annotations;
  - server card includes the new tools;
  - `registerTools` registers application tools;
  - one read handler and one write handler call the expected oRPC client procedure;
  - base64 document attachment rejects non-PDF input.

Validation commands:

- `pnpm --filter @reactive-resume/api test`
- `pnpm --filter @reactive-resume/mcp test`
- `pnpm --filter @reactive-resume/api typecheck`
- `pnpm --filter @reactive-resume/mcp typecheck`
- `pnpm exec turbo boundaries`
- a focused Biome check on touched files; use a non-mutating check first unless formatting edits are intentionally being applied.

## Non-Goals

- Custom stages.
- Campaign tracking.
- Server-side board/search/sort endpoints.
- A standalone application schema resource in MCP.
- New dependencies.
- Refactoring the application tracker UI.
