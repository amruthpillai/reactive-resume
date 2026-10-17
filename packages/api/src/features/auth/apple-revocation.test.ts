import { afterEach, expect, it, vi } from "vitest";

const settings = vi.hoisted(() => ({
	APPLE_CLIENT_ID: "fixture.service",
	APPLE_CLIENT_SECRET: "fixture-client-secret",
}));
vi.mock("@reactive-resume/env/server", () => ({ env: settings }));
const { revokeAppleAuthorization } = await import("./apple-revocation");
afterEach(() => vi.unstubAllGlobals());

it("revokes the refresh token with Apple's exact form contract and accepts an empty 200 response", async () => {
	const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
	vi.stubGlobal("fetch", request);
	expect(await revokeAppleAuthorization({ refreshToken: "fixture-refresh", accessToken: "fixture-access" })).toBe(true);
	const [url, init] = request.mock.calls[0] ?? [];
	expect(url).toBe("https://appleid.apple.com/auth/revoke");
	expect(init.method).toBe("POST");
	expect(Object.fromEntries(init.body)).toEqual({
		client_id: "fixture.service",
		client_secret: "fixture-client-secret",
		token: "fixture-refresh",
		token_type_hint: "refresh_token",
	});
	expect(init.redirect).toBe("error");
});

it("uses an access token when refresh is unavailable and never blocks erasure on revocation failure", async () => {
	const request = vi.fn().mockResolvedValue(new Response(null, { status: 400 }));
	vi.stubGlobal("fetch", request);
	expect(await revokeAppleAuthorization({ refreshToken: null, accessToken: "fixture-access" })).toBe(false);
	expect(request.mock.lastCall?.[1].body.get("token_type_hint")).toBe("access_token");
	request.mockRejectedValueOnce(new Error("Network unavailable"));
	expect(await revokeAppleAuthorization({ refreshToken: "fixture-refresh", accessToken: null })).toBe(false);
	request.mockClear();
	expect(await revokeAppleAuthorization({ refreshToken: null, accessToken: null })).toBe(false);
	expect(request).not.toHaveBeenCalled();
});
