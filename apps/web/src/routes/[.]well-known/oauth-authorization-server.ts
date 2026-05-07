import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@reactive-resume/auth/config";

const handler = oauthProviderAuthServerMetadata(auth);

export const Route = createFileRoute("/.well-known/oauth-authorization-server")({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
		},
	},
});
