# Application Tracker REST and MCP Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose every shipped Application Tracker capability through public REST/OpenAPI, Reactive Resume MCP tools, and the bundled `resume-builder` skill.

**Architecture:** Reuse the existing `packages/api/src/features/applications` oRPC procedures and `applicationService` as the single business layer. Add the one missing public REST capability, application document attach/remove, then register MCP tools that call the injected in-process oRPC `RouterClient` rather than importing database code.

**Tech Stack:** TypeScript, oRPC, Zod v4, Drizzle, Vitest, MCP TypeScript SDK, existing Reactive Resume storage service, Biome.

## Global Constraints

- Campaign tracking is out of scope.
- Fixed stages remain `saved`, `applied`, `screening`, `interview`, `offer`, `rejected`.
- Public REST endpoints live under `/api/openapi` and are generated from oRPC route metadata.
- Generic storage routes stay tagged `Internal`; public application document upload/remove belongs under the Applications tag.
- Application documents are PDFs only.
- Document uploads keep the existing 10MB storage limit.
- MCP tool names use canonical unprefixed `snake_case`.
- MCP handlers use the injected in-process oRPC `RouterClient`.
- No new dependencies.
- Do not refactor the Application Tracker UI.

---

## File Structure

- Modify `packages/api/src/dto/application.ts`: add document kind/upload/delete DTO schemas.
- Modify `packages/api/src/dto/application.test.ts`: test document DTO constraints.
- Modify `packages/api/src/features/applications/service.ts`: add `attachDocument` and `removeDocument` service methods, reusing existing ownership and storage cleanup helpers.
- Modify `packages/api/src/features/applications/service.test.ts`: cover document attachment/removal behavior and storage cleanup.
- Modify `packages/api/src/features/applications/crud.ts`: add public REST document routes.
- Modify `packages/api/src/features/applications/router.ts`: expose document route procedures under `applications`.
- Modify `packages/mcp/src/mcp-tool-names.ts`: add application MCP tool names.
- Modify `packages/mcp/src/tool-meta.ts`: add application tool input schemas and metadata.
- Modify `packages/mcp/src/tool-annotations.ts`: add annotations for new tools.
- Modify `packages/mcp/src/tools.ts`: register application tool handlers.
- Modify `packages/mcp/src/tool-annotations.test.ts`, `packages/mcp/src/mcp-server-card.test.ts`, and `packages/mcp/src/tools.test.ts`: cover registration and handler behavior.
- Modify `skills/resume-builder/SKILL.md`: tell agents application MCP tools exist.
- Modify `docs/guides/using-the-mcp-server.mdx`: document application tools and examples.
- Modify `docs/use-cases/api-mcp-resume-automation.mdx`: expand use case from resume-only automation to resume plus application tracking.
- Modify `docs/spec.json`: refresh OpenAPI output after API route changes.

---

### Task 1: Public REST Document Attach/Remove

**Files:**
- Modify: `packages/api/src/dto/application.ts`
- Modify: `packages/api/src/dto/application.test.ts`
- Modify: `packages/api/src/features/applications/service.ts`
- Modify: `packages/api/src/features/applications/service.test.ts`
- Modify: `packages/api/src/features/applications/crud.ts`
- Modify: `packages/api/src/features/applications/router.ts`

**Interfaces:**
- Consumes: existing `applicationService.update(input)` and existing storage helpers in `packages/api/src/features/storage/service.ts`.
- Produces:
  - `applicationDto.attachDocument.input`: `{ id: string; kind: "resume" | "cover-letter"; file: File }`
  - `applicationDto.removeDocument.input`: `{ id: string; kind: "resume" | "cover-letter" }`
  - `applicationService.attachDocument(input: { id: string; userId: string; kind: ApplicationDocumentKind; fileName: string; data: Uint8Array; contentType: string }): Promise<ApplicationWithoutUserId>`
  - `applicationService.removeDocument(input: { id: string; userId: string; kind: ApplicationDocumentKind }): Promise<ApplicationWithoutUserId>`
  - `crudRouter.attachDocument`
  - `crudRouter.removeDocument`

- [ ] **Step 1: Add failing DTO tests**

Append to `packages/api/src/dto/application.test.ts`:

```ts
describe("applicationDto document uploads", () => {
	it("accepts PDF application documents", () => {
		const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });

		const parsed = applicationDto.attachDocument.input.parse({
			id: "application-1",
			kind: "resume",
			file,
		});

		expect(parsed.kind).toBe("resume");
		expect(parsed.file.name).toBe("resume.pdf");
	});

	it("rejects non-PDF application documents", () => {
		const file = new File(["hello"], "cover.txt", { type: "text/plain" });

		expect(() =>
			applicationDto.attachDocument.input.parse({
				id: "application-1",
				kind: "cover-letter",
				file,
			}),
		).toThrow();
	});

	it("rejects unknown application document kinds", () => {
		const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });

		expect(() =>
			applicationDto.attachDocument.input.parse({
				id: "application-1",
				kind: "portfolio",
				file,
			}),
		).toThrow();
	});
});
```

- [ ] **Step 2: Run DTO test to verify it fails**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/dto/application.test.ts
```

Expected: FAIL because `applicationDto.attachDocument` is undefined.

- [ ] **Step 3: Add document DTO schemas**

In `packages/api/src/dto/application.ts`, add near the top-level constants:

```ts
const MAX_APPLICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;

const applicationDocumentKindSchema = z.enum(["resume", "cover-letter"]);

const applicationDocumentFileSchema = z
	.file()
	.max(MAX_APPLICATION_DOCUMENT_BYTES, "File size must be less than 10MB")
	.mime(["application/pdf"], "Application documents must be PDF files.");
