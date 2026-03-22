import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFileRoute } from "@tanstack/react-router";

import { auth, verifyOAuthToken } from "@/integrations/auth/config";

import { registerPrompts } from "./-helpers/prompts";
import { registerResources } from "./-helpers/resources";
import { registerTools } from "./-helpers/tools";

const mcpServer = new McpServer({
  name: "reactive-resume",
  version: "1.0.0",
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
});

registerResources(mcpServer);
registerTools(mcpServer);
registerPrompts(mcpServer);

class AuthError extends Error {
  constructor() {
    super("Unauthorized");
  }
}

async function authenticateRequest(request: Request): Promise<void> {
  // Try OAuth Bearer token first (for claude.ai and other MCP OAuth clients)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = await verifyOAuthToken(authHeader.slice(7));
    if (payload?.sub) return;
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

          const transport = new WebStandardStreamableHTTPServerTransport({
            enableJsonResponse: true,
          });

          await mcpServer.connect(transport);

          return await transport.handleRequest(request);
        } catch (error) {
          if (error instanceof AuthError) {
            return new Response(JSON.stringify({
              id: null,
              jsonrpc: "2.0",
              error: { code: -32603, message: "Unauthorized" },
            }), {
              status: 401,
              headers: {
                "Content-Type": "application/json",
                "WWW-Authenticate": "Bearer",
              },
            });
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
