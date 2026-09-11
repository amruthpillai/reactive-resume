/**
 * Canonical tool metadata (title, description, inputSchema, annotations) declared once.
 * Consumed by both `registerTools` (raw Zod) and `buildMcpServerCard` (toJsonSchemaCompat).
 */
import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import z from "zod";
import { resumePatchOperationsSchema } from "@reactive-resume/ai/tools/resume-tool-contracts";
import { applicationStatusSchema, contactSchema } from "@reactive-resume/schema/applications/data";
import { MCP_TOOL_NAME as T } from "./mcp-tool-names";

const MAX_APPLICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;
const READ_IDEMPOTENT: ToolAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
};
const READ_NON_IDEMPOTENT: ToolAnnotations = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: false,
};
const WRITE_NON_IDEMPOTENT: ToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: false,
	openWorldHint: false,
};
const WRITE_DESTRUCTIVE: ToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: true,
	idempotentHint: true,
	openWorldHint: false,
};
const WRITE_IDEMPOTENT: ToolAnnotations = {
	readOnlyHint: false,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
};

// ponytail: shared schema fragment; exported so server-card can re-use without re-importing
const resumeIdSchema = z.string().min(1).describe(`Resume ID. Use \`${T.listResumes}\` to find valid IDs.`);
const applicationIdSchema = z
	.string()
	.min(1)
	.describe(`Application ID. Use \`${T.listApplications}\` to find valid IDs.`);
const applicationTimelineEntryIdSchema = z.string().min(1).describe("Timeline entry ID from an application response.");
const applicationDocumentKindSchema = z.enum(["resume", "cover-letter"]);
const timelineDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.");
const httpUrlSchema = z
	.string()
	.trim()
	.pipe(z.url({ protocol: /^https?$/, error: "URL must use http or https." }));
const pdfBase64Schema = z
	.string()
	.min(1)
	.refine((value) => Buffer.from(value, "base64").byteLength <= MAX_APPLICATION_DOCUMENT_BYTES, {
		message: "Decoded PDF must be 10MB or smaller.",
	})
	.describe("Base64-encoded PDF bytes. Only application/pdf documents up to 10MB are accepted.");

const applicationMutableFieldsSchema = {
	company: z.string().min(1).optional().describe("Company name."),
	role: z.string().min(1).optional().describe("Role or job title."),
	status: applicationStatusSchema.optional().describe("Pipeline stage."),
	location: z.string().nullable().optional(),
	salary: z.string().nullable().optional(),
	source: z.string().nullable().optional(),
	sourceUrl: httpUrlSchema.nullable().optional(),
	jobDescription: z.string().max(20_000).nullable().optional(),
	notes: z.string().nullable().optional(),
	resumeId: z.string().nullable().optional(),
	resumeFileUrl: z.string().nullable().optional(),
	resumeFileName: z.string().nullable().optional(),
	coverLetterUrl: z.string().nullable().optional(),
	coverLetterName: z.string().nullable().optional(),
	followUpAt: z
		.string()
		.datetime({ offset: true })
		.nullable()
		.optional()
		.describe("Follow-up timestamp in ISO 8601 format."),
	followUpNote: z.string().nullable().optional(),
	contacts: z.array(contactSchema).optional(),
	tags: z.array(z.string()).optional(),
} as const;

const createApplicationSchema = z
	.object({
		...applicationMutableFieldsSchema,
		company: z.string().min(1).describe("Company name."),
		role: z.string().min(1).describe("Role or job title."),
		stageEnteredAt: timelineDateSchema.optional().describe("Initial stage date in YYYY-MM-DD format."),
	})
	.strict();

