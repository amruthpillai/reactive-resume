#!/usr/bin/env node

/**
 * Reactive Resume MCP server — single entry point. Run with:
 *   npx tsx /path/to/reactive-resume/mcp
 *
 * Env: REACTIVE_RESUME_API_KEY (required), REACTIVE_RESUME_URL (default https://rxresu.me),
 *      TRANSPORT (stdio | http), PORT (default 3100).
 */

import * as http from "node:http";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { Operation } from "fast-json-patch";
import { z } from "zod";
import type { RouterInput, RouterOutput } from "@/integrations/orpc/client";
import { jsonPatchOperationSchema } from "@/utils/resume/patch";
import schemaJSON from "../src/schema/schema.json";

// --- Env ---
const API_KEY = process.env.REACTIVE_RESUME_API_KEY;
const BASE_URL = (process.env.REACTIVE_RESUME_URL ?? "https://rxresu.me").replace(/\/$/, "");
const TRANSPORT = process.env.TRANSPORT ?? "stdio";
const PORT = Number.parseInt(process.env.PORT ?? "3100", 10);

if (!API_KEY) {
	console.error("ERROR: REACTIVE_RESUME_API_KEY is required. Create one in Settings > API Keys.");
	process.exit(1);
}

const apiKey = API_KEY;

