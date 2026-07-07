import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { RouterClient } from "@orpc/server";
import type { resumePatchOperationsSchema } from "@reactive-resume/ai/tools/resume-tool-contracts";
import type router from "@reactive-resume/api/routers";
import type z from "zod";
import { Buffer } from "node:buffer";
import { resolveUserFromRequestHeaders } from "@reactive-resume/api/context";
import { createResumePdfDownloadUrl } from "@reactive-resume/api/features/resume/export";
import { env } from "@reactive-resume/env/server";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_META } from "./tool-meta";

export { MCP_TOOL_NAME } from "./mcp-tool-names";

type PatchOperation = z.infer<typeof resumePatchOperationsSchema>[number];

// ── Shared Helpers ───────────────���──────────────────────────────

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

function json(value: unknown): CallToolResult {
	return text(JSON.stringify(value, null, 2));
}

function fileFromBase64(input: { fileName: string; contentType: string; dataBase64: string }): File {
	if (input.contentType !== "application/pdf") throw new Error("Application documents must be PDF files.");

	const bytes = Buffer.from(input.dataBase64, "base64");
	if (bytes.length === 0) throw new Error("Application document cannot be empty.");

	return new File([bytes], input.fileName, { type: input.contentType });
}

function coerceFollowUpAt(input: Record<string, unknown>): Record<string, unknown> {
	if (!("followUpAt" in input)) return input;

	const followUpAt = input.followUpAt;
	if (followUpAt === undefined || followUpAt === null || followUpAt instanceof Date) return input;

	return { ...input, followUpAt: new Date(String(followUpAt)) };
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

// ── Shared Zod Fragments ─────────────��──────────────────────────

const T = MCP_TOOL_NAME;

// ── Tool Registration ────────────────────���──────────────────────

export function registerTools(server: McpServer, client: RouterClient<typeof router>, requestHeaders: Headers) {
	// ── List Resumes ──────────────────���───────────────────────────
	server.registerTool(
		T.listResumes,
		TOOL_META[T.listResumes],
		withErrorHandling(
			"listing resumes",
			async ({ tags, sort }: { tags: string[]; sort: "lastUpdatedAt" | "createdAt" | "name" }) => {
				const resumes = await client.resume.list({ tags, sort });

				if (resumes.length === 0) return text(`No resumes found. Use \`${T.createResume}\` to create one.`);

				return text(JSON.stringify(resumes, null, 2));
			},
		),
	);

	// ── List Resume Tags ───────────────────���──────────────────────
	server.registerTool(
		T.listResumeTags,
		TOOL_META[T.listResumeTags],
		withErrorHandling("listing resume tags", async () => {
			const tags = await client.resume.tags.list();

			if (tags.length === 0) return text("No tags in use yet. Add tags when creating or updating a resume.");

			return text(JSON.stringify(tags, null, 2));
		}),
	);

	// ── Read Resume ────────────────���──────────────────────────────
	server.registerTool(
		T.getResume,
		TOOL_META[T.getResume],
		withErrorHandling("getting resume", async ({ id }: { id: string }) => {
			const resume = await client.resume.getById({ id });

			return text(JSON.stringify(resume.data, null, 2));
		}),
	);

	// ── Get Resume Analysis ────────────────────���──────────────────
	server.registerTool(
		T.getResumeAnalysis,
		TOOL_META[T.getResumeAnalysis],
		withErrorHandling("getting resume analysis", async ({ id }: { id: string }) => {
			const analysis = await client.resume.analysis.getById({ id });

			if (!analysis) return text("No saved analysis for this resume yet.");

			return text(JSON.stringify(analysis, null, 2));
		}),
	);

	// ── Download Resume PDF ────────��──────────────────────────────
	server.registerTool(
		T.downloadResumePdf,
		TOOL_META[T.downloadResumePdf],
		withErrorHandling("creating PDF download URL", async ({ id }: { id: string }) => {
			const resume = await client.resume.getById({ id });
			const user = await resolveUserFromRequestHeaders(requestHeaders);
			if (!user) throw new Error("Unauthorized");

			const signedUrl = createResumePdfDownloadUrl({ resumeId: id, userId: user.id });

			return text(
				JSON.stringify(
					{
						resumeId: id,
						name: resume.name,
						downloadUrl: signedUrl.url,
						expiresAt: signedUrl.expiresAt,
						expiresInSeconds: signedUrl.expiresInSeconds,
						contentType: "application/pdf",
					},
					null,
					2,
				),
			);
		}),
	);

	// ── Create Resume ─────────────────────────────────────────────
	server.registerTool(
		T.createResume,
		TOOL_META[T.createResume],
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

	// ── Import Resume ─────────────��───────────────────────────────
	server.registerTool(
		T.importResume,
		TOOL_META[T.importResume],
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

	// ── Duplicate Resume ────────────────────���─────────────────────
	server.registerTool(
		T.duplicateResume,
		TOOL_META[T.duplicateResume],
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

	// ── Apply Resume Patch ────────────────────────────────────────
	server.registerTool(
		T.patchResume,
		TOOL_META[T.patchResume],
		withErrorHandling("patching resume", async ({ id, operations }: { id: string; operations: PatchOperation[] }) => {
			const resume = await client.resume.patch({ id, operations });
			const summary = operations.map((op) => `${op.op} ${op.path}`).join(", ");

			return text(`Applied ${operations.length} operation(s) to "${resume.name}": ${summary}`);
		}),
	);

	// ── Update Resume (metadata) ─────────────────��───────────────
	server.registerTool(
		T.updateResume,
		TOOL_META[T.updateResume],
		withErrorHandling("updating resume", async (params) => {
			const { id, name, slug, tags, isPublic } = params as {
				id: string;
				name?: string;
				slug?: string;
				tags?: string[];
				isPublic?: boolean;
			};
			if (name === undefined && slug === undefined && tags === undefined && isPublic === undefined)
				throw new Error("Provide at least one of: name, slug, tags, isPublic.");

			const resume = await client.resume.update({
				id,
				...(name !== undefined ? { name } : {}),
				...(slug !== undefined ? { slug } : {}),
				...(tags !== undefined ? { tags } : {}),
				...(isPublic !== undefined ? { isPublic } : {}),
			});

			const user = await resolveUserFromRequestHeaders(requestHeaders);
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
		}),
	);

	// ── Delete Resume ────────────────────────────────────────��────
	server.registerTool(
		T.deleteResume,
		TOOL_META[T.deleteResume],
		withErrorHandling("deleting resume", async ({ id }: { id: string }) => {
			await client.resume.delete({ id });

			return text(`Successfully deleted resume (${id}) and all associated files.`);
		}),
	);

	// ── Lock Resume ────────────────���──────────────────────────────
	server.registerTool(
		T.lockResume,
		TOOL_META[T.lockResume],
		withErrorHandling("locking resume", async ({ id }: { id: string }) => {
			await client.resume.setLocked({ id, isLocked: true });

			return text(`Resume (${id}) is now locked. It cannot be edited, patched, or deleted until unlocked.`);
		}),
	);

	// ── Unlock Resume ───────────────���─────────────────────────────
	server.registerTool(
		T.unlockResume,
		TOOL_META[T.unlockResume],
		withErrorHandling("unlocking resume", async ({ id }: { id: string }) => {
			await client.resume.setLocked({ id, isLocked: false });

			return text(`Resume (${id}) is now unlocked. It can be edited, patched, and deleted.`);
		}),
	);

	// ── Get Resume Statistics ────────────────────────────────────
	server.registerTool(
		T.getResumeStatistics,
		TOOL_META[T.getResumeStatistics],
		withErrorHandling("getting resume statistics", async ({ id }: { id: string }) => {
			const stats = await client.resume.statistics.getById({ id });

			return text(JSON.stringify(stats, null, 2));
		}),
	);

	// ── Applications ──────────────────────────────────────────────
	server.registerTool(
		T.listApplications,
		TOOL_META[T.listApplications],
		withErrorHandling("listing applications", async (params) => json(await client.applications.list(params as never))),
	);

	server.registerTool(
		T.readApplication,
		TOOL_META[T.readApplication],
		withErrorHandling("reading application", async ({ id }: { id: string }) =>
			json(await client.applications.getById({ id })),
		),
	);

	server.registerTool(
		T.listApplicationTags,
		TOOL_META[T.listApplicationTags],
		withErrorHandling("listing application tags", async () => json(await client.applications.tags())),
	);

	server.registerTool(
		T.getApplicationStats,
		TOOL_META[T.getApplicationStats],
		withErrorHandling("getting application stats", async () => json(await client.applications.stats())),
	);

	server.registerTool(
		T.createApplication,
		TOOL_META[T.createApplication],
		withErrorHandling("creating application", async (params) => {
			const id = await client.applications.create(coerceFollowUpAt(params as Record<string, unknown>) as never);
			return json({ id });
		}),
	);

	server.registerTool(
		T.updateApplication,
		TOOL_META[T.updateApplication],
		withErrorHandling("updating application", async (params) => {
			return json(await client.applications.update(coerceFollowUpAt(params as Record<string, unknown>) as never));
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
		withErrorHandling("bulk updating applications", async (params) =>
			json(await client.applications.bulkUpdate(params as never)),
		),
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
			const input = params as { items: Array<Record<string, unknown>> };
			return json(
				await client.applications.import({ items: input.items.map((item) => coerceFollowUpAt(item)) } as never),
			);
		}),
	);

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

	server.registerTool(
		T.autofillApplicationFromJob,
		TOOL_META[T.autofillApplicationFromJob],
		withErrorHandling("autofilling application from job", async (params) =>
			json(await client.applications.ai.autofill(params as never)),
		),
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
		withErrorHandling(
			"drafting application message",
			async ({ id, kind }: { id: string; kind: "cover-letter" | "follow-up" }) =>
				json(await client.applications.ai.draftMessage({ id, kind })),
		),
	);
}
