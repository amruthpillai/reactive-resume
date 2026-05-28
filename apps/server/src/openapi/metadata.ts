import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import { auth } from "@reactive-resume/auth/config";
import { env } from "@reactive-resume/env/server";
import { buildMcpServerCard } from "@reactive-resume/mcp/server-card";
import { appVersion } from "../app-version";

const oauthAuthorizationServerHandler = oauthProviderAuthServerMetadata(auth);
const openIdConfigurationHandler = oauthProviderOpenIdConfigMetadata(auth);

export function handleWellKnownFallback() {
	return new Response("OK", { status: 200 });
}

export function handleMcpServerCard() {
	return Response.json(buildMcpServerCard(appVersion), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=60, stale-while-revalidate=120",
		},
	});
}

export function handleOAuthAuthorizationServer(request: Request) {
	return oauthAuthorizationServerHandler(request);
}

export function handleOpenIdConfiguration(request: Request) {
	return openIdConfigurationHandler(request);
}

export async function handleOAuthProtectedResource() {
	const metadata = {
		resource: env.APP_URL,
		bearer_methods_supported: ["header"],
		authorization_servers: [env.APP_URL, `${env.APP_URL}/api/auth`],
	};

	return Response.json(metadata, {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
		},
	});
}
