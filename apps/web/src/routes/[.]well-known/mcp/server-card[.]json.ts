import { createFileRoute } from "@tanstack/react-router";
import { buildMcpServerCard } from "@/routes/mcp/-helpers/mcp-server-card";

/** Well-known MCP server card (SEP-1649) for static metadata when clients cannot complete a full capability scan. */
export const Route = createFileRoute("/.well-known/mcp/server-card.json")({
	server: {
		handlers: {
			GET: async () =>
				Response.json(buildMcpServerCard(__APP_VERSION__), {
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=60, stale-while-revalidate=120",
					},
				}),
		},
	},
});