```

Add to `applicationDto`:

```ts
	attachDocument: {
		input: z.object({
			id: z.string(),
			kind: applicationDocumentKindSchema,
			file: applicationDocumentFileSchema,
		}),
		output: applicationSchema.omit({ userId: true }),
	},

	removeDocument: {
		input: z.object({
			id: z.string(),
			kind: applicationDocumentKindSchema,
		}),
		output: applicationSchema.omit({ userId: true }),
	},
```

Also export the kind type at the end of the file:

```ts
export type ApplicationDocumentKind = z.infer<typeof applicationDocumentKindSchema>;
```

- [ ] **Step 4: Run DTO tests to verify they pass**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/dto/application.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add failing service tests**

Modify the hoisted mocks in `packages/api/src/features/applications/service.test.ts`:

```ts
const storageDeleteMock = vi.hoisted(() => vi.fn());
const uploadFileMock = vi.hoisted(() => vi.fn());
```

Replace the storage service mock with:

```ts
vi.mock("../storage/service", () => ({
	getStorageService: () => ({ delete: storageDeleteMock }),
	uploadFile: uploadFileMock,
}));
```

Add to `beforeEach`:

```ts
	uploadFileMock.mockReset();
	uploadFileMock.mockResolvedValue({ url: "/api/uploads/user-1/pictures/new.pdf", key: "uploads/user-1/pictures/new.pdf" });
```

Append tests:

```ts
describe("applicationService.attachDocument", () => {
	it("uploads a PDF resume document and stores it on the application", async () => {
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.attachDocument({
			id: "app-1",
			userId: "user-1",
			kind: "resume",
			fileName: "sent-resume.pdf",
			contentType: "application/pdf",
			data: new Uint8Array([1, 2, 3]),
		});

		expect(uploadFileMock).toHaveBeenCalledWith({
			userId: "user-1",
			contentType: "application/pdf",
			data: new Uint8Array([1, 2, 3]),
		});
		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				resumeFileUrl: "/api/uploads/user-1/pictures/new.pdf",
				resumeFileName: "sent-resume.pdf",
			}),
		);
	});

	it("rejects non-PDF documents before upload", async () => {
		await expect(
			applicationService.attachDocument({
				id: "app-1",
				userId: "user-1",
				kind: "cover-letter",
				fileName: "cover.txt",
				contentType: "text/plain",
				data: new Uint8Array([1]),
			}),
		).rejects.toMatchObject({ code: "BAD_REQUEST" });

		expect(uploadFileMock).not.toHaveBeenCalled();
	});
});

describe("applicationService.removeDocument", () => {
	it("clears and deletes an owned cover letter document", async () => {
		const set = vi.fn(() => ({ where: () => ({ returning: () => Promise.resolve([{ ...existing }]) }) }));
		dbMock.update.mockReturnValue({ set });

		await applicationService.removeDocument({ id: "app-1", userId: "user-1", kind: "cover-letter" });

		expect(set).toHaveBeenCalledWith(
			expect.objectContaining({
				coverLetterUrl: null,
				coverLetterName: null,
			}),
		);
		expect(storageDeleteMock).toHaveBeenCalledWith("uploads/user-1/pictures/cover.pdf");
	});
});
```

- [ ] **Step 6: Run service tests to verify they fail**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/features/applications/service.test.ts
```

Expected: FAIL because `applicationService.attachDocument` and `applicationService.removeDocument` are undefined.

- [ ] **Step 7: Add service implementation**

In `packages/api/src/features/applications/service.ts`, update imports:

```ts
import type { ApplicationDocumentKind } from "../../dto/application";
import { getStorageService, uploadFile } from "../storage/service";
```

Add this helper near `deleteApplicationAttachments`:

```ts
function documentFields(kind: ApplicationDocumentKind) {
	return kind === "resume"
		? ({
				url: "resumeFileUrl",
				name: "resumeFileName",
			} as const)
		: ({
				url: "coverLetterUrl",
				name: "coverLetterName",
			} as const);
}
```

Add methods to `applicationService` after `update`:

```ts
	attachDocument: async (input: {
		id: string;
		userId: string;
		kind: ApplicationDocumentKind;
		fileName: string;
		data: Uint8Array;
		contentType: string;
	}) => {
		if (input.contentType !== "application/pdf") {
			throw new ORPCError("BAD_REQUEST", { message: "Application documents must be PDF files." });
		}

		const existing = await requireOwned(input.id, input.userId);
		const fields = documentFields(input.kind);
		const uploaded = await uploadFile({
			userId: input.userId,
			data: input.data,
			contentType: input.contentType,
		});

		try {
			const updated = await applicationService.update({
				id: input.id,
				userId: input.userId,
				[fields.url]: uploaded.url,
				[fields.name]: input.fileName,
			});

			await deleteApplicationAttachments(input.userId, [
				{
					resumeFileUrl: fields.url === "resumeFileUrl" ? existing.resumeFileUrl : null,
					coverLetterUrl: fields.url === "coverLetterUrl" ? existing.coverLetterUrl : null,
				},
			]);

			return updated;
		} catch (error) {
			await getStorageService().delete(uploaded.key).catch(() => false);
			throw error;
		}
	},

	removeDocument: async (input: { id: string; userId: string; kind: ApplicationDocumentKind }) => {
		const existing = await requireOwned(input.id, input.userId);
		const fields = documentFields(input.kind);
		const updated = await applicationService.update({
			id: input.id,
			userId: input.userId,
			[fields.url]: null,
			[fields.name]: null,
		});

		await deleteApplicationAttachments(input.userId, [
			{
				resumeFileUrl: fields.url === "resumeFileUrl" ? existing.resumeFileUrl : null,
				coverLetterUrl: fields.url === "coverLetterUrl" ? existing.coverLetterUrl : null,
			},
		]);

		return updated;
	},
```

