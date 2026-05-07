import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { getRequestHeaders } from "@tanstack/react-start/server";
import z from "zod";
import { resolveUserFromRequestHeaders } from "@reactive-resume/api/context";
import { env } from "@reactive-resume/env/server";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { jsonPatchOperationSchema } from "@reactive-resume/utils/resume/patch";
import { client } from "@/libs/orpc/client";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_ANNOTATIONS } from "./tool-annotations";

export { MCP_TOOL_NAME } from "./mcp-tool-names";

type PatchOperation = z.infer<typeof jsonPatchOperationSchema>;

// ── Shared Helpers ──────────────────────────────────────────────

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function errorHint(error: unknown): string {
	const msg = errorMessage(error);
	const { unlockResume, listResumes, getResume } = MCP_TOOL_NAME;
	if (msg.includes("slug already exists")) return "\n\nHint: The slug is already in use. Try a different one.";
	if (msg.includes("locked")) return `\n\nHint: This resume is locked. Use \`${unlockResume}\` first.`;
	if (msg.includes("404") || msg.includes("not found"))
		return `\n\nHint: Resume not found. Use \`${listResumes}\` to find valid IDs.`;
	if (msg.includes("400"))
		return `\n\nHint: Invalid request. Check the input parameters or use \`${getResume}\` to inspect the resume structure.`;
	if (msg.includes("403"))
		return `\n\nHint: Permission denied. The resume may be locked — use \`${unlockResume}\` first.`;
	return "";
}

/**
 * Wraps an async tool handler with consistent error formatting.
 * On success, returns the handler's result directly.
 * On failure, returns `{ isError: true, content: [{ type: "text", text }] }` with actionable hints.
 */
function withErrorHandling<T>(label: string, handler: (params: T) => Promise<CallToolResult>) {
	return async (params: T): Promise<CallToolResult> => {
		try {
			return await handler(params);
		} catch (error) {
			return {
				isError: true,
				content: [{ type: "text", text: `Error ${label}: ${errorMessage(error)}${errorHint(error)}` }],
			};
		}
	};
}

function text(value: string): CallToolResult {
	return { content: [{ type: "text", text: value }] };
}

function buildResumeShareUrl(username: string, slug: string): string {
	const base = env.APP_URL.replace(/\/$/, "");
	return `${base}/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;
}

function resumeShareUrlNotes(input: { isPublic: boolean; hasPassword: boolean }): string {
	const lines = [
		"Anyone can open this link without signing in only when the resume is public (`isPublic: true`).",
		input.isPublic
			? "This resume is currently public."
			: "This resume is currently private; the URL is still your canonical share link if you make it public later.",
	];
	if (input.hasPassword)
		lines.push(
			"Password protection is enabled in the web app; visitors may need that password before content is shown.",
		);
	return lines.join("\n");
}

// ── Shared Zod Fragments ────────────────────────────────────────

const T = MCP_TOOL_NAME;

const resumeIdSchema = z.string().min(1).describe(`Resume ID. Use \`${T.listResumes}\` to find valid IDs.`);

// ── Tool Registration ───────────────────────────────────────────

