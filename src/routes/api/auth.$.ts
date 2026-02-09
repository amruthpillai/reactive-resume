import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/integrations/auth/config";

async function handler({ request }: { request: Request }) {
	if (request.method === "GET" && request.url.endsWith("/spec.json")) {
		const spec = await auth.api.generateOpenAPISchema();

		return Response.json(spec);
	}

	return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: handler,
			POST: handler,
		},
	},
});