- [ ] **Step 8: Run service tests to verify they pass**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/features/applications/service.test.ts
```

Expected: PASS.

- [ ] **Step 9: Add REST routes**

In `packages/api/src/features/applications/crud.ts`, add methods before `stats`:

```ts
	attachDocument: protectedProcedure
		.route({
			method: "POST",
			path: "/applications/{id}/documents/{kind}",
			tags: ["Applications"],
			operationId: "attachApplicationDocument",
			summary: "Attach an application document",
			description:
				"Uploads and attaches a PDF document to an application. Kind must be either resume or cover-letter. Requires authentication.",
			successDescription: "The updated application.",
			requestBodyHint: "form-data",
		})
		.input(applicationDto.attachDocument.input)
		.use(resumeMutationRateLimit)
		.output(applicationDto.attachDocument.output)
		.handler(async ({ input, context }) => {
			const buffer = await input.file.arrayBuffer();
			return applicationService.attachDocument({
				id: input.id,
				userId: context.user.id,
				kind: input.kind,
				fileName: input.file.name,
				contentType: input.file.type,
				data: new Uint8Array(buffer),
			});
		}),

	removeDocument: protectedProcedure
		.route({
			method: "DELETE",
			path: "/applications/{id}/documents/{kind}",
			tags: ["Applications"],
			operationId: "removeApplicationDocument",
			summary: "Remove an application document",
			description:
				"Removes a resume or cover-letter PDF from an application and clears the stored document fields. Requires authentication.",
			successDescription: "The updated application.",
		})
		.input(applicationDto.removeDocument.input)
		.use(resumeMutationRateLimit)
		.output(applicationDto.removeDocument.output)
		.handler(async ({ input, context }) => {
			return applicationService.removeDocument({ id: input.id, userId: context.user.id, kind: input.kind });
		}),
```

In `packages/api/src/features/applications/router.ts`, add:

```ts
	attachDocument: crudRouter.attachDocument,
	removeDocument: crudRouter.removeDocument,
```

- [ ] **Step 10: Run API typecheck**

Run:

```bash
pnpm --filter @reactive-resume/api typecheck
```

Expected: PASS.

- [ ] **Step 11: Commit REST/API task**

Run:

```bash
git add packages/api/src/dto/application.ts packages/api/src/dto/application.test.ts packages/api/src/features/applications/service.ts packages/api/src/features/applications/service.test.ts packages/api/src/features/applications/crud.ts packages/api/src/features/applications/router.ts
git commit -m "feat: add application document API"
```

Expected: commit succeeds.

---

### Task 2: MCP Tool Names, Metadata, and Annotations

**Files:**
- Modify: `packages/mcp/src/mcp-tool-names.ts`
- Modify: `packages/mcp/src/tool-meta.ts`
- Modify: `packages/mcp/src/tool-annotations.ts`
- Modify: `packages/mcp/src/tool-annotations.test.ts`
- Modify: `packages/mcp/src/mcp-server-card.test.ts`

**Interfaces:**
- Consumes: `applicationStatusSchema` and `contactSchema` from `@reactive-resume/schema/applications/data`.
- Produces: new `MCP_TOOL_NAME` values and `TOOL_META` entries used by `registerTools` in Task 3.

- [ ] **Step 1: Add failing MCP metadata tests**

In `packages/mcp/src/tool-annotations.test.ts`, add after the canonical read/patch names test:

```ts
	it("uses canonical application tool names", () => {
		expect(MCP_TOOL_NAME.listApplications).toBe("list_applications");
		expect(MCP_TOOL_NAME.readApplication).toBe("read_application");
		expect(MCP_TOOL_NAME.createApplication).toBe("create_application");
		expect(MCP_TOOL_NAME.attachApplicationDocument).toBe("attach_application_document");
		expect(MCP_TOOL_NAME.autofillApplicationFromJob).toBe("autofill_application_from_job");
	});
```

In the read-only annotation test list, add:

```ts
			MCP_TOOL_NAME.listApplications,
			MCP_TOOL_NAME.readApplication,
			MCP_TOOL_NAME.listApplicationTags,
			MCP_TOOL_NAME.getApplicationStats,
```

Add tests before the open-world test:

```ts
	it("marks application delete tools as destructive", () => {
		for (const name of [MCP_TOOL_NAME.deleteApplication, MCP_TOOL_NAME.bulkDeleteApplications]) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.readOnlyHint, name).toBe(false);
			expect(annotations.destructiveHint, name).toBe(true);
		}
	});

	it("marks only job-posting autofill as open-world", () => {
		expect(TOOL_ANNOTATIONS[MCP_TOOL_NAME.autofillApplicationFromJob].openWorldHint).toBe(true);
	});
```

In `packages/mcp/src/mcp-server-card.test.ts`, add:

```ts
	it("advertises application tracker tools", () => {
		const names = card.tools.map((tool) => tool.name);

		expect(names).toContain("list_applications");
		expect(names).toContain("create_application");
		expect(names).toContain("attach_application_document");
		expect(names).toContain("tailor_resume_for_application");
	});
