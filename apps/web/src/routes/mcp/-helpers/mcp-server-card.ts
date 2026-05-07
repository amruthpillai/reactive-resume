import { toJsonSchemaCompat } from "@modelcontextprotocol/sdk/server/zod-json-schema-compat.js";
import z from "zod";
import { jsonPatchOperationSchema } from "@reactive-resume/utils/resume/patch";
import { MCP_TOOL_NAME as T } from "./mcp-tool-names";
import { TOOL_ANNOTATIONS } from "./tool-annotations";

const resumeId = z.string().min(1).describe("Resume ID.");

/**
 * Static MCP server card (SEP-1649 / well-known `mcp/server-card.json`).
 * Kept in sync with `registerTools`, `registerResources`, and `registerPrompts`.
 *
 * Some registries only surface the `resources` array in their UI, not `resourceTemplates`.
 * The parameterized resume URI is therefore duplicated here so discovery matches the live template.
 */
export function buildMcpServerCard(appVersion: string) {
	const tools = [
		{
			name: T.listResumes,
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
			inputSchema: toJsonSchemaCompat(
				z.object({
					tags: z
						.array(z.string())
						.optional()
						.default([])
						.describe(
							"Filter resumes by tags. Only resumes matching ALL specified tags are returned. Default: no filter.",
						),
					sort: z
						.enum(["lastUpdatedAt", "createdAt", "name"])
						.optional()
						.default("lastUpdatedAt")
						.describe("Sort order for results. Default: lastUpdatedAt."),
				}),
			),
			annotations: TOOL_ANNOTATIONS[T.listResumes],
		},
		{
			name: T.listResumeTags,
			title: "List Resume Tags",
			description: [
				"Returns a sorted list of every distinct tag used across your resumes.",
				"Useful for choosing tag filters when calling list tools or keeping naming consistent.",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(z.object({})),
			annotations: TOOL_ANNOTATIONS[T.listResumeTags],
		},
		{
			name: T.getResume,
			title: "Get Resume",
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
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.getResume],
		},
		{
			name: T.getResumeAnalysis,
			title: "Get Resume Analysis",
			description: [
				"Returns the latest saved AI analysis for a resume (scorecard, strengths, suggestions), if any.",
				"Analyses are created from the Reactive Resume web app AI flow, not from MCP.",
				`Returns JSON or a short message if none exists. Use \`${T.listResumes}\` to find resume IDs.`,
			].join("\n"),
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.getResumeAnalysis],
		},
		{
			name: T.createResume,
			title: "Create Resume",
			description: [
				"Create a new, empty resume with a name and URL-friendly slug.",
				"",
				"Returns the ID of the newly created resume.",
				"Set `withSampleData` to true to pre-fill with example content (useful for testing).",
				`After creating, use \`${T.getResume}\` to view or \`${T.patchResume}\` to populate it.`,
			].join("\n"),
			inputSchema: toJsonSchemaCompat(
				z.object({
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
			),
			annotations: TOOL_ANNOTATIONS[T.createResume],
		},
		{
			name: T.importResume,
			title: "Import Resume",
			description: [
				"Create a new resume from a full ResumeData JSON object (e.g. an exported file from Reactive Resume).",
				"A random name and slug are assigned automatically, like the web importer.",
				`For small edits to an existing resume, prefer \`${T.patchResume}\` instead of re-importing.`,
				"Large payloads may exceed MCP client message limits — in that case, use the web UI or the HTTP API.",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(
				z.object({
					data: z
						.unknown()
						.describe("Complete ResumeData JSON (same shape as get_resume output or `resume://_meta/schema`)."),
				}),
			),
			annotations: TOOL_ANNOTATIONS[T.importResume],
		},
		{
			name: T.duplicateResume,
			title: "Duplicate Resume",
			description: [
				"Create a copy of an existing resume with all its data.",
				"",
				"Returns the ID of the newly duplicated resume.",
				"You must provide a new name and slug for the copy.",
				"Useful for creating job-specific variants of a base resume.",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(
				z.object({
					id: resumeId.describe("ID of the resume to duplicate"),
					name: z.string().min(1).max(64).describe("Name for the duplicate"),
					slug: z.string().min(1).max(64).describe("URL-friendly slug for the duplicate (must be unique)"),
					tags: z.array(z.string()).optional().default([]).describe("Tags for the duplicate"),
				}),
			),
			annotations: TOOL_ANNOTATIONS[T.duplicateResume],
		},
		{
			name: T.patchResume,
			title: "Patch Resume",
			description: [
				"Apply JSON Patch (RFC 6902) operations to partially update a resume's data.",
				"",
				`This is the primary way to edit resume content. Use \`${T.getResume}\` first to inspect the`,
				"current structure, and `resume://_meta/schema` to understand valid paths and types.",
				"",
				"Supported operations: add, remove, replace, move, copy, test.",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(
				z.object({
					id: resumeId,
					operations: z
						.array(jsonPatchOperationSchema)
						.min(1)
						.describe("Array of JSON Patch (RFC 6902) operations to apply"),
				}),
			),
			annotations: TOOL_ANNOTATIONS[T.patchResume],
		},
		{
			name: T.updateResume,
			title: "Update Resume (metadata)",
			description: [
				"Update resume metadata only: display name, URL slug, tags, and/or public visibility.",
				"Does not change section content — use JSON Patch via the patch tool for body edits.",
				`Locked resumes cannot be updated; use \`${T.unlockResume}\` first.`,
				"Password protection cannot be set or removed via MCP; use the web app for that.",
				"",
				"Always returns your canonical share URL (`{app}/{username}/{slug}`). Anonymous viewers can use it only when `isPublic` is true; password protection from the web app still applies.",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(
				z.object({
					id: resumeId,
					name: z.string().min(1).max(64).optional().describe("Display name for the resume."),
					slug: z
						.string()
						.min(1)
						.max(64)
						.optional()
						.describe("URL-friendly slug; must stay unique among your resumes."),
					tags: z.array(z.string()).optional().describe("Replace the resume's tags (omit to leave unchanged)."),
					isPublic: z
						.boolean()
						.optional()
						.describe(
							"When true, anyone with the link can view the public resume (subject to password if set in the app).",
						),
				}),
			),
			annotations: TOOL_ANNOTATIONS[T.updateResume],
		},
		{
			name: T.deleteResume,
			title: "Delete Resume",
			description: [
				"Permanently delete a resume and all its associated files (screenshots, PDFs).",
				"",
				`This action is IRREVERSIBLE. Locked resumes cannot be deleted — use \`${T.unlockResume}\` first.`,
				`Consider using \`${T.duplicateResume}\` to create a backup before deleting.`,
			].join("\n"),
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.deleteResume],
		},
		{
			name: T.lockResume,
			title: "Lock Resume",
			description: [
				"Lock a resume to prevent any modifications.",
				"",
				`When locked, a resume cannot be edited (${T.patchResume}, ${T.updateResume}), or deleted.`,
				`Use \`${T.unlockResume}\` to re-enable editing.`,
			].join("\n"),
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.lockResume],
		},
		{
			name: T.unlockResume,
			title: "Unlock Resume",
			description: "Unlock a previously locked resume, re-enabling edits, patches, and deletion.",
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.unlockResume],
		},
		{
			name: T.getResumeStatistics,
			title: "Get Resume Statistics",
			description: [
				"Get view and download statistics for a resume.",
				"",
				"Returns: isPublic (boolean), views (count), downloads (count),",
				"lastViewedAt (timestamp or null), lastDownloadedAt (timestamp or null).",
			].join("\n"),
			inputSchema: toJsonSchemaCompat(z.object({ id: resumeId })),
			annotations: TOOL_ANNOTATIONS[T.getResumeStatistics],
		},
	];

	const prompts = [
		{
			name: "build_resume",
			title: "Build Resume",
			description: "Guide the user step-by-step through building a resume from scratch, section by section.",
			arguments: [{ name: "id", description: "Resume ID.", required: true }],
		},
		{
			name: "improve_resume",
			title: "Improve Resume",
			description: "Review resume content and suggest concrete improvements to wording, impact, and structure.",
			arguments: [{ name: "id", description: "Resume ID.", required: true }],
		},
		{
			name: "review_resume",
			title: "Review Resume",
			description:
				"Get a structured, professional critique with a scorecard and prioritized recommendations. Read-only — no changes are made.",
			arguments: [{ name: "id", description: "Resume ID.", required: true }],
		},
	];

	const resources = [
		{
			name: "resume-schema",
			title: "Resume Data JSON Schema",
			uri: "resume://_meta/schema",
			description: [
				"The JSON Schema describing the complete resume data structure.",
				"Reference when generating JSON Patch operations so paths and value types are valid.",
			].join(" "),
			mimeType: "application/json",
		},
		{
			name: "resume",
			title: "Resume Data",
			uri: "resume://{id}",
			description: [
				"Full resume JSON for one resume. Substitute a real ID for `{id}` (UUID from your account).",
				"On the wire this is a resource template (`resources/templates/list`), not a row in `resources/list`.",
				`Discover IDs with \`${T.listResumes}\`; read via \`resources/read\` on e.g. \`resume://<id>\` or use \`${T.getResume}\`.`,
			].join(" "),
			mimeType: "application/json",
		},
	];

	const resourceTemplates = [
		{
			name: "resume",
			title: "Resume Data",
			uriTemplate: "resume://{id}",
			description: "Full resume data as JSON. Discover IDs with the list tool; read via resources/read or get_resume.",
			mimeType: "application/json",
		},
	];

	return {
		/**
		 * Optional session fields for gateways. OAuth is primary; API key is optional for clients that support custom headers.
		 */
		configurationSchema: {
			type: "object",
			properties: {
				apiKey: {
					type: "string",
					title: "API key",
					description:
						"Optional. Create a key under Account → API Keys. Forwarded as the x-api-key header when not using OAuth.",
					"x-from": { header: "x-api-key" },
				},
			},
		},
		serverInfo: {
			name: "reactive-resume",
			version: appVersion,
			title: "Reactive Resume",
			websiteUrl: "https://rxresu.me",
			description:
				"Reactive Resume is a free and open-source resume builder. Use this MCP server to interact with your resume using an LLM of your choice.",
			icons: [
				{ src: "https://rxresu.me/icon/light.svg", mimeType: "image/svg+xml", theme: "light" as const },
				{ src: "https://rxresu.me/icon/dark.svg", mimeType: "image/svg+xml", theme: "dark" as const },
			],
		},
		tools,
		prompts,
		resources,
		resourceTemplates,
		authentication: {
			required: true,
			schemes: ["oauth2", "bearer"],
		},
	};
}
