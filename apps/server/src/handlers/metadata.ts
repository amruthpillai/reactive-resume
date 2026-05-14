import { oauthProviderAuthServerMetadata, oauthProviderOpenIdConfigMetadata } from "@better-auth/oauth-provider";
import z from "zod";
import { auth } from "@reactive-resume/auth/config";
import { env } from "@reactive-resume/env/server";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { buildMcpServerCard } from "../../../web/src/routes/mcp/-helpers/mcp-server-card";

const oauthAuthorizationServerHandler = oauthProviderAuthServerMetadata(auth);
const openIdConfigurationHandler = oauthProviderOpenIdConfigMetadata(auth);

export function handleSchemaJson() {
	const resumeDataJSONSchema = z.toJSONSchema(resumeDataSchema);

	return Response.json(resumeDataJSONSchema, {
		status: 200,
		headers: {
			"Content-Type": "application/schema+json; charset=utf-8",
			"Cache-Control": "public, max-age=86400, immutable",
			"Surrogate-Control": "max-age=86400",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "index, follow",
			ETag: __APP_VERSION__,
			Vary: "Accept",
		},
	});
}

export function handleWellKnownFallback() {
	return new Response("OK", { status: 200 });
}

export function handleMcpServerCard() {
	return Response.json(buildMcpServerCard(__APP_VERSION__), {
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