```

- [ ] **Step 2: Run MCP metadata tests to verify they fail**

Run:

```bash
pnpm --filter @reactive-resume/mcp test -- src/tool-annotations.test.ts src/mcp-server-card.test.ts
```

Expected: FAIL because the new MCP tool names do not exist.

- [ ] **Step 3: Add MCP tool names**

In `packages/mcp/src/mcp-tool-names.ts`, add these properties to `MCP_TOOL_NAME`:

```ts
	listApplications: "list_applications",
	readApplication: "read_application",
	listApplicationTags: "list_application_tags",
	getApplicationStats: "get_application_stats",
	createApplication: "create_application",
	updateApplication: "update_application",
	addApplicationNote: "add_application_note",
	deleteApplication: "delete_application",
	bulkUpdateApplications: "bulk_update_applications",
	bulkDeleteApplications: "bulk_delete_applications",
	importApplications: "import_applications",
	attachApplicationDocument: "attach_application_document",
	removeApplicationDocument: "remove_application_document",
	autofillApplicationFromJob: "autofill_application_from_job",
	scoreApplicationMatch: "score_application_match",
	tailorResumeForApplication: "tailor_resume_for_application",
	draftApplicationMessage: "draft_application_message",
```

- [ ] **Step 4: Add MCP metadata schemas**

In `packages/mcp/src/tool-meta.ts`, add imports:

```ts
import { applicationStatusSchema, contactSchema } from "@reactive-resume/schema/applications/data";
```

Add shared schemas near `resumeIdSchema`:

```ts
const applicationIdSchema = z.string().min(1).describe(`Application ID. Use \`${T.listApplications}\` to find valid IDs.`);
const applicationDocumentKindSchema = z.enum(["resume", "cover-letter"]);
const pdfBase64Schema = z
	.string()
	.min(1)
	.describe("Base64-encoded PDF bytes. Only application/pdf documents are accepted.");

const applicationEditableSchema = {
	company: z.string().min(1).optional().describe("Company name."),
	role: z.string().min(1).optional().describe("Role or job title."),
	status: applicationStatusSchema.optional().describe("Pipeline stage."),
	archived: z.boolean().optional().describe("Whether the application is hidden from active views."),
	location: z.string().nullable().optional(),
	salary: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	sourceUrl: z.string().url().nullable().optional(),
	jobDescription: z.string().max(20_000).nullable().optional(),
	notes: z.string().nullable().optional(),
	resumeId: z.string().nullable().optional(),
	resumeFileUrl: z.string().nullable().optional(),
	resumeFileName: z.string().nullable().optional(),
	coverLetterUrl: z.string().nullable().optional(),
	coverLetterName: z.string().nullable().optional(),
	followUpAt: z.coerce.date().nullable().optional(),
	followUpNote: z.string().nullable().optional(),
	contacts: z.array(contactSchema).optional(),
	tags: z.array(z.string()).optional(),
} as const;

const createApplicationSchema = z.object({
	...applicationEditableSchema,
	company: z.string().min(1).describe("Company name."),
	role: z.string().min(1).describe("Role or job title."),
});
```

Add these `TOOL_META` entries after resume tools or in a separate Applications block:

```ts
	[T.listApplications]: {
		title: "List Applications",
		description:
			"List job applications for the authenticated account. Use this before reading or updating existing applications.",
		inputSchema: z.object({
			status: applicationStatusSchema.optional(),
			tags: z.array(z.string()).optional().default([]),
			includeArchived: z.boolean().optional().default(false),
		}),
		annotations: TOOL_ANNOTATIONS[T.listApplications],
	},
	[T.readApplication]: {
		title: "Read Application",
		description: "Read one full job application, including contacts, document URLs, follow-up details, and timeline.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: TOOL_ANNOTATIONS[T.readApplication],
	},
	[T.listApplicationTags]: {
		title: "List Application Tags",
		description: "Return every distinct tag used across job applications.",
		inputSchema: z.object({}),
		annotations: TOOL_ANNOTATIONS[T.listApplicationTags],
	},
	[T.getApplicationStats]: {
		title: "Get Application Stats",
		description: "Return aggregate application counts by pipeline stage and source for insights.",
		inputSchema: z.object({}),
		annotations: TOOL_ANNOTATIONS[T.getApplicationStats],
	},
	[T.createApplication]: {
		title: "Create Application",
		description: "Create a tracked job application. Company and role are required.",
		inputSchema: createApplicationSchema,
		annotations: TOOL_ANNOTATIONS[T.createApplication],
	},
	[T.updateApplication]: {
		title: "Update Application",
		description: "Update application fields, move stages, archive/unarchive, edit contacts, follow-up, tags, or linked resume.",
		inputSchema: z.object({ id: applicationIdSchema, ...applicationEditableSchema }),
		annotations: TOOL_ANNOTATIONS[T.updateApplication],
	},
	[T.addApplicationNote]: {
		title: "Add Application Note",
		description: "Append a free-text note to an application's timeline.",
		inputSchema: z.object({ id: applicationIdSchema, text: z.string().min(1) }),
		annotations: TOOL_ANNOTATIONS[T.addApplicationNote],
	},
	[T.deleteApplication]: {
		title: "Delete Application",
		description: "Permanently delete one job application and its owned uploaded documents.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: TOOL_ANNOTATIONS[T.deleteApplication],
	},
	[T.bulkUpdateApplications]: {
		title: "Bulk Update Applications",
		description: "Move, archive/unarchive, or add tags to multiple applications.",
		inputSchema: z.object({
			ids: z.array(z.string()).min(1),
			status: applicationStatusSchema.optional(),
			archived: z.boolean().optional(),
			addTags: z.array(z.string()).optional(),
		}),
		annotations: TOOL_ANNOTATIONS[T.bulkUpdateApplications],
	},
	[T.bulkDeleteApplications]: {
		title: "Bulk Delete Applications",
		description: "Permanently delete multiple applications.",
		inputSchema: z.object({ ids: z.array(z.string()).min(1) }),
		annotations: TOOL_ANNOTATIONS[T.bulkDeleteApplications],
	},
	[T.importApplications]: {
		title: "Import Applications",
		description: "Bulk-create application rows parsed from CSV or another source. Maximum 500 items.",
		inputSchema: z.object({ items: z.array(createApplicationSchema).min(1).max(500) }),
		annotations: TOOL_ANNOTATIONS[T.importApplications],
	},
	[T.attachApplicationDocument]: {
		title: "Attach Application Document",
		description: "Attach a sent resume or cover-letter PDF to an application using base64-encoded PDF bytes.",
		inputSchema: z.object({
			id: applicationIdSchema,
			kind: applicationDocumentKindSchema,
			fileName: z.string().min(1),
			contentType: z.literal("application/pdf"),
			dataBase64: pdfBase64Schema,
		}),
		annotations: TOOL_ANNOTATIONS[T.attachApplicationDocument],
	},
	[T.removeApplicationDocument]: {
		title: "Remove Application Document",
		description: "Remove a sent resume or cover-letter PDF from an application.",
		inputSchema: z.object({ id: applicationIdSchema, kind: applicationDocumentKindSchema }),
		annotations: TOOL_ANNOTATIONS[T.removeApplicationDocument],
	},
	[T.autofillApplicationFromJob]: {
		title: "Autofill Application From Job",
		description: "Use AI to extract company, role, location, salary, and job description from a job URL or pasted posting.",
		inputSchema: z.object({
			sourceUrl: z.string().url().optional(),
			jobDescription: z.string().max(20_000).optional(),
		}),
		annotations: TOOL_ANNOTATIONS[T.autofillApplicationFromJob],
	},
	[T.scoreApplicationMatch]: {
		title: "Score Application Match",
		description: "Score the linked resume against the application's job description and persist match metadata.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: TOOL_ANNOTATIONS[T.scoreApplicationMatch],
	},
	[T.tailorResumeForApplication]: {
		title: "Tailor Resume For Application",
		description: "Create and link a tailored copy of the application's linked resume.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: TOOL_ANNOTATIONS[T.tailorResumeForApplication],
	},
	[T.draftApplicationMessage]: {
		title: "Draft Application Message",
		description: "Draft either a cover letter or recruiter follow-up from application and resume context.",
		inputSchema: z.object({ id: applicationIdSchema, kind: z.enum(["cover-letter", "follow-up"]) }),
		annotations: TOOL_ANNOTATIONS[T.draftApplicationMessage],
	},
