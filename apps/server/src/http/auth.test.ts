import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	consent: vi.fn(),
	handler: vi.fn(),
	env: {
		SERVER_PORT: 3001,
		APP_URL: "http://localhost:3000",
		FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI: false,
	},
}));

vi.mock("@reactive-resume/auth/config", () => ({
	auth: {
		api: {
			getSession: mocks.getSession,
			oauth2Consent: mocks.consent,
		},
		handler: mocks.handler,
	},
}));

vi.mock("@reactive-resume/db/client", () => ({ db: {} }));
vi.mock("@reactive-resume/db/schema", () => ({ oauthClient: {}, verification: {} }));
vi.mock("@reactive-resume/env/server", () => ({
	env: mocks.env,
}));

beforeEach(() => {
	vi.clearAllMocks();
	mocks.env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI = false;
	mocks.handler.mockResolvedValue(new Response("ok"));
});

describe("handleAuth", () => {
	it.each([null, false, 42, "client", [], [{ redirect_uris: [] }]])(
		"rejects non-object registration payload %j",
		async (body) => {
			const { handleAuth } = await import("./auth");
			const response = await handleAuth(
				new Request("http://localhost:3000/api/auth/oauth2/register", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(body),
				}),
			);
			expect(response.status).toBe(400);
			await expect(response.json()).resolves.toEqual({ message: "Invalid registration payload" });
			expect(mocks.handler).not.toHaveBeenCalled();
		},
	);

	it("rejects untrusted dynamic OAuth redirect URIs in safe mode", async () => {
		const { handleAuth } = await import("./auth");

		const response = await handleAuth(
			new Request("http://localhost:3001/api/auth/oauth2/register", {
				method: "POST",
				body: JSON.stringify({ redirect_uris: ["https://evil.example.com/callback"] }),
				headers: { "content-type": "application/json" },
			}),
		);

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual({
			error: "invalid_redirect_uri",
			error_description: "redirect_uri is not allowed",
		});
		expect(mocks.handler).not.toHaveBeenCalled();
	});

	it("forwards custom-scheme dynamic OAuth redirect URIs when unsafe mode is enabled", async () => {
		const { handleAuth } = await import("./auth");
		mocks.env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI = true;

		const response = await handleAuth(
			new Request("http://localhost:3001/api/auth/oauth2/register", {
				method: "POST",
				body: JSON.stringify({ redirect_uris: ["myapp://callback"] }),
				headers: { "content-type": "application/json" },
			}),
		);

		expect(response.status).toBe(200);
		expect(mocks.handler).toHaveBeenCalledOnce();
	});
	it.each(["localhost", "127.0.0.1", "[::1]"])(
		"infers native application type for exact %s loopback callbacks",
		async (host) => {
			const { handleAuth } = await import("./auth");
			await handleAuth(
				new Request("http://localhost:3000/api/auth/oauth2/register", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ redirect_uris: [`http://${host}:3210/callback`] }),
				}),
			);
			const forwarded = mocks.handler.mock.calls[0]?.[0] as Request;
			await expect(forwarded.json()).resolves.toMatchObject({
				application_type: "native",
				token_endpoint_auth_method: "none",
			});
		},
	);

	it.each([
		{ redirect_uris: ["https://example.com/callback"] },
		{ redirect_uris: ["http://localhost.evil.example/callback"] },
		{ redirect_uris: ["http://localhost:3210/callback"], application_type: "web" },
		{ redirect_uris: ["http://localhost:3210/callback", "https://example.com/callback"] },
	])("does not infer native for explicit web or non-loopback clients: %j", async (body) => {
		const { handleAuth } = await import("./auth");
		mocks.env.FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI = true;
		await handleAuth(
			new Request("http://localhost:3000/api/auth/oauth2/register", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(body),
			}),
		);
		const forwarded = mocks.handler.mock.calls[0]?.[0] as Request;
		expect((await forwarded.json()).application_type).not.toBe("native");
	});

	it("preserves repeated resource indicators during authorization sanitization", async () => {
		const { handleAuth } = await import("./auth");
		await handleAuth(
			new Request(
				"http://localhost:3000/api/auth/oauth2/authorize?resource=http%3A%2F%2Flocalhost%3A3000&resource=http%3A%2F%2Flocalhost%3A3000%2Fmcp",
			),
		);
		const forwarded = mocks.handler.mock.calls[0]?.[0] as Request;
		expect(new URL(forwarded.url).searchParams.getAll("resource")).toEqual([
			"http://localhost:3000",
			"http://localhost:3000/mcp",
		]);
	});
});

