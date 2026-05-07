import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";
import { auth, verifyOAuthToken } from "@reactive-resume/auth/config";
import { env } from "@reactive-resume/env/server";
import { registerPrompts } from "./-helpers/prompts";
import { registerResources } from "./-helpers/resources";
import { registerTools } from "./-helpers/tools";

async function createMcpServer() {
	return _createMcpServer();
}

function _createMcpServer() {
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

	registerResources(server);
	registerTools(server);
	registerPrompts(server);

	return server;
}

class AuthError extends Error {
	constructor() {
		super("Unauthorized");
	}
}

async function authenticateRequest(request: Request): Promise<void> {
	// Try OAuth Bearer token first (for claude.ai and other MCP OAuth clients)
	const authHeader = request.headers.get("authorization");

	if (authHeader?.startsWith("Bearer ")) {
		try {
			const payload = await verifyOAuthToken(authHeader.slice(7));
			if (payload?.sub) return;
		} catch {
			// Invalid or expired token (e.g. JWKS key mismatch) — fall through to AuthError
		}
	}

	// Fall back to API key authentication
	const apiKey = request.headers.get("x-api-key");

	if (apiKey) {
		try {
			const result = await auth.api.verifyApiKey({ body: { key: apiKey } });
			if (result.valid) return;
		} catch {
			// Invalid or malformed key — fall through to AuthError
		}
	}

	throw new AuthError();
}

export const Route = createFileRoute("/mcp/")({
	server: {
		handlers: {
			ANY: async ({ request }) => {
				try {
					await authenticateRequest(request);

					const server = await createMcpServer();
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
			},
		},
	},
});
