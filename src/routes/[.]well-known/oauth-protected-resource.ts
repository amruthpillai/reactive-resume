import { createFileRoute } from "@tanstack/react-router";

import { authBaseUrl } from "@/integrations/auth/config";

export const Route = createFileRoute("/.well-known/oauth-protected-resource")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          resource: `${authBaseUrl}/mcp/`,
          authorization_servers: [`${authBaseUrl}/api/auth`],
          bearer_methods_supported: ["header"],
        }),
    },
  },
});