```

- [ ] **Step 5: Add annotations**

In `packages/mcp/src/tool-annotations.ts`, add:

```ts
const READ_OPEN_WORLD_NON_IDEMPOTENT: ToolAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: true,
};
```

Add mappings:

```ts
	[MCP_TOOL_NAME.listApplications]: READ_IDEMPOTENT,
	[MCP_TOOL_NAME.readApplication]: READ_IDEMPOTENT,
	[MCP_TOOL_NAME.listApplicationTags]: READ_IDEMPOTENT,
	[MCP_TOOL_NAME.getApplicationStats]: READ_IDEMPOTENT,
	[MCP_TOOL_NAME.createApplication]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.updateApplication]: WRITE_IDEMPOTENT,
	[MCP_TOOL_NAME.addApplicationNote]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.deleteApplication]: WRITE_DESTRUCTIVE,
	[MCP_TOOL_NAME.bulkUpdateApplications]: WRITE_IDEMPOTENT,
	[MCP_TOOL_NAME.bulkDeleteApplications]: WRITE_DESTRUCTIVE,
	[MCP_TOOL_NAME.importApplications]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.attachApplicationDocument]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.removeApplicationDocument]: WRITE_IDEMPOTENT,
	[MCP_TOOL_NAME.autofillApplicationFromJob]: READ_OPEN_WORLD_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.scoreApplicationMatch]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.tailorResumeForApplication]: WRITE_NON_IDEMPOTENT,
	[MCP_TOOL_NAME.draftApplicationMessage]: READ_NON_IDEMPOTENT,
```

Update the existing "declares no tools as open-world by default" test to skip `MCP_TOOL_NAME.autofillApplicationFromJob`:

```ts
	for (const [name, annotations] of Object.entries(TOOL_ANNOTATIONS)) {
		if (name === MCP_TOOL_NAME.autofillApplicationFromJob) continue;
		expect(annotations.openWorldHint).toBe(false);
	}
```

- [ ] **Step 6: Run MCP metadata tests**

Run:

```bash
pnpm --filter @reactive-resume/mcp test -- src/tool-annotations.test.ts src/mcp-server-card.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit metadata task**

Run:

```bash
git add packages/mcp/src/mcp-tool-names.ts packages/mcp/src/tool-meta.ts packages/mcp/src/tool-annotations.ts packages/mcp/src/tool-annotations.test.ts packages/mcp/src/mcp-server-card.test.ts
git commit -m "feat: describe application MCP tools"
```

Expected: commit succeeds.

---

### Task 3: MCP Application Tool Handlers

**Files:**
- Modify: `packages/mcp/src/tools.ts`
- Modify: `packages/mcp/src/tools.test.ts`

**Interfaces:**
- Consumes: `MCP_TOOL_NAME` values and `TOOL_META` entries from Task 2.
- Consumes: API procedures exposed from Task 1.
- Produces: registered MCP handlers for every application tool.

- [ ] **Step 1: Add failing handler tests**

In `packages/mcp/src/tools.test.ts`, change `ToolHandler` to accept any object:

```ts
type ToolHandler = (input: Record<string, unknown>) => Promise<{
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
}>;
```

Extend `clientMock` with:

```ts
	applications: {
		list: vi.fn(),
		getById: vi.fn(),
		tags: vi.fn(),
		stats: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		addNote: vi.fn(),
		delete: vi.fn(),
		bulkUpdate: vi.fn(),
		bulkDelete: vi.fn(),
		import: vi.fn(),
		attachDocument: vi.fn(),
		removeDocument: vi.fn(),
		ai: {
			autofill: vi.fn(),
			matchScore: vi.fn(),
			tailorResume: vi.fn(),
			draftMessage: vi.fn(),
		},
	},
```

