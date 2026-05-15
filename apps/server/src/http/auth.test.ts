import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
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
});

describe("handleOAuth", () => {
	it("redirects unauthenticated users to the same-origin login route", async () => {
		const { handleOAuth } = await import("./auth");
		mocks.getSession.mockResolvedValueOnce(null);

		const response = await handleOAuth(
			new Request(
				"http://localhost:3001/auth/oauth?client_id=test-client&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=abc&exp=123&sig=456",
			),
		);

		expect(response.status).toBe(302);
		const location = response.headers.get("Location");
		expect(location).toMatch(/^\/auth\/login\?/);

		const loginUrl = new URL(location ?? "", "http://localhost:3000");
		const callbackUrl = new URL(loginUrl.searchParams.get("callbackURL") ?? "", "http://localhost:3000");

		expect(loginUrl.origin).toBe("http://localhost:3000");
		expect(callbackUrl.pathname).toBe("/auth/oauth");
		expect(callbackUrl.searchParams.get("client_id")).toBe("test-client");
		expect(callbackUrl.searchParams.get("redirect_uri")).toBe("https://example.com/callback");
		expect(callbackUrl.searchParams.get("state")).toBe("abc");
		expect(callbackUrl.searchParams.has("exp")).toBe(false);
		expect(callbackUrl.searchParams.has("sig")).toBe(false);
	});
});
