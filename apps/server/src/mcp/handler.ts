import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { env } from "@reactive-resume/env/server";
import { AuthError, authenticateRequest } from "./auth";
import { createMcpServer } from "./server";

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