Add tests:

```ts
	it("registers application tracker tools", () => {
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const names = registered.map((item) => item.name);
		expect(names).toContain("list_applications");
		expect(names).toContain("create_application");
		expect(names).toContain("attach_application_document");
		expect(names).toContain("draft_application_message");
	});

	it("lists applications as JSON", async () => {
		clientMock.applications.list.mockResolvedValueOnce([{ id: "app-1", company: "Acme", role: "Engineer" }]);
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "list_applications")!;
		const result = await tool.handler({ includeArchived: true, tags: ["remote"] });

		expect(clientMock.applications.list).toHaveBeenCalledWith({ includeArchived: true, tags: ["remote"] });
		expect(JSON.parse(result.content[0]!.text)).toEqual([{ id: "app-1", company: "Acme", role: "Engineer" }]);
	});

	it("creates applications through the router client", async () => {
		clientMock.applications.create.mockResolvedValueOnce("app-1");
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "create_application")!;
		const result = await tool.handler({ company: "Acme", role: "Engineer", status: "saved" });

		expect(clientMock.applications.create).toHaveBeenCalledWith({
			company: "Acme",
			role: "Engineer",
			status: "saved",
		});
		expect(JSON.parse(result.content[0]!.text)).toEqual({ id: "app-1" });
	});

	it("attaches a base64 PDF document through the router client", async () => {
		clientMock.applications.attachDocument.mockResolvedValueOnce({ id: "app-1", resumeFileName: "resume.pdf" });
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "attach_application_document")!;
		const result = await tool.handler({
			id: "app-1",
			kind: "resume",
			fileName: "resume.pdf",
			contentType: "application/pdf",
			dataBase64: Buffer.from("%PDF-1.4").toString("base64"),
		});

		const call = clientMock.applications.attachDocument.mock.calls[0]?.[0] as { file: File };
		expect(call.file).toBeInstanceOf(File);
		expect(call.file.name).toBe("resume.pdf");
		expect(call.file.type).toBe("application/pdf");
		expect(JSON.parse(result.content[0]!.text)).toEqual({ id: "app-1", resumeFileName: "resume.pdf" });
	});

	it("rejects non-PDF application document attachments before calling the client", async () => {
		const { server, registered } = makeFakeServer();
		registerTools(server as never, clientMock as never, new Headers());

		const tool = registered.find((item) => item.name === "attach_application_document")!;
		const result = await tool.handler({
			id: "app-1",
			kind: "resume",
			fileName: "resume.txt",
			contentType: "text/plain",
			dataBase64: Buffer.from("hello").toString("base64"),
		});

		expect(result.isError).toBe(true);
		expect(clientMock.applications.attachDocument).not.toHaveBeenCalled();
	});
```

- [ ] **Step 2: Run handler tests to verify they fail**

Run:

```bash
pnpm --filter @reactive-resume/mcp test -- src/tools.test.ts
```

Expected: FAIL because application tools are not registered.

- [ ] **Step 3: Add JSON and File helpers**

In `packages/mcp/src/tools.ts`, add an import:

```ts
import { Buffer } from "node:buffer";
```

Add helper near `text()`:

```ts
function json(value: unknown): CallToolResult {
	return text(JSON.stringify(value, null, 2));
}

function fileFromBase64(input: { fileName: string; contentType: string; dataBase64: string }): File {
	if (input.contentType !== "application/pdf") throw new Error("Application documents must be PDF files.");

	const bytes = Buffer.from(input.dataBase64, "base64");
	if (bytes.length === 0) throw new Error("Application document cannot be empty.");

	return new File([bytes], input.fileName, { type: input.contentType });
}
```

- [ ] **Step 4: Register read/discovery handlers**

In `registerTools`, after resume statistics or in a clearly labelled Applications block, add:

```ts
	server.registerTool(
		T.listApplications,
		TOOL_META[T.listApplications],
		withErrorHandling("listing applications", async (params) => {
			return json(await client.applications.list(params as { status?: never; tags?: string[]; includeArchived?: boolean }));
		}),
	);

	server.registerTool(
		T.readApplication,
		TOOL_META[T.readApplication],
		withErrorHandling("reading application", async ({ id }: { id: string }) => {
			return json(await client.applications.getById({ id }));
		}),
	);

	server.registerTool(
		T.listApplicationTags,
		TOOL_META[T.listApplicationTags],
		withErrorHandling("listing application tags", async () => {
			return json(await client.applications.tags());
		}),
	);

	server.registerTool(
		T.getApplicationStats,
		TOOL_META[T.getApplicationStats],
		withErrorHandling("getting application stats", async () => {
			return json(await client.applications.stats());
		}),
	);
```

- [ ] **Step 5: Register write handlers**

Add:

