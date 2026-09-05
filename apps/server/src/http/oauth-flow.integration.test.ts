import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("@reactive-resume/email/transport", () => ({ sendEmail: vi.fn() }));

// Run only against an explicitly supplied disposable database, after applying migrations.
const databaseURL = process.env.OAUTH_TEST_DATABASE_URL;

describe.skipIf(!databaseURL)("MCP OAuth flow with PostgreSQL", () => {
	it("registers public clients, resumes login, and exchanges a resource-bound PKCE code", async () => {
		if (!databaseURL) return;
		process.env.DATABASE_URL = databaseURL;
		process.env.APP_URL = "http://localhost:33920";
		process.env.AUTH_SECRET = "oauth-integration-test-secret-only";
		const { handleAuth, handleOAuth } = await import("./auth");
		const origin = process.env.APP_URL;
		const redirectURI = "http://127.0.0.1:33921/callback";
		const request = (path: string, body: object, cookie = "") =>
			new Request(`${origin}/api/auth/${path}`, {
				method: "POST",
				headers: { "content-type": "application/json", origin, cookie },
				body: JSON.stringify(body),
			});
		const registration = await handleAuth(
			request("oauth2/register", { client_name: "OAuth integration", redirect_uris: [redirectURI] }),
		);
		expect(registration.status, await registration.clone().text()).toBe(201);
		const client = await registration.json();
		expect(client.token_endpoint_auth_method).toBe("none");

		const deniedRegistration = await handleAuth(
			request("oauth2/register", {
				client_name: "Denied resource",
				redirect_uris: [redirectURI],
				resources: ["https://untrusted.example/mcp"],
			}),
		);
		expect(deniedRegistration.status).toBe(400);
		await expect(deniedRegistration.json()).resolves.toMatchObject({ error: "invalid_target" });

		const verifier = randomBytes(32).toString("base64url");
		const query = new URLSearchParams({
			client_id: client.client_id,
			redirect_uri: redirectURI,
			response_type: "code",
			scope: "openid profile offline_access",
			code_challenge: createHash("sha256").update(verifier).digest("base64url"),
			code_challenge_method: "S256",
			resource: `${origin}/mcp`,
			state: "opaque-state",
		});
		const authorize = await handleAuth(new Request(`${origin}/api/auth/oauth2/authorize?${query}`));
		expect(authorize.status, await authorize.clone().text()).toBe(302);
		const bridgeURL = authorize.headers.get("location");
		expect(bridgeURL).toBeTruthy();
		const login = await handleOAuth(new Request(new URL(bridgeURL ?? "", origin)));
		const loginURL = new URL(login.headers.get("location") ?? "", origin);
		const callbackURL = loginURL.searchParams.get("callbackURL");
		expect(callbackURL).toContain("sig=");
		expect(callbackURL).toContain("resource=");

		const unique = randomBytes(6).toString("hex");
		const signup = await handleAuth(
			request("sign-up/email", {
				name: "OAuth Test",
				email: `oauth-${unique}@example.com`,
				username: `oauth-${unique}`,
				password: "password123",
			}),
		);
		expect(signup.status, await signup.clone().text()).toBe(200);
		const cookie = signup.headers
			.getSetCookie()
			.map((value) => value.split(";", 1)[0])
			.join("; ");
		const tamperedURL = new URL(`${origin}${callbackURL}`);
		tamperedURL.searchParams.set("state", "tampered");
		const tampered = await handleOAuth(new Request(tamperedURL, { headers: { cookie } }));
		expect(tampered.status).toBe(400);
		await expect(tampered.json()).resolves.toMatchObject({ error: "invalid_signature" });
		const callback = await handleOAuth(new Request(`${origin}${callbackURL}`, { headers: { cookie } }));
		expect(callback.status, await callback.clone().text()).toBe(302);
		const codeURL = new URL(callback.headers.get("location") ?? "");
		expect(codeURL.origin).toBe(new URL(redirectURI).origin);
		expect(codeURL.searchParams.get("state")).toBe("opaque-state");
		const code = codeURL.searchParams.get("code");
		expect(code).toBeTruthy();
		const tokenRequest = () =>
			new Request(`${origin}/api/auth/oauth2/token`, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					grant_type: "authorization_code",
					client_id: client.client_id,
					code: code ?? "",
					redirect_uri: redirectURI,
					code_verifier: verifier,
					resource: `${origin}/mcp`,
				}),
			});
		const tokenResponse = await handleAuth(tokenRequest());
		expect(tokenResponse.status, await tokenResponse.clone().text()).toBe(200);
		const token = await tokenResponse.json();
		expect(token.access_token).toBeTruthy();
		expect(token.refresh_token).toBeTruthy();
		const claims = JSON.parse(Buffer.from(token.access_token.split(".")[1], "base64url").toString());
		expect([claims.aud].flat()).toContain(`${origin}/mcp`);
		expect((await handleAuth(tokenRequest())).status).toBe(400);
	}, 30_000);
	it.each(["login", "max-age", "create"])(
		"requires fresh authentication for %s without looping",
		async (mode) => {
			if (!databaseURL) return;
			process.env.DATABASE_URL = databaseURL;
			process.env.APP_URL = "http://localhost:33920";
			process.env.AUTH_SECRET = "oauth-integration-test-secret-only";
			const { handleAuth, handleOAuth } = await import("./auth");
			const origin = process.env.APP_URL;
			const cookieOf = (response: Response) =>
				response.headers
					.getSetCookie()
					.map((value) => value.split(";", 1)[0])
					.join("; ");
			const post = (path: string, body: object, cookie = "") =>
				handleAuth(
					new Request(`${origin}/api/auth/${path}`, {
						method: "POST",
						headers: { "content-type": "application/json", origin, cookie },
						body: JSON.stringify(body),
					}),
				);
			const unique = randomBytes(6).toString("hex");
			const credentials = {
				name: "Reauth Test",
				email: `reauth-${unique}@example.com`,
				username: `reauth-${unique}`,
				password: "password123",
			};
			const existingSignup = await post("sign-up/email", credentials);
			expect(existingSignup.status).toBe(200);
			const oldCookie = cookieOf(existingSignup);
			const registration = await post("oauth2/register", {
				client_name: "Reauth integration",
				redirect_uris: ["http://127.0.0.1:33921/callback"],
			});
			expect(registration.status).toBe(201);
			const client = await registration.json();
			const query = new URLSearchParams({
				client_id: client.client_id,
				redirect_uri: "http://127.0.0.1:33921/callback",
				response_type: "code",
				scope: "openid profile",
				resource: `${origin}/mcp`,
				code_challenge: createHash("sha256").update(randomBytes(32)).digest("base64url"),
				code_challenge_method: "S256",
				...(mode === "max-age" ? { max_age: "0" } : { prompt: mode }),
			});
			const authorization = await handleAuth(
				new Request(`${origin}/api/auth/oauth2/authorize?${query}`, { headers: { cookie: oldCookie } }),
			);
			expect(authorization.status).toBe(302);
			const bridge = await handleOAuth(
				new Request(new URL(authorization.headers.get("location") ?? "", origin), { headers: { cookie: oldCookie } }),
			);
			expect(bridge.status).toBe(302);
			const loginURL = new URL(bridge.headers.get("location") ?? "", origin);
			expect(loginURL.pathname).toBe(mode === "create" ? "/auth/register" : "/auth/login");
			expect(loginURL.searchParams.get("reauthenticate")).toBe("true");
			const callbackURL = new URL(loginURL.searchParams.get("callbackURL") ?? "", origin);
			const oauth_query = callbackURL.search.slice(1);
			const authenticated =
				mode === "create"
					? await post(
							"sign-up/email",
							{ ...credentials, email: `new-${unique}@example.com`, username: `new-${unique}` },
							oldCookie,
						)
					: await post(
							"sign-in/email",
							{ email: credentials.email, password: credentials.password, oauth_query },
							oldCookie,
						);
			expect(authenticated.status, await authenticated.clone().text()).toBe(200);
			const newCookie = cookieOf(authenticated);
			expect(newCookie).not.toBe(oldCookie);
			const continuation =
				mode === "create" ? await post("oauth2/continue", { created: true, oauth_query }, newCookie) : authenticated;
			expect(continuation.status, await continuation.clone().text()).toBe(200);
			const result = await continuation.json();
			let target = new URL(result.url, origin);
			if (target.pathname === "/api/auth/oauth") {
				const response = await handleOAuth(new Request(target, { headers: { cookie: newCookie } }));
				expect(response.status, await response.clone().text()).toBe(302);
				target = new URL(response.headers.get("location") ?? "", origin);
			}
			expect(target.origin).toBe("http://127.0.0.1:33921");
			expect(target.searchParams.get("code")).toBeTruthy();
		},
		30_000,
	);
});