describe("handleOAuth", () => {
	it("redirects unauthenticated users to the same-origin login route", async () => {
		const { handleOAuth } = await import("./auth");
		mocks.getSession.mockResolvedValueOnce(null);

		const response = await handleOAuth(
			new Request(
				"http://localhost:3001/api/auth/oauth?client_id=test-client&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=abc&exp=123&sig=456",
			),
		);

		expect(response.status).toBe(302);
		const location = response.headers.get("Location");
		expect(location).toMatch(/^\/auth\/login\?/);

		const loginUrl = new URL(location ?? "", "http://localhost:3000");
		const callbackUrl = new URL(loginUrl.searchParams.get("callbackURL") ?? "", "http://localhost:3000");

		expect(loginUrl.origin).toBe("http://localhost:3000");
		expect(callbackUrl.pathname).toBe("/api/auth/oauth");
		expect(callbackUrl.searchParams.get("client_id")).toBe("test-client");
		expect(callbackUrl.searchParams.get("redirect_uri")).toBe("https://example.com/callback");
		expect(callbackUrl.searchParams.get("state")).toBe("abc");
		expect(callbackUrl.searchParams.get("exp")).toBe("123");
		expect(callbackUrl.searchParams.get("sig")).toBe("456");
	});
	it("delegates signed authorization to the provider instead of minting an unvalidated code", async () => {
		const { handleOAuth } = await import("./auth");
		mocks.getSession.mockResolvedValueOnce({ user: { id: "owner" } });
		mocks.consent.mockResolvedValueOnce(
			Response.json({ redirect: true, url: "https://claude.ai/api/mcp/auth_callback?code=code" }),
		);
		const query = "client_id=client&resource=one&resource=two&exp=123&sig=456";
		const response = await handleOAuth(new Request(`http://localhost:3000/api/auth/oauth?${query}`));
		expect(mocks.consent).toHaveBeenCalledWith(expect.objectContaining({ body: { accept: true, oauth_query: query } }));
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe("https://claude.ai/api/mcp/auth_callback?code=code");
	});

	it("preserves provider failures instead of issuing an authorization code", async () => {
		const { handleOAuth } = await import("./auth");
		mocks.getSession.mockResolvedValueOnce({ user: { id: "owner" } });
		mocks.consent.mockResolvedValueOnce(Response.json({ error: "invalid_signature" }, { status: 400 }));
		const response = await handleOAuth(new Request("http://localhost:3000/api/auth/oauth?sig=invalid"));
		expect(response.status).toBe(400);
		expect(response.headers.get("location")).toBeNull();
		await expect(response.json()).resolves.toEqual({ error: "invalid_signature" });
	});
	it("preserves provider cookies and cache headers on forced reauthentication", async () => {
		const { handleOAuth } = await import("./auth");
		mocks.getSession.mockResolvedValueOnce({ user: { id: "owner" } });
		const headers = new Headers({ "cache-control": "no-store", "content-length": "123" });
		headers.append("set-cookie", "oauth_state=state; Path=/; HttpOnly");
		headers.append("set-cookie", "session=refreshed; Path=/; HttpOnly");
		mocks.consent.mockResolvedValueOnce(
			Response.json({ redirect: true, url: "/api/auth/oauth?prompt=login&sig=signed" }, { headers }),
		);
		const response = await handleOAuth(new Request("http://localhost:3000/api/auth/oauth?sig=original"));
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toMatch(/^\/auth\/login\?reauthenticate=true&/);
		expect(response.headers.getSetCookie()).toEqual(headers.getSetCookie());
		expect(response.headers.get("cache-control")).toBe("no-store");
		expect(response.headers.get("content-type")).toBeNull();
		expect(response.headers.get("content-length")).toBeNull();
	});
});
