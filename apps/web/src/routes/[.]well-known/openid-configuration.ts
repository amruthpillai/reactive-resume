import { oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@reactive-resume/auth/config";

const handler = oauthProviderOpenIdConfigMetadata(auth);

export const Route = createFileRoute("/.well-known/openid-configuration")({
	server: {
		handlers: {
			GET: ({ request }) => handler(request),
		},
	},
});
