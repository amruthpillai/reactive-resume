import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
}));

vi.mock("@reactive-resume/auth/config", () => ({
	auth: {
		api: {
			getSession: mocks.getSession,
		},
	},
}));

vi.mock("@reactive-resume/db/client", () => ({ db: {} }));
vi.mock("@reactive-resume/db/schema", () => ({ oauthClient: {}, verification: {} }));
vi.mock("@reactive-resume/env/server", () => ({
	env: {
		APP_URL: "http://localhost:3000",
		OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS: "",
		SERVER_PORT: 3001,
	},
}));

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