export function registerTools(server: McpServer) {
	// ── List Resumes ──────────────────────────────────────────────
	server.registerTool(
		T.listResumes,
		{
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
					.describe(
						"Filter resumes by tags. Only resumes matching ALL specified tags are returned. Default: no filter.",
					),
				sort: z
					.enum(["lastUpdatedAt", "createdAt", "name"])
					.optional()
					.default("lastUpdatedAt")
					.describe("Sort order for results. Default: lastUpdatedAt."),
			}),
			annotations: TOOL_ANNOTATIONS[T.listResumes],
		},
		withErrorHandling(
			"listing resumes",
			async ({ tags, sort }: { tags: string[]; sort: "lastUpdatedAt" | "createdAt" | "name" }) => {
				const resumes = await client.resume.list({ tags, sort });

				if (resumes.length === 0) return text(`No resumes found. Use \`${T.createResume}\` to create one.`);

				return text(JSON.stringify(resumes, null, 2));
			},
		),
	);

	// ── List Resume Tags ──────────────────────────────────────────
	server.registerTool(
		T.listResumeTags,
		{
			title: "List Resume Tags",
			description: [
				"Returns a sorted list of every distinct tag used across your resumes.",
				"Useful for choosing tag filters when calling list tools or keeping naming consistent.",
			].join("\n"),
			inputSchema: z.object({}),
			annotations: TOOL_ANNOTATIONS[T.listResumeTags],
		},
		withErrorHandling("listing resume tags", async () => {
			const tags = await client.resume.tags.list();

			if (tags.length === 0) return text("No tags in use yet. Add tags when creating or updating a resume.");

			return text(JSON.stringify(tags, null, 2));
		}),
	);

	// ── Get Resume ────────────────────────────────────────────────
	server.registerTool(
		T.getResume,
		{
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
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.getResume],
		},
		withErrorHandling("getting resume", async ({ id }: { id: string }) => {
			const resume = await client.resume.getById({ id });

			return text(JSON.stringify(resume.data, null, 2));
		}),
	);

	// ── Get Resume Analysis ───────────────────────────────────────
	server.registerTool(
		T.getResumeAnalysis,
		{
			title: "Get Resume Analysis",
			description: [
				"Returns the latest saved AI analysis for a resume (scorecard, strengths, suggestions), if any.",
				"Analyses are created from the Reactive Resume web app AI flow, not from MCP.",
				`Returns JSON or a short message if none exists. Use \`${T.listResumes}\` to find resume IDs.`,
			].join("\n"),
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.getResumeAnalysis],
		},
		withErrorHandling("getting resume analysis", async ({ id }: { id: string }) => {
			const analysis = await client.resume.analysis.getById({ id });

			if (!analysis) return text("No saved analysis for this resume yet.");

			return text(JSON.stringify(analysis, null, 2));
		}),
	);

	// ── Create Resume ─────────────────────────────────────────────
	server.registerTool(
		T.createResume,
		{
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
			annotations: TOOL_ANNOTATIONS[T.createResume],
		},
		withErrorHandling(
			"creating resume",
			async ({
				name,
				slug,
				tags,
				withSampleData,
			}: {
				name: string;
				slug: string;
				tags: string[];
				withSampleData: boolean;
			}) => {
				const id = await client.resume.create({ name, slug, tags, withSampleData });

				return text(
					`Created resume "${name}" (ID: ${id}) with slug "${slug}".${withSampleData ? " Pre-filled with sample data." : ""}\n\nNext steps: Use \`${T.getResume}\` to view it, or \`${T.patchResume}\` to start editing.`,
				);
			},
		),
	);

	// ── Import Resume ─────────────────────────────────────────────
	server.registerTool(
		T.importResume,
		{
			title: "Import Resume",
			description: [
				"Create a new resume from a full ResumeData JSON object (e.g. an exported file from Reactive Resume).",
				"A random name and slug are assigned automatically, like the web importer.",
				`For small edits to an existing resume, prefer \`${T.patchResume}\` instead of re-importing.`,
				"Large payloads may exceed MCP client message limits — in that case, use the web UI or the HTTP API.",
			].join("\n"),
			inputSchema: z.object({
				data: z
					.unknown()
					.describe(
						"Complete ResumeData JSON (same shape as `reactive_resume_get_resume` body or `resume://_meta/schema`).",
					),
			}),
			annotations: TOOL_ANNOTATIONS[T.importResume],
		},
		withErrorHandling("importing resume", async ({ data }: { data: unknown }) => {
			const parsed = resumeDataSchema.safeParse(data);
			if (!parsed.success)
				return {
					isError: true,
					content: [
						{
							type: "text",
							text: `Invalid ResumeData: ${parsed.error.message}\n\nHint: Ensure the JSON matches the schema at resume://_meta/schema`,
						},
					],
				};

			const id = await client.resume.import({ data: parsed.data });

			return text(
				`Imported resume (ID: ${id}).\n\nNext steps: Use \`${T.getResume}\` to inspect metadata (name/slug were auto-generated), or \`${T.updateResume}\` / \`${T.patchResume}\` to adjust.`,
			);
		}),
	);

	// ── Duplicate Resume ──────────────────────────────────────────
	server.registerTool(
		T.duplicateResume,
		{
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
			annotations: TOOL_ANNOTATIONS[T.duplicateResume],
		},
		withErrorHandling(
			"duplicating resume",
			async ({ id, name, slug, tags }: { id: string; name: string; slug: string; tags: string[] }) => {
				const newId = await client.resume.duplicate({ id, name, slug, tags });

				return text(
					`Duplicated resume as "${name}" (ID: ${newId}) with slug "${slug}".\n\nNext steps: Use \`${T.getResume}\` to view it, or \`${T.patchResume}\` to customize.`,
				);
			},
		),
	);

	// ── Patch Resume ──────────────────────────────────────────────
	server.registerTool(
		T.patchResume,
		{
			title: "Patch Resume",
			description: [
				"Apply JSON Patch (RFC 6902) operations to partially update a resume's data.",
				"",
				`This is the primary way to edit resume content. Use \`${T.getResume}\` first to inspect the`,
				"current structure, and `resume://_meta/schema` to understand valid paths and types.",
				"",
				"Supported operations: add, remove, replace, move, copy, test.",
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
				`Locked resumes cannot be patched — use \`${T.unlockResume}\` first.`,
			].join("\n"),
			inputSchema: z.object({
				id: resumeIdSchema,
				operations: z
					.array(jsonPatchOperationSchema)
					.min(1)
					.describe("Array of JSON Patch (RFC 6902) operations to apply"),
			}),
			annotations: TOOL_ANNOTATIONS[T.patchResume],
		},
		withErrorHandling("patching resume", async ({ id, operations }: { id: string; operations: PatchOperation[] }) => {
			const resume = await client.resume.patch({ id, operations });
			const summary = operations.map((op) => `${op.op} ${op.path}`).join(", ");

			return text(`Applied ${operations.length} operation(s) to "${resume.name}": ${summary}`);
		}),
	);

	// ── Update Resume (metadata) ─────────────────────────────────
	server.registerTool(
		T.updateResume,
		{
			title: "Update Resume (metadata)",
			description: [
				"Update resume metadata only: display name, URL slug, tags, and/or public visibility.",
				"Does not change section content — use JSON Patch via the patch tool for body edits.",
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
			annotations: TOOL_ANNOTATIONS[T.updateResume],
		},
		withErrorHandling(
			"updating resume",
			async (params: { id: string; name?: string; slug?: string; tags?: string[]; isPublic?: boolean }) => {
				const { id, name, slug, tags, isPublic } = params;
				if (name === undefined && slug === undefined && tags === undefined && isPublic === undefined)
					throw new Error("Provide at least one of: name, slug, tags, isPublic.");

				const resume = await client.resume.update({
					id,
					...(name !== undefined ? { name } : {}),
					...(slug !== undefined ? { slug } : {}),
					...(tags !== undefined ? { tags } : {}),
					...(isPublic !== undefined ? { isPublic } : {}),
				});

				const headers = getRequestHeaders();
				const user = await resolveUserFromRequestHeaders(headers);
				const username =
					user && "username" in user && typeof (user as { username: unknown }).username === "string"
						? (user as { username: string }).username
						: "";
				const shareUrl =
					username !== ""
						? buildResumeShareUrl(username, resume.slug)
						: "(could not build share URL — missing username on account)";

				const payload = {
					id: resume.id,
					name: resume.name,
					slug: resume.slug,
					tags: resume.tags,
					isPublic: resume.isPublic,
					hasPassword: resume.hasPassword,
					shareUrl,
				};

				return text(
					[
						JSON.stringify(payload, null, 2),
						"",
						resumeShareUrlNotes({ isPublic: resume.isPublic, hasPassword: resume.hasPassword }),
					].join("\n"),
				);
			},
		),
	);

	// ── Delete Resume ─────────────────────────────────────────────
	server.registerTool(
		T.deleteResume,
		{
			title: "Delete Resume",
			description: [
				"Permanently delete a resume and all its associated files (screenshots, PDFs).",
				"",
				`This action is IRREVERSIBLE. Locked resumes cannot be deleted — use \`${T.unlockResume}\` first.`,
				`Consider using \`${T.duplicateResume}\` to create a backup before deleting.`,
			].join("\n"),
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.deleteResume],
		},
		withErrorHandling("deleting resume", async ({ id }: { id: string }) => {
			await client.resume.delete({ id });

			return text(`Successfully deleted resume (${id}) and all associated files.`);
		}),
	);

	// ── Lock Resume ───────────────────────────────────────────────
	server.registerTool(
		T.lockResume,
		{
			title: "Lock Resume",
			description: [
				"Lock a resume to prevent any modifications.",
				"",
				`When locked, a resume cannot be edited (${T.patchResume}, ${T.updateResume}), or deleted.`,
				"Useful for protecting finalized resumes from accidental changes.",
				`Use \`${T.unlockResume}\` to re-enable editing.`,
			].join("\n"),
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.lockResume],
		},
		withErrorHandling("locking resume", async ({ id }: { id: string }) => {
			await client.resume.setLocked({ id, isLocked: true });

			return text(`Resume (${id}) is now locked. It cannot be edited, patched, or deleted until unlocked.`);
		}),
	);

	// ── Unlock Resume ─────────────────────────────────────────────
	server.registerTool(
		T.unlockResume,
		{
			title: "Unlock Resume",
			description: "Unlock a previously locked resume, re-enabling edits, patches, and deletion.",
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.unlockResume],
		},
		withErrorHandling("unlocking resume", async ({ id }: { id: string }) => {
			await client.resume.setLocked({ id, isLocked: false });

			return text(`Resume (${id}) is now unlocked. It can be edited, patched, and deleted.`);
		}),
	);

	// ── Get Resume Statistics ────────────────────────────────────
	server.registerTool(
		T.getResumeStatistics,
		{
			title: "Get Resume Statistics",
			description: [
				"Get view and download statistics for a resume.",
				"",
				"Returns: isPublic (boolean), views (count), downloads (count),",
				"lastViewedAt (timestamp or null), lastDownloadedAt (timestamp or null).",
			].join("\n"),
			inputSchema: z.object({ id: resumeIdSchema }),
			annotations: TOOL_ANNOTATIONS[T.getResumeStatistics],
		},
		withErrorHandling("getting resume statistics", async ({ id }: { id: string }) => {
			const stats = await client.resume.statistics.getById({ id });

			return text(JSON.stringify(stats, null, 2));
		}),
	);
}
