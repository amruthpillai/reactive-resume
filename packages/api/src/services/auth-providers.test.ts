import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	GOOGLE_CLIENT_ID: undefined as string | undefined,
	GOOGLE_CLIENT_SECRET: undefined as string | undefined,
	GITHUB_CLIENT_ID: undefined as string | undefined,
	GITHUB_CLIENT_SECRET: undefined as string | undefined,
	LINKEDIN_CLIENT_ID: undefined as string | undefined,
	LINKEDIN_CLIENT_SECRET: undefined as string | undefined,
	OAUTH_CLIENT_ID: undefined as string | undefined,
	OAUTH_CLIENT_SECRET: undefined as string | undefined,
	OAUTH_PROVIDER_NAME: undefined as string | undefined,
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));
// auth.ts also imports db client and storage; stub them with no-op surfaces.
vi.mock("@reactive-resume/db/client", () => ({ db: { delete: vi.fn() } }));
vi.mock("@reactive-resume/db/schema", () => ({ user: {} }));
vi.mock("./storage", () => ({ getStorageService: () => ({ delete: vi.fn() }) }));

const { authService } = await import("./auth");

const resetEnv = () => {
	envMock.GOOGLE_CLIENT_ID = undefined;
	envMock.GOOGLE_CLIENT_SECRET = undefined;
	envMock.GITHUB_CLIENT_ID = undefined;
	envMock.GITHUB_CLIENT_SECRET = undefined;
	envMock.LINKEDIN_CLIENT_ID = undefined;
	envMock.LINKEDIN_CLIENT_SECRET = undefined;
	envMock.OAUTH_CLIENT_ID = undefined;
	envMock.OAUTH_CLIENT_SECRET = undefined;
	envMock.OAUTH_PROVIDER_NAME = undefined;
};

describe("authService.providers.list", () => {
	it("always includes credential and passkey providers", () => {
		resetEnv();
		const providers = authService.providers.list();
		expect(providers.credential).toBe("Password");
		expect(providers.passkey).toBe("Passkey");
	});

	it("omits social providers when credentials are not configured", () => {
		resetEnv();
		const providers = authService.providers.list();
		expect(providers.google).toBeUndefined();
		expect(providers.github).toBeUndefined();
		expect(providers.linkedin).toBeUndefined();
		expect(providers.custom).toBeUndefined();
	});

	it("includes Google when both client id and secret are present", () => {
		resetEnv();
		envMock.GOOGLE_CLIENT_ID = "id";
		envMock.GOOGLE_CLIENT_SECRET = "secret";
		const providers = authService.providers.list();
		expect(providers.google).toBe("Google");
	});

	it("does NOT include Google when only one of id/secret is set", () => {
		resetEnv();
		envMock.GOOGLE_CLIENT_ID = "id";
		const providers = authService.providers.list();
		expect(providers.google).toBeUndefined();
	});

	it("includes GitHub when both client id and secret are present", () => {
		resetEnv();
		envMock.GITHUB_CLIENT_ID = "id";
		envMock.GITHUB_CLIENT_SECRET = "secret";
		expect(authService.providers.list().github).toBe("GitHub");
	});

	it("includes LinkedIn when both client id and secret are present", () => {
		resetEnv();
		envMock.LINKEDIN_CLIENT_ID = "id";
		envMock.LINKEDIN_CLIENT_SECRET = "secret";
		expect(authService.providers.list().linkedin).toBe("LinkedIn");
	});

	it("labels the custom OAuth provider with OAUTH_PROVIDER_NAME when set", () => {
		resetEnv();
		envMock.OAUTH_CLIENT_ID = "id";
		envMock.OAUTH_CLIENT_SECRET = "secret";
		envMock.OAUTH_PROVIDER_NAME = "Acme SSO";
		expect(authService.providers.list().custom).toBe("Acme SSO");
	});

	it("falls back to 'Custom OAuth' when OAUTH_PROVIDER_NAME is not set", () => {
		resetEnv();
		envMock.OAUTH_CLIENT_ID = "id";
		envMock.OAUTH_CLIENT_SECRET = "secret";
		expect(authService.providers.list().custom).toBe("Custom OAuth");
	});

	it("can register multiple social providers at once", () => {
		resetEnv();
		envMock.GOOGLE_CLIENT_ID = "g";
		envMock.GOOGLE_CLIENT_SECRET = "g";
		envMock.GITHUB_CLIENT_ID = "h";
		envMock.GITHUB_CLIENT_SECRET = "h";
		const providers = authService.providers.list();
		expect(providers.google).toBe("Google");
		expect(providers.github).toBe("GitHub");
	});
});
