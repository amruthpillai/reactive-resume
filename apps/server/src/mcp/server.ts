import type { RouterClient } from "@orpc/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { onError } from "@orpc/client";
import { createRouterClient } from "@orpc/server";
import router from "@reactive-resume/api/routers";
import { MCP_TOOL_NAME, registerPrompts, registerResources, registerTools } from "@reactive-resume/mcp";
import { getRequestLocale } from "../rpc/locale";

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

export async function createMcpServer(request: Request) {
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
				`Discover resume IDs with \`${MCP_TOOL_NAME.listResumes}\` (not \`resources/list\`).`,
				`List distinct tags with \`${MCP_TOOL_NAME.listResumeTags}\`.`,
				`Read schema at \`resume://_meta/schema\`; read resume JSON via \`resume://{id}\` or \`${MCP_TOOL_NAME.getResume}\`.`,
				`Apply body edits with JSON Patch through \`${MCP_TOOL_NAME.patchResume}\`.`,
				`Change name, slug, tags, or public visibility with \`${MCP_TOOL_NAME.updateResume}\` (returns canonical share URL; anonymous access only when \`isPublic\` is true; passwords are managed in the web app only).`,
				`Import full ResumeData JSON with \`${MCP_TOOL_NAME.importResume}\`; read saved AI analysis with \`${MCP_TOOL_NAME.getResumeAnalysis}\`.`,
			].join(" "),
		},
	);

	const client = createRequestClient(request);
	registerResources(server, client);
	registerTools(server, client, request.headers);
	registerPrompts(server);

	return server;
}