```ts
	server.registerTool(
		T.createApplication,
		TOOL_META[T.createApplication],
		withErrorHandling("creating application", async (params) => {
			const id = await client.applications.create(params as never);
			return json({ id });
		}),
	);

	server.registerTool(
		T.updateApplication,
		TOOL_META[T.updateApplication],
		withErrorHandling("updating application", async (params) => {
			return json(await client.applications.update(params as never));
		}),
	);

	server.registerTool(
		T.addApplicationNote,
		TOOL_META[T.addApplicationNote],
		withErrorHandling("adding application note", async ({ id, text: noteText }: { id: string; text: string }) => {
			return json(await client.applications.addNote({ id, text: noteText }));
		}),
	);

	server.registerTool(
		T.deleteApplication,
		TOOL_META[T.deleteApplication],
		withErrorHandling("deleting application", async ({ id }: { id: string }) => {
			await client.applications.delete({ id });
			return text(`Deleted application (${id}).`);
		}),
	);

	server.registerTool(
		T.bulkUpdateApplications,
		TOOL_META[T.bulkUpdateApplications],
		withErrorHandling("bulk updating applications", async (params) => {
			return json(await client.applications.bulkUpdate(params as never));
		}),
	);

	server.registerTool(
		T.bulkDeleteApplications,
		TOOL_META[T.bulkDeleteApplications],
		withErrorHandling("bulk deleting applications", async ({ ids }: { ids: string[] }) => {
			return json(await client.applications.bulkDelete({ ids }));
		}),
	);

	server.registerTool(
		T.importApplications,
		TOOL_META[T.importApplications],
		withErrorHandling("importing applications", async (params) => {
			return json(await client.applications.import(params as never));
		}),
	);
```

- [ ] **Step 6: Register document handlers**

Add:

```ts
	server.registerTool(
		T.attachApplicationDocument,
		TOOL_META[T.attachApplicationDocument],
		withErrorHandling(
			"attaching application document",
			async ({
				id,
				kind,
				fileName,
				contentType,
				dataBase64,
			}: {
				id: string;
				kind: "resume" | "cover-letter";
				fileName: string;
				contentType: string;
				dataBase64: string;
			}) => {
				const file = fileFromBase64({ fileName, contentType, dataBase64 });
				return json(await client.applications.attachDocument({ id, kind, file }));
			},
		),
	);

	server.registerTool(
		T.removeApplicationDocument,
		TOOL_META[T.removeApplicationDocument],
		withErrorHandling(
			"removing application document",
			async ({ id, kind }: { id: string; kind: "resume" | "cover-letter" }) => {
				return json(await client.applications.removeDocument({ id, kind }));
			},
		),
	);
```

- [ ] **Step 7: Register AI handlers**

Add:

```ts
	server.registerTool(
		T.autofillApplicationFromJob,
		TOOL_META[T.autofillApplicationFromJob],
		withErrorHandling("autofilling application from job", async (params) => {
			return json(await client.applications.ai.autofill(params as { sourceUrl?: string; jobDescription?: string }));
		}),
	);

	server.registerTool(
		T.scoreApplicationMatch,
		TOOL_META[T.scoreApplicationMatch],
		withErrorHandling("scoring application match", async ({ id }: { id: string }) => {
			return json(await client.applications.ai.matchScore({ id }));
		}),
	);

	server.registerTool(
		T.tailorResumeForApplication,
		TOOL_META[T.tailorResumeForApplication],
		withErrorHandling("tailoring resume for application", async ({ id }: { id: string }) => {
			return json(await client.applications.ai.tailorResume({ id }));
		}),
	);

	server.registerTool(
		T.draftApplicationMessage,
		TOOL_META[T.draftApplicationMessage],
		withErrorHandling("drafting application message", async ({ id, kind }: { id: string; kind: "cover-letter" | "follow-up" }) => {
			return json(await client.applications.ai.draftMessage({ id, kind }));
		}),
	);
```

- [ ] **Step 8: Run MCP handler tests**

Run:

```bash
pnpm --filter @reactive-resume/mcp test -- src/tools.test.ts
```

Expected: PASS.

- [ ] **Step 9: Run MCP typecheck**

Run:

```bash
pnpm --filter @reactive-resume/mcp typecheck
```

Expected: PASS.

- [ ] **Step 10: Commit MCP handler task**

Run:

```bash
git add packages/mcp/src/tools.ts packages/mcp/src/tools.test.ts
git commit -m "feat: add application MCP tools"
```

Expected: commit succeeds.

---

### Task 4: Skill, MCP Docs, and OpenAPI Spec

**Files:**
- Modify: `skills/resume-builder/SKILL.md`
- Modify: `docs/guides/using-the-mcp-server.mdx`
- Modify: `docs/use-cases/api-mcp-resume-automation.mdx`
- Modify: `docs/spec.json`

**Interfaces:**
- Consumes: MCP tool names from Task 2 and route changes from Task 1.
- Produces: user-facing docs and skill guidance that describe application tracking through MCP.

- [ ] **Step 1: Update the resume-builder skill**

In `skills/resume-builder/SKILL.md`, add after the Workflow section heading and before "Step 1":

```md
### MCP Application Tracking

Reactive Resume MCP can manage job applications as well as resumes. When the user wants to track applications through an agent, use the application tools instead of asking them to open the web UI.

- Use `list_applications` before changing existing records.
- Use `create_application` for one new opportunity or `import_applications` for spreadsheet/CSV rows.
- Use `update_application` to move stages, archive/unarchive, edit contacts, set follow-ups, link a resume, or update job details.
- Use `add_application_note` to log timeline activity.
- Use `attach_application_document` and `remove_application_document` for sent resume or cover-letter PDFs.
- Use `score_application_match`, `tailor_resume_for_application`, and `draft_application_message` for Application Copilot workflows after a linked resume and job description exist.
- Review AI-generated cover letters and follow-ups before sending them.
```

- [ ] **Step 2: Update the MCP server guide tool table**

In `docs/guides/using-the-mcp-server.mdx`, extend the Available Tools table with:

