import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { auth } from "@reactive-resume/auth/config";
import { db } from "@reactive-resume/db/client";
import { oauthClient, verification } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";
import { generateId } from "@reactive-resume/utils/string";
import { isAllowedOAuthRedirectUri, parseAllowedHostList } from "@reactive-resume/utils/url-security.node";

const oauthAuthorizeSanitizedParams = [
	"prompt",
	"redirect_uri",
	"client_id",
	"code_challenge",
	"code_challenge_method",
	"response_type",
	"scope",
	"state",
	"resource",
] as const;

function sanitizeOAuthAuthorizeRequest(request: Request): Request {
	if (request.method !== "GET") return request;

	const url = new URL(request.url);
	if (!url.pathname.endsWith("/oauth2/authorize")) return request;

	const sanitizeValue = (value: string) =>
		value
			.replace(/[\r\n\t]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	const sanitizeParam = (key: string) => {
		const value = url.searchParams.get(key);
		if (!value) return;
		url.searchParams.set(key, sanitizeValue(value));
	};

	for (const key of oauthAuthorizeSanitizedParams) sanitizeParam(key);

	const redirectUri = url.searchParams.get("redirect_uri");
	if (redirectUri && !URL.canParse(redirectUri)) {
		try {
			const decodedRedirectUri = decodeURIComponent(redirectUri);
			if (URL.canParse(decodedRedirectUri)) {
				url.searchParams.set("redirect_uri", decodedRedirectUri);
			}
		} catch {
			// Ignore malformed encoded values and let Better Auth validation handle them.
		}
	}

	if (url.toString() === request.url) return request;
	return new Request(url.toString(), request);
}

async function defaultPublicClientRegistration(request: Request): Promise<Request> {
	if (request.method !== "POST") return request;

	const url = new URL(request.url);
	if (!url.pathname.endsWith("/oauth2/register")) return request;

	const cloned = request.clone();
	let body: Record<string, unknown>;

	try {
		body = await cloned.json();
	} catch {
		return request;
	}

	if (!request.headers.get("authorization")) {
		body.token_endpoint_auth_method = "none";
	}

	return new Request(url.toString(), {
		method: request.method,
		headers: request.headers,
		body: JSON.stringify(body),
	});
}

async function validateDynamicClientRegistrationRequest(request: Request): Promise<Response | undefined> {
	if (request.method !== "POST") return;

	const url = new URL(request.url);
	if (!url.pathname.endsWith("/oauth2/register")) return;

	const cloned = request.clone();
	let body: Record<string, unknown>;

	try {
		body = await cloned.json();
	} catch {
		return Response.json({ message: "Invalid registration payload" }, { status: 400 });
	}

	const oauthTrustedOrigins = [new URL(env.APP_URL).origin.toLowerCase()];
	const oauthDynamicClientRedirectHosts = parseAllowedHostList(env.OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS);

	const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
	for (const redirectUri of redirectUris) {
		if (
			typeof redirectUri !== "string" ||
			!isAllowedOAuthRedirectUri(redirectUri, oauthTrustedOrigins, oauthDynamicClientRedirectHosts)
		) {
			return Response.json(
				{ error: "invalid_redirect_uri", error_description: "redirect_uri is not allowed" },
				{ status: 400 },
			);
		}
	}
}

export async function handleAuth(request: Request) {
	const registrationValidationError = await validateDynamicClientRegistrationRequest(request);
	if (registrationValidationError) return registrationValidationError;

	const sanitizedRequest = sanitizeOAuthAuthorizeRequest(request);
	const finalRequest = await defaultPublicClientRegistration(sanitizedRequest);

	return auth.handler(finalRequest);
}

function generateCode() {
	return crypto.randomBytes(32).toString("base64url");
}

function hashCode(code: string) {
	return crypto.createHash("sha256").update(code).digest("base64url");
}

export async function handleOAuth(request: Request) {
	const session = await auth.api.getSession({ headers: request.headers });
	const url = new URL(request.url);

	if (session?.user) {
		const clientId = url.searchParams.get("client_id");
		const redirectUri = url.searchParams.get("redirect_uri");
		const state = url.searchParams.get("state");
		const scope = url.searchParams.get("scope");
		const codeChallenge = url.searchParams.get("code_challenge");
		const codeChallengeMethod = url.searchParams.get("code_challenge_method");

		if (!clientId || !redirectUri) {
			return Response.json({ error: "missing client_id or redirect_uri" }, { status: 400 });
		}

		const [client] = await db.select().from(oauthClient).where(eq(oauthClient.clientId, clientId)).limit(1);

		if (!client) {
			return Response.json({ error: "invalid client" }, { status: 400 });
		}

		if (!client.redirectUris.includes(redirectUri)) {
			return Response.json({ error: "invalid redirect_uri" }, { status: 400 });
		}

		const code = generateCode();
		const hashedCode = hashCode(code);
		const now = new Date();
		const expiresAt = new Date(now.getTime() + 600_000);

		await db.insert(verification).values({
			id: generateId(),
			identifier: hashedCode,
			value: JSON.stringify({
				type: "authorization_code",
				query: {
					response_type: "code",
					client_id: clientId,
					redirect_uri: redirectUri,
					scope,
					state,
					code_challenge: codeChallenge,
					code_challenge_method: codeChallengeMethod,
				},
				userId: session.user.id,
				sessionId: session.session.id,
				authTime: new Date(session.session.createdAt).getTime(),
			}),
			expiresAt,
			createdAt: now,
			updatedAt: now,
		});

		const callbackUrl = new URL(redirectUri);
		callbackUrl.searchParams.set("code", code);
		if (state) callbackUrl.searchParams.set("state", state);
		callbackUrl.searchParams.set("iss", `${env.APP_URL}/api/auth`);

		return new Response(null, {
			status: 302,
			headers: { Location: callbackUrl.toString() },
		});
	}

	const loginUrl = new URL("/auth/login", env.APP_URL);
	const oauthParams = new URLSearchParams();
	for (const [key, value] of url.searchParams) {
		if (!["exp", "sig"].includes(key)) {
			oauthParams.set(key, value);
		}
	}
	loginUrl.searchParams.set("callbackURL", `/auth/oauth?${oauthParams.toString()}`);

	return new Response(null, {
		status: 302,
		headers: { Location: `${loginUrl.pathname}${loginUrl.search}` },
	});
}