export const TOOL_META = {
	[T.listResumes]: {
		title: "List Resumes",
		description: [
			"Primary way to discover resume IDs for this account. Resumes are not listed as MCP resources;",
			"use this tool (not `resources/list`) to enumerate IDs.",
			"",
			"Returns an array of resume objects (without full resume data) containing:",
			"id, name, slug, tags, isPublic, isLocked, createdAt, updatedAt.",
			"",
			`Call this before \`${T.getResume}\`, \`${T.patchResume}\`, prompts, or \`resources/read\` with \`resume://{id}\`.`,
			"Results can be filtered by tags and sorted by last updated date, creation date, or name.",
		].join("\n"),
		inputSchema: z.object({
			tags: z
				.array(z.string())
				.optional()
				.default([])
				.describe("Filter resumes by tags. Only resumes matching ALL specified tags are returned. Default: no filter."),
			sort: z
				.enum(["lastUpdatedAt", "createdAt", "name"])
				.optional()
				.default("lastUpdatedAt")
				.describe("Sort order for results. Default: lastUpdatedAt."),
		}),
		annotations: READ_IDEMPOTENT,
	},
	[T.listResumeTags]: {
		title: "List Resume Tags",
		description: [
			"Returns a sorted list of every distinct tag used across your resumes.",
			"Useful for choosing tag filters when calling list tools or keeping naming consistent.",
		].join("\n"),
		inputSchema: z.object({}),
		annotations: READ_IDEMPOTENT,
	},
	[T.getResume]: {
		title: "Read Resume",
		description: [
			"Get the full data of a specific resume by its ID.",
			"",
			"Returns the complete resume data as JSON, including: basics (name, headline, email, phone,",
			"location, website), summary, picture settings, all sections (experience, education, skills,",
			"projects, etc.), custom sections, and metadata (template, layout, typography, colors).",
			"",
			`Use \`${T.listResumes}\` first to find valid IDs.`,
			"The `resume://_meta/schema` resource describes the full data structure for JSON Patch paths.",
		].join("\n"),
		inputSchema: z.object({ id: resumeIdSchema }),
		annotations: READ_IDEMPOTENT,
	},
	[T.downloadResumePdf]: {
		title: "Download Resume PDF",
		description: [
			"Create a short-lived authenticated URL for downloading a resume or its visible cover letter as a PDF.",
			"The URL expires in 10 minutes and should be used immediately.",
			"Set target to `cover-letter` to export the visible cover letter separately; omit it (or use `resume`) for the resume.",
			"Returns JSON containing: resumeId, target, name, downloadUrl, expiresAt, expiresInSeconds, contentType.",
			`Use \`${T.listResumes}\` first to find valid IDs.`,
		].join("\n"),
		inputSchema: z.object({
			id: resumeIdSchema,
			target: z
				.enum(["resume", "cover-letter"])
				.optional()
				.default("resume")
				.describe("Document to export. Default: resume."),
		}),
		annotations: READ_NON_IDEMPOTENT,
	},
	[T.createResume]: {
		title: "Create Resume",
		description: [
			"Create a new, empty resume with a name and URL-friendly slug.",
			"",
			"Returns the ID of the newly created resume.",
			"Set `withSampleData` to true to pre-fill with example content (useful for testing).",
			`After creating, use \`${T.getResume}\` to view or \`${T.patchResume}\` to populate it.`,
		].join("\n"),
		inputSchema: z.object({
			name: z.string().min(1).max(64).describe("Display name for the resume (e.g. 'Software Engineer 2026')"),
			slug: z
				.string()
				.min(1)
				.max(64)
				.describe("URL-friendly slug, must be unique across your resumes (e.g. 'software-engineer-2026')"),
			tags: z
				.array(z.string())
				.optional()
				.default([])
				.describe("Tags to categorize the resume (e.g. ['tech', 'senior'])"),
			withSampleData: z.boolean().optional().default(false).describe("Pre-fill with sample data. Default: false."),
		}),
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.importResume]: {
		title: "Import Resume",
		description: [
			"Create a new resume from a full ResumeData JSON object (e.g. an exported file from Reactive Resume).",
			"A random name and slug are assigned automatically, like the web importer.",
			`For small edits to an existing resume, prefer \`${T.patchResume}\` instead of re-importing.`,
			"Large payloads may exceed MCP client message limits; in that case, use the web UI or the HTTP API.",
		].join("\n"),
		inputSchema: z.object({
			data: z
				.unknown()
				.describe("Complete ResumeData JSON (same shape as `read_resume` body or `resume://_meta/schema`)."),
		}),
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.duplicateResume]: {
		title: "Duplicate Resume",
		description: [
			"Create a copy of an existing resume with all its data.",
			"",
			"Returns the ID of the newly duplicated resume.",
			"You must provide a new name and slug for the copy.",
			"Useful for creating job-specific variants of a base resume.",
		].join("\n"),
		inputSchema: z.object({
			id: resumeIdSchema.describe("ID of the resume to duplicate"),
			name: z.string().min(1).max(64).describe("Name for the duplicate"),
			slug: z.string().min(1).max(64).describe("URL-friendly slug for the duplicate (must be unique)"),
			tags: z.array(z.string()).optional().default([]).describe("Tags for the duplicate"),
		}),
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.patchResume]: {
		title: "Apply Resume Patch",
		description: [
			"Apply JSON Patch (RFC 6902) operations to partially update a resume's data.",
			"",
			`This is the primary way to edit resume content. Use \`${T.getResume}\` first to inspect the`,
			"current structure, and `resume://_meta/schema` to understand valid paths and types.",
			"",
			"Supported operations: add, remove, replace, move, copy, test.",
			"Can remove or overwrite existing content; edits to a public resume change its published content.",
			"",
			"Common path examples:",
			"  /basics/name                          — Change the name",
			"  /basics/headline                      — Change the headline",
			"  /summary/content                      — Replace summary (HTML string)",
			"  /sections/experience/items/-           — Append a new experience item",
			"  /sections/experience/items/0/company   — Update first experience's company",
			"  /sections/skills/items/-               — Append a new skill",
			"  /metadata/template                     — Change the template (e.g. 'azurill', 'bronzor', 'onyx')",
			"  /metadata/design/colors/primary        — Change the primary color (rgba string)",
			"  /sections/interests/hidden              — Hide/show a section",
			"",
			"Important: HTML content fields (description, summary.content) must use valid HTML.",
			"New items must include a valid UUID as `id` and `hidden: false`.",
			`Locked resumes cannot be patched; use \`${T.unlockResume}\` first.`,
		].join("\n"),
		inputSchema: z.object({
			id: resumeIdSchema,
			operations: resumePatchOperationsSchema,
		}),
		annotations: { ...WRITE_NON_IDEMPOTENT, destructiveHint: true, openWorldHint: true },
	},
	[T.updateResume]: {
		title: "Update Resume (metadata)",
		description: [
			"Update resume metadata only: display name, URL slug, tags, and/or public visibility.",
			"Does not change section content; use JSON Patch via the patch tool for body edits.",
			`Locked resumes cannot be updated; use \`${T.unlockResume}\` first.`,
			"Password protection cannot be set or removed via MCP; use the web app for that.",
			"",
			"Always returns your canonical share URL (`{app}/{username}/{slug}`). Anonymous viewers can use it only when `isPublic` is true; password protection from the web app still applies.",
		].join("\n"),
		inputSchema: z.object({
			id: resumeIdSchema,
			name: z.string().min(1).max(64).optional().describe("Display name for the resume."),
			slug: z.string().min(1).max(64).optional().describe("URL-friendly slug; must stay unique among your resumes."),
			tags: z.array(z.string()).optional().describe("Replace the resume's tags (omit to leave unchanged)."),
			isPublic: z
				.boolean()
				.optional()
				.describe(
					"When true, anyone with the link can view the public resume (subject to password if set in the app).",
				),
		}),
		annotations: { ...WRITE_NON_IDEMPOTENT, destructiveHint: true, openWorldHint: true },
	},
	[T.deleteResume]: {
		title: "Delete Resume",
		description: [
			"Permanently delete a resume and all its associated files (screenshots, PDFs), removing public access if published.",
			"",
			`This action is IRREVERSIBLE. Locked resumes cannot be deleted; use \`${T.unlockResume}\` first.`,
			`Consider using \`${T.duplicateResume}\` to create a backup before deleting.`,
		].join("\n"),
		inputSchema: z.object({ id: resumeIdSchema }),
		annotations: { ...WRITE_DESTRUCTIVE, openWorldHint: true },
	},
	[T.lockResume]: {
		title: "Lock Resume",
		description: [
			"Lock a resume to prevent any modifications.",
			"",
			`When locked, a resume cannot be edited (${T.patchResume}, ${T.updateResume}) or deleted.`,
			"Useful for protecting finalized resumes from accidental changes.",
			`Use \`${T.unlockResume}\` to re-enable editing.`,
		].join("\n"),
		inputSchema: z.object({ id: resumeIdSchema }),
		annotations: WRITE_IDEMPOTENT,
	},
	[T.unlockResume]: {
		title: "Unlock Resume",
		description: "Unlock a previously locked resume, re-enabling edits, patches, and deletion.",
		inputSchema: z.object({ id: resumeIdSchema }),
		annotations: WRITE_IDEMPOTENT,
	},
	[T.getResumeStatistics]: {
		title: "Get Resume Statistics",
		description: [
			"Get view and download statistics for a resume.",
			"",
			"Returns: isPublic (boolean), views (count), downloads (count),",
			"lastViewedAt (timestamp or null), lastDownloadedAt (timestamp or null).",
		].join("\n"),
		inputSchema: z.object({ id: resumeIdSchema }),
		annotations: READ_IDEMPOTENT,
	},
	[T.listApplications]: {
		title: "List Applications",
		description:
			"List job applications for the authenticated account, including contacts, notes, document URLs, and timeline. Use this before reading or updating existing applications.",
		inputSchema: z.object({
			status: applicationStatusSchema.optional(),
			tags: z.array(z.string()).optional().default([]),
			includeArchived: z.boolean().optional().default(false),
		}),
		annotations: READ_IDEMPOTENT,
	},
	[T.readApplication]: {
		title: "Read Application",
		description: "Read one full job application, including contacts, document URLs, follow-up details, and timeline.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: READ_IDEMPOTENT,
	},
	[T.listApplicationTags]: {
		title: "List Application Tags",
		description: "Return every distinct tag used across job applications.",
		inputSchema: z.object({}),
		annotations: READ_IDEMPOTENT,
	},
	[T.getApplicationStats]: {
		title: "Get Application Stats",
		description: "Return aggregate application counts by pipeline stage and source.",
		inputSchema: z.object({}),
		annotations: READ_IDEMPOTENT,
	},
	[T.createApplication]: {
		title: "Create Application",
		description: "Create a tracked job application. Company and role are required.",
		inputSchema: createApplicationSchema,
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.updateApplication]: {
		title: "Update Application",
		description:
			"Update application fields, move stages, archive/unarchive, edit contacts, follow-up, tags, or linked resume. Provided fields replace existing values, including contact and tag lists.",
		inputSchema: z.object({
			id: applicationIdSchema,
			...applicationMutableFieldsSchema,
			archived: z.boolean().optional().describe("Whether the application is hidden from active views."),
		}),
		annotations: WRITE_DESTRUCTIVE,
	},
	[T.addApplicationNote]: {
		title: "Add Application Note",
		description: "Append a free-text note to an application's timeline.",
		inputSchema: z.object({
			id: applicationIdSchema,
			text: z.string().min(1),
			date: timelineDateSchema.optional().describe("Optional note date in YYYY-MM-DD format."),
		}),
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.updateApplicationTimelineEntry]: {
		title: "Update Application Timeline Entry",
		description: "Update a timeline entry date, or note text for note entries.",
		inputSchema: z
			.object({
				id: applicationIdSchema,
				entryId: applicationTimelineEntryIdSchema,
				date: timelineDateSchema.optional().describe("Replacement row date in YYYY-MM-DD format."),
				text: z.string().min(1).optional().describe("Replacement note text. Only note entries can change text."),
			})
			.refine((value) => value.date !== undefined || value.text !== undefined, "Provide date or text to update."),
		annotations: WRITE_DESTRUCTIVE,
	},
	[T.deleteApplicationTimelineEntry]: {
		title: "Delete Application Timeline Entry",
		description: "Delete a note or older stage entry. The current stage entry cannot be deleted.",
		inputSchema: z.object({ id: applicationIdSchema, entryId: applicationTimelineEntryIdSchema }),
		annotations: WRITE_DESTRUCTIVE,
	},
	[T.deleteApplication]: {
		title: "Delete Application",
		description:
			"Permanently delete one job application and its owned uploaded documents that no remaining application references, removing those public file URLs.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: { ...WRITE_DESTRUCTIVE, openWorldHint: true },
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
		annotations: WRITE_DESTRUCTIVE,
	},
	[T.bulkDeleteApplications]: {
		title: "Bulk Delete Applications",
		description:
			"Permanently delete multiple applications and their owned uploaded documents that no remaining application references, removing those public file URLs.",
		inputSchema: z.object({ ids: z.array(z.string()).min(1) }),
		annotations: { ...WRITE_DESTRUCTIVE, openWorldHint: true },
	},
	[T.importApplications]: {
		title: "Import Applications",
		description: "Bulk-create application rows parsed from CSV or another source. Maximum 500 items.",
		inputSchema: z.object({ items: z.array(createApplicationSchema).min(1).max(500) }),
		annotations: WRITE_NON_IDEMPOTENT,
	},
	[T.attachApplicationDocument]: {
		title: "Attach Application Document",
		description:
			"Upload and attach a resume or cover-letter PDF using base64-encoded PDF bytes (maximum 10MB). Anyone with the resulting file URL can download it without signing in. Replaces the existing attachment of that kind and deletes its owned file if no other application references it. Does not send the document to an employer.",
		inputSchema: z.object({
			id: applicationIdSchema,
			kind: applicationDocumentKindSchema,
			fileName: z.string().min(1),
			contentType: z.literal("application/pdf"),
			dataBase64: pdfBase64Schema,
		}),
		annotations: { ...WRITE_NON_IDEMPOTENT, destructiveHint: true, openWorldHint: true },
	},
	[T.removeApplicationDocument]: {
		title: "Remove Application Document",
		description:
			"Clear a resume or cover-letter attachment and delete its owned uploaded file if no other application references it, removing access through its public file URL.",
		inputSchema: z.object({ id: applicationIdSchema, kind: applicationDocumentKindSchema }),
		annotations: { ...WRITE_DESTRUCTIVE, openWorldHint: true },
	},
	[T.autofillApplicationFromJob]: {
		title: "Autofill Application From Job",
		description:
			"Send a pasted job posting to your configured AI provider to extract company, role, location, and salary. Requires an enabled, tested default AI provider. Returns suggestions without saving an application or fetching a job URL.",
		inputSchema: z.object({ jobDescription: z.string().trim().min(1).max(20_000) }),
		annotations: { ...READ_NON_IDEMPOTENT, openWorldHint: true },
	},
	[T.scoreApplicationMatch]: {
		title: "Score Application Match",
		description:
			"Send the full linked resume and job description to your configured AI provider to score their match. Requires an enabled, tested default AI provider, a linked resume, and a job description. Overwrites the application's saved match score and AI metadata.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: { ...WRITE_NON_IDEMPOTENT, destructiveHint: true, openWorldHint: true },
	},
	[T.tailorResumeForApplication]: {
		title: "Tailor Resume For Application",
		description:
			"Send the full linked resume and job description to your configured AI provider to rewrite the summary in a new private resume copy. Requires an enabled, tested default AI provider, a linked resume, and a job description. Replaces the application's resume link with the new copy and adds a timeline note; the original resume is unchanged.",
		inputSchema: z.object({ id: applicationIdSchema }),
		annotations: { ...WRITE_NON_IDEMPOTENT, destructiveHint: true, openWorldHint: true },
	},
	[T.draftApplicationMessage]: {
		title: "Draft Application Message",
		description:
			"Send application context and the full linked resume, when available, to your configured AI provider to draft a cover letter or recruiter follow-up. Requires an enabled, tested default AI provider. Cover-letter mode saves a new cover letter and returns text plus coverLetterId; follow-up mode returns text without saving it. Neither mode sends a message to a recruiter.",
		inputSchema: z.object({ id: applicationIdSchema, kind: z.enum(["cover-letter", "follow-up"]) }),
		annotations: { ...WRITE_NON_IDEMPOTENT, openWorldHint: true },
	},
} as const;