// --- API client ---
async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
	const url = `${BASE_URL}${path}`;

	const res = await fetch(url, {
		method,
		headers: {
			"x-api-key": apiKey,
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const text = await res.text().catch(() => "Unknown error");
		throw new Error(`Reactive Resume API error (${res.status}): ${text}`);
	}

	return res.json() as Promise<T>;
}

async function listResumes(): Promise<RouterOutput["resume"]["list"]> {
	return apiRequest("GET", "/api/openapi/resumes");
}

async function getResume(id: string): Promise<RouterOutput["resume"]["getById"]> {
	return apiRequest("GET", `/api/openapi/resumes/${encodeURIComponent(id)}`);
}

async function patchResume(id: string, operations: Operation[]): Promise<RouterOutput["resume"]["patch"]> {
	return apiRequest("PATCH", `/api/openapi/resumes/${encodeURIComponent(id)}`, { operations });
}

async function createResume(input: RouterInput["resume"]["create"]): Promise<RouterOutput["resume"]["create"]> {
	return apiRequest("POST", "/api/openapi/resumes", input);
}

async function deleteResume(id: string): Promise<RouterOutput["resume"]["delete"]> {
	return apiRequest("DELETE", `/api/openapi/resumes/${encodeURIComponent(id)}`);
}

async function setResumeLocked(id: string, isLocked: boolean): Promise<RouterOutput["resume"]["setLocked"]> {
	return apiRequest("POST", `/api/openapi/resumes/${encodeURIComponent(id)}/lock`, { isLocked });
}

// --- MCP server ---
const server = new McpServer({ name: "reactive-resume-mcp-server", version: "1.0.0" });

// Tool: list_resumes
server.registerTool(
	"list_resumes",
	{
		title: "List Resumes",
		description:
			"List all resumes for the authenticated user. Returns id, name, slug, tags, visibility, lock status, timestamps.",
		inputSchema: z.object({}).strict(),
	},
	async () => {
		try {
			const resumes = await listResumes();
			if (resumes.length === 0)
				return {
					content: [{ type: "text", text: "No resumes found. Use create_resume to create one." }],
				};
			const lines = [`# Your Resumes (${resumes.length})`, ""];
			for (const r of resumes) {
				const tags = r.tags.length > 0 ? ` [${r.tags.join(", ")}]` : "";
				const flags = [r.isPublic ? "public" : "private", r.isLocked ? "locked" : ""].filter(Boolean).join(", ");
				lines.push(`- **${r.name}** (${r.id})${tags}`);
				lines.push(`  Status: ${flags} | Updated: ${r.updatedAt}`);
			}
			return { content: [{ type: "text", text: lines.join("\n") }] };
		} catch (error) {
			return {
				isError: true,
				content: [
					{ type: "text", text: `Error listing resumes: ${error instanceof Error ? error.message : String(error)}` },
				],
			};
		}
	},
);

// Tool: get_resume
server.registerTool(
	"get_resume",
	{
		title: "Get Resume",
		description: "Get the full data of a specific resume by ID. Use list_resumes to find IDs.",
		inputSchema: z.object({ id: z.string().min(1).describe("Resume ID") }).strict(),
	},
	async ({ id }: { id: string }) => {
		try {
			const resume = await getResume(id);
			return { content: [{ type: "text", text: JSON.stringify(resume.data, null, 2) }] };
		} catch (error) {
			return {
				isError: true,
				content: [
					{
						type: "text",
						text: `Error getting resume: ${error instanceof Error ? error.message : String(error)}. Use list_resumes to find valid IDs.`,
					},
				],
			};
		}
	},
);

// Tool: patch_resume
server.registerTool(
	"patch_resume",
	{
		title: "Patch Resume",
		description:
			"Apply JSON Patch (RFC 6902) operations. Use get_resume first to inspect structure. Paths like /basics/name, /sections/skills/items/-.",
		inputSchema: z
			.object({
				id: z.string().min(1).describe("Resume ID"),
				operations: z.array(jsonPatchOperationSchema).min(1).describe("JSON Patch operations"),
			})
			.strict(),
	},
	async ({ id, operations }: { id: string; operations: Operation[] }) => {
		try {
			const resume = await patchResume(id, operations);
			const summary = operations.map((op) => `${op.op} ${op.path}`).join(", ");

			return {
				content: [{ type: "text", text: `Applied ${operations.length} operation(s) to "${resume.name}": ${summary}` }],
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			let hint = "";
			if (msg.includes("400")) hint = " Use get_resume to check structure and paths.";
			if (msg.includes("403")) hint = " Resume is locked. Use unlock_resume first.";
			if (msg.includes("404")) hint = " Use list_resumes to find valid IDs.";
			return { isError: true, content: [{ type: "text", text: `Error patching resume: ${msg}${hint}` }] };
		}
	},
);

// Tool: create_resume
server.registerTool(
	"create_resume",
	{
		title: "Create Resume",
		description:
			"Create a new resume with a name, slug, and optional tags. Set withSampleData to true to pre-fill with example content.",
		inputSchema: z
			.object({
				name: z.string().min(1).max(64).describe("Name for the new resume"),
				slug: z.string().min(1).max(64).describe("URL-friendly slug (must be unique across your resumes)"),
				tags: z.array(z.string()).optional().default([]).describe("Optional tags to categorize the resume"),
				withSampleData: z.boolean().optional().default(false).describe("If true, pre-fill the resume with sample data"),
			})
			.strict(),
	},
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
		try {
			const id = await createResume({ name, slug, tags, withSampleData });

			return {
				content: [
					{
						type: "text",
						text: `Created resume "${name}" (${id}) with slug "${slug}".${withSampleData ? " Pre-filled with sample data." : ""} Use get_resume to view or patch_resume to edit it.`,
					},
				],
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			let hint = "";
			if (msg.includes("400")) hint = " The slug may already be in use — try a different one.";
			return { isError: true, content: [{ type: "text", text: `Error creating resume: ${msg}${hint}` }] };
		}
	},
);

// Tool: delete_resume
server.registerTool(
	"delete_resume",
	{
		title: "Delete Resume",
		description:
			"Permanently delete a resume and its associated files (screenshots, PDFs). Locked resumes cannot be deleted — unlock first. This action is irreversible.",
		inputSchema: z
			.object({
				id: z.string().min(1).describe("Resume ID to delete. Use list_resumes to find IDs."),
			})
			.strict(),
	},
	async ({ id }: { id: string }) => {
		try {
			await deleteResume(id);

			return { content: [{ type: "text", text: `Successfully deleted resume (${id}) and its associated files.` }] };
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			let hint = "";
			if (msg.includes("403")) hint = " The resume may be locked. Use unlock_resume first.";
			if (msg.includes("404")) hint = " Use list_resumes to find valid IDs.";
			return { isError: true, content: [{ type: "text", text: `Error deleting resume: ${msg}${hint}` }] };
		}
	},
);

// Tool: lock_resume
server.registerTool(
	"lock_resume",
	{
		title: "Lock Resume",
		description:
			"Lock a resume to prevent edits, patches, or deletion. Useful for protecting finalized resumes from accidental changes.",
		inputSchema: z
			.object({
				id: z.string().min(1).describe("Resume ID to lock. Use list_resumes to find IDs."),
			})
			.strict(),
	},
	async ({ id }: { id: string }) => {
		try {
			await setResumeLocked(id, true);

			return {
				content: [
					{
						type: "text",
						text: `Resume (${id}) is now locked. It cannot be edited, patched, or deleted until unlocked.`,
					},
				],
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			let hint = "";
			if (msg.includes("404")) hint = " Use list_resumes to find valid IDs.";
			return { isError: true, content: [{ type: "text", text: `Error locking resume: ${msg}${hint}` }] };
		}
	},
);

// Tool: unlock_resume
server.registerTool(
	"unlock_resume",
	{
		title: "Unlock Resume",
		description: "Unlock a previously locked resume, allowing edits, patches, and deletion again.",
		inputSchema: z
			.object({
				id: z.string().min(1).describe("Resume ID to unlock. Use list_resumes to find IDs."),
			})
			.strict(),
	},
	async ({ id }: { id: string }) => {
		try {
			await setResumeLocked(id, false);

			return {
				content: [{ type: "text", text: `Resume (${id}) is now unlocked. It can be edited, patched, and deleted.` }],
			};
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			let hint = "";
			if (msg.includes("404")) hint = " Use list_resumes to find valid IDs.";
			return { isError: true, content: [{ type: "text", text: `Error unlocking resume: ${msg}${hint}` }] };
		}
	},
);

// Resource: resume://{id}
const resumeTemplate = new ResourceTemplate("resume://{id}", {
	list: async () => {
		const resumes = await listResumes();

		return {
			resources: resumes.map((r) => ({
				uri: `resume://${r.id}`,
				name: r.name,
				mimeType: "application/json" as const,
				description: `Resume: ${r.name}`,
			})),
		};
	},
});

server.registerResource(
	"resume",
	resumeTemplate,
	{
		description: "Full resume data as JSON. Use resume://{id} with ID from list_resumes.",
		mimeType: "application/json",
	},
	async (uri: URL) => {
		const id = uri.href.replace(/^resume:\/\//, "");
		if (!id) throw new Error("Invalid resume URI: resume://{id}");
		const resume = await getResume(id);
		return {
			contents: [{ uri: uri.href, mimeType: "application/json" as const, text: JSON.stringify(resume.data, null, 2) }],
		};
	},
);

// Resource: resume://schema
server.registerResource(
	"resume-schema",
	"resume://schema",
	{
		description: "Resume Data JSON Schema for generating correct JSON Patch operations.",
		mimeType: "application/json",
	},
	async (uri: URL) => ({
		contents: [{ uri: uri.href, mimeType: "application/json" as const, text: JSON.stringify(schemaJSON, null, 2) }],
	}),
);

// --- Transport: stdio (default) ---
async function runStdio(): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Reactive Resume MCP server running via stdio");
}

// --- Transport: HTTP (Node http server) ---
function readBody(req: http.IncomingMessage): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];

		req.on("data", (chunk) => chunks.push(chunk));

		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8");
			if (!raw.trim()) return resolve(undefined);

			try {
				resolve(JSON.parse(raw));
			} catch {
				reject(new Error("Invalid JSON body"));
			}
		});

		req.on("error", reject);
	});
}

async function runHttp(): Promise<void> {
	const { StreamableHTTPServerTransport } = await import("@modelcontextprotocol/sdk/server/streamableHttp.js");

	const httpServer = http.createServer(async (req, res) => {
		if (req.method !== "POST" || req.url !== "/mcp") {
			res.writeHead(404, { "Content-Type": "text/plain" });
			res.end("Not Found");
			return;
		}

		let body: unknown;

		try {
			body = await readBody(req);
		} catch {
			res.writeHead(400, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }));
			return;
		}

		const transport = new StreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
			enableJsonResponse: true,
		});

		res.on("close", () => transport.close());

		await server.connect(transport);
		await transport.handleRequest(req as never, res as never, body);
	});

	httpServer.listen(PORT, "127.0.0.1", () => {
		console.error(`Reactive Resume MCP server running on http://127.0.0.1:${PORT}/mcp`);
	});
}

if (TRANSPORT === "http") {
	runHttp().catch((err) => {
		console.error("Server error:", err);
		process.exit(1);
	});
} else {
	runStdio().catch((err) => {
		console.error("Server error:", err);
		process.exit(1);
	});
}