```md
| `list_applications`              | List tracked job applications. Supports stage, tag, and archived filters                                      |
| `read_application`               | Read one full application record with contacts, follow-up details, documents, and timeline                    |
| `list_application_tags`          | List every distinct tag used across applications                                                             |
| `get_application_stats`          | Get aggregate application counts by stage and source                                                         |
| `create_application`             | Create a tracked job application                                                                             |
| `update_application`             | Update fields, move stage, archive/unarchive, edit contacts/follow-ups/tags, or link a resume                |
| `add_application_note`           | Append a note to an application's activity timeline                                                          |
| `delete_application`             | Permanently delete one application and its owned uploaded documents                                          |
| `bulk_update_applications`       | Move, archive/unarchive, or add tags to multiple applications                                                |
| `bulk_delete_applications`       | Permanently delete multiple applications                                                                     |
| `import_applications`            | Bulk-create parsed application rows, up to 500 items                                                         |
| `attach_application_document`    | Attach a sent resume or cover-letter PDF from base64-encoded PDF bytes                                       |
| `remove_application_document`    | Remove a sent resume or cover-letter PDF                                                                     |
| `autofill_application_from_job`  | Use AI to extract job details from a URL or pasted job description                                           |
| `score_application_match`        | Score the linked resume against the application job description                                              |
| `tailor_resume_for_application`  | Create and link a tailored resume copy for an application                                                    |
| `draft_application_message`      | Draft a cover letter or recruiter follow-up from application and resume context                              |
```

- [ ] **Step 3: Add application MCP usage examples**

In the Usage Examples section of `docs/guides/using-the-mcp-server.mdx`, add a subsection after Browsing:

```md
### Tracking Applications

- "Create an application for Senior Frontend Engineer at Acme, stage saved, source LinkedIn."
- "List my archived applications tagged remote."
- "Move my Acme application to interview and add a note that the technical screen is next Tuesday."
- "Attach this resume PDF to the Acme application."
- "Score the resume linked to this application against the job description."
- "Create a tailored resume copy for this application."
- "Draft a follow-up message for the recruiter."
```

Add a troubleshooting row:

```md
| "Application documents must be PDF files"                       | `attach_application_document` only accepts `contentType: "application/pdf"` and base64-encoded PDF bytes                       |
```

- [ ] **Step 4: Update the API/MCP automation use case**

Replace the first paragraph in `docs/use-cases/api-mcp-resume-automation.mdx` with:

```md
Reactive Resume supports automation through authenticated API access and an MCP server that lets compatible tools work with resumes and job applications. Agents can list, read, create, import, duplicate, and patch resumes, then track applications, move opportunities through stages, add notes and follow-ups, attach sent documents, and run Application Copilot actions.
```

Add to "Common automation workflows":

```md
- Track job applications end to end from an MCP client.
- Import existing application rows from a spreadsheet parser.
- Move applications through stages and log timeline notes.
- Attach the resume or cover-letter PDF sent for an application.
- Score a linked resume against a job description and create a tailored resume copy.
- Draft cover letters and recruiter follow-ups from saved application context.
```

- [ ] **Step 5: Refresh docs/spec.json**

Start the dev server in one terminal:

```bash
dotenvx run -f .env.local -- pnpm dev
```

In another terminal, after the server reports it is listening on port 3000, run:

```bash
curl -fsS http://localhost:3000/api/openapi/spec.json -o docs/spec.json
```

Expected: `docs/spec.json` contains `/applications` paths:

```bash
rg -n '"/applications|attachApplicationDocument|removeApplicationDocument' docs/spec.json
```

Expected: matches for the application paths and document operations.

- [ ] **Step 6: Run docs/skill checks**

Run:

```bash
rg -n "list_applications|attach_application_document|tailor_resume_for_application" skills/resume-builder/SKILL.md docs/guides/using-the-mcp-server.mdx docs/use-cases/api-mcp-resume-automation.mdx
rg -n '"/applications|attachApplicationDocument|removeApplicationDocument' docs/spec.json
```

Expected: all commands print matching lines.

- [ ] **Step 7: Commit docs task**

Run:

```bash
git add skills/resume-builder/SKILL.md docs/guides/using-the-mcp-server.mdx docs/use-cases/api-mcp-resume-automation.mdx docs/spec.json
git commit -m "docs: document application MCP automation"
```

Expected: commit succeeds.

---

### Task 5: Final Validation and Boundary Check

**Files:**
- No planned source edits.

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: verified implementation ready for review.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm --filter @reactive-resume/api test -- src/dto/application.test.ts src/features/applications/service.test.ts
pnpm --filter @reactive-resume/mcp test -- src/tools.test.ts src/tool-annotations.test.ts src/mcp-server-card.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run focused typechecks**

Run:

```bash
pnpm --filter @reactive-resume/api typecheck
pnpm --filter @reactive-resume/mcp typecheck
```

Expected: PASS.

- [ ] **Step 3: Run boundary check**

Run:

```bash
pnpm exec turbo boundaries
```

Expected: PASS.

- [ ] **Step 4: Run non-mutating Biome check on touched files**

Run:

```bash
pnpm exec biome check packages/api/src/dto/application.ts packages/api/src/dto/application.test.ts packages/api/src/features/applications/service.ts packages/api/src/features/applications/service.test.ts packages/api/src/features/applications/crud.ts packages/api/src/features/applications/router.ts packages/mcp/src/mcp-tool-names.ts packages/mcp/src/tool-meta.ts packages/mcp/src/tool-annotations.ts packages/mcp/src/tools.ts packages/mcp/src/tool-annotations.test.ts packages/mcp/src/mcp-server-card.test.ts packages/mcp/src/tools.test.ts skills/resume-builder/SKILL.md docs/guides/using-the-mcp-server.mdx docs/use-cases/api-mcp-resume-automation.mdx docs/spec.json
```

Expected: PASS. If Biome reports formatting fixes, run the same command with `--write`, inspect the diff, and commit only formatting changes.

- [ ] **Step 5: Inspect final diff**

Run:

```bash
git status --short
git log --oneline -5
```

Expected: worktree is clean after the task commits, and recent commits are the REST/API, MCP metadata, MCP handler, and docs commits from this plan.
