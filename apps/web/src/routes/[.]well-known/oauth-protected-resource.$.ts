import { createFileRoute } from "@tanstack/react-router";
import { env } from "@reactive-resume/env/server";
import { authClient } from "@/libs/auth/client";

export const Route = createFileRoute("/.well-known/oauth-protected-resource/$")({
	server: {
		handlers: {
			GET: async () => {
				const metadata = await authClient.getProtectedResourceMetadata({
					resource: env.APP_URL,
					bearer_methods_supported: ["header"],
					authorization_servers: [env.APP_URL, `${env.APP_URL}/api/auth`],
				});

				return Response.json(metadata, {
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
					},
				});
			},
		},
	},
});
