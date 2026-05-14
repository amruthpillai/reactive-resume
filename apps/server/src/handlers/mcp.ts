import type { RouterClient } from "@orpc/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { onError } from "@orpc/client";
import { createRouterClient } from "@orpc/server";
import router from "@reactive-resume/api/routers";
import { auth, verifyOAuthToken } from "@reactive-resume/auth/config";
import { env } from "@reactive-resume/env/server";
import { registerPrompts } from "../../../web/src/routes/mcp/-helpers/prompts";
import { registerResources } from "../../../web/src/routes/mcp/-helpers/resources";
import { registerTools } from "../../../web/src/routes/mcp/-helpers/tools";
import { getRequestLocale } from "./rpc";

class AuthError extends Error {
	constructor() {
		super("Unauthorized");
	}
}

function createRequestClient(request: Request): RouterClient<typeof router> {
	return createRouterClient(router, {
		interceptors: [
			onError((error) => {
				console.error("[MCP oRPC]", error);
			}),
		],
		context: () => ({
			locale: getRequestLocale(request),
			reqHeaders: request.headers,
			resHeaders: new Headers(),
		}),
	});
}

async function authenticateRequest(request: Request): Promise<void> {
	const authHeader = request.headers.get("authorization");

	if (authHeader?.startsWith("Bearer ")) {
		try {
			const payload = await verifyOAuthToken(authHeader.slice(7));
			if (payload?.sub) return;
		} catch {
			// Invalid or expired token; fall through to API key auth.
		}
	}

	const apiKey = request.headers.get("x-api-key");

	if (apiKey) {
		try {
			const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
			if (result.valid) return;
		} catch {
			// Invalid or malformed key; fall through to AuthError.
		}
	}

	throw new AuthError();
}

async function createMcpServer(request: Request) {
	const server = new McpServer(
		{
			name: "reactive-resume",
			version: __APP_VERSION__,
			title: "Reactive Resume",
			websiteUrl: "https://rxresu.me",
			description:
				"Reactive Resume is a free and open-source resume builder. Use this MCP server to interact with your resume using an LLM of your choice.",
			icons: [
				{
					src: "https://rxresu.me/icon/light.svg",
					mimeType: "image/svg+xml",
					theme: "light",
				},
				{
					src: "https://rxresu.me/icon/dark.svg",
					mimeType: "image/svg+xml",
					theme: "dark",
				},
			],
		},
		{
			instructions: [
				"You are connected to Reactive Resume over MCP.",
				"Authenticate with OAuth (recommended) or an API key (`x-api-key`).",
				"Discover resume IDs with `reactive_resume_list_resumes` (not `resources/list`).",
				"List distinct tags with `reactive_resume_list_resume_tags`.",
				"Read schema at `resume://_meta/schema`; read resume JSON via `resume://{id}` or `reactive_resume_get_resume`.",
				"Apply body edits with JSON Patch through `reactive_resume_patch_resume`.",
				"Change name, slug, tags, or public visibility with `reactive_resume_update_resume` (returns canonical share URL; anonymous access only when `isPublic` is true; passwords are managed in the web app only).",
				"Import full ResumeData JSON with `reactive_resume_import_resume`; read saved AI analysis with `reactive_resume_get_resume_analysis`.",
			].join(" "),
		},
	);

	const client = createRequestClient(request);
	registerResources(server, client);
	registerTools(server, client, request.headers);
	registerPrompts(server);

	return server;
}

export async function handleMcp(request: Request) {
	try {
		await authenticateRequest(request);

		const server = await createMcpServer(request);
		const transport = new WebStandardStreamableHTTPServerTransport({
			enableJsonResponse: true,
		});

		await server.connect(transport);

		return await transport.handleRequest(request);
	} catch (error) {
		if (error instanceof AuthError) {
			return Response.json(
				{ id: null, jsonrpc: "2.0", error: { code: -32603, message: "Unauthorized" } },
				{
					status: 401,
					headers: {
						"WWW-Authenticate": `Bearer resource_metadata="${env.APP_URL}/.well-known/oauth-protected-resource"`,
					},
				},
			);
		}

		console.error("[MCP]", error);

		return Response.json({
			id: null,
			jsonrpc: "2.0",
			error: {
				code: -32603,
				message: `Error handling request: ${error instanceof Error ? error.message : String(error)}`,
			},
		});
	}
}
