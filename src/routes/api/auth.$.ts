import { createFileRoute } from "@tanstack/react-router";

import { auth } from "@/integrations/auth/config";

async function handler({ request }: { request: Request }) {
  if (request.method === "GET" && request.url.endsWith("/spec.json")) {
    const spec = await auth.api.generateOpenAPISchema();

    return Response.json(spec);
  }

  const response = await auth.handler(request);

  // Log token endpoint errors for debugging
  if (request.url.includes("/oauth2/token") && response.status >= 400) {
    const body = await response.clone().text();
    console.error("[OAuth Token Error]", response.status, body);
  }

  return response;
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
