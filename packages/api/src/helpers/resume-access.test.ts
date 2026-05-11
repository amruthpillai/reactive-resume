import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ APP_URL: "https://example.com" }));
const cookies = vi.hoisted(() => ({
	get: vi.fn<(name: string) => string | undefined>(),
	set: vi.fn(),
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));
vi.mock("@tanstack/react-start/server", () => ({
	getCookie: (name: string) => cookies.get(name),
	setCookie: (name: string, value: string, options: unknown) => cookies.set(name, value, options),
}));

const { hasResumeAccess, grantResumeAccess } = await import("./resume-access");

const signToken = (resumeId: string, passwordHash: string) =>
	createHash("sha256").update(`${resumeId}:${passwordHash}`).digest("hex");

describe("hasResumeAccess", () => {
	it("returns false when no passwordHash is supplied", () => {
		expect(hasResumeAccess("resume-1", null)).toBe(false);
	});

	it("returns false when no cookie is present", () => {
		cookies.get.mockReturnValueOnce(undefined);
		expect(hasResumeAccess("resume-1", "hash")).toBe(false);
	});

	it("returns true for a cookie value that matches the expected signed token", () => {
		const token = signToken("resume-1", "hash");
		cookies.get.mockReturnValueOnce(token);

		expect(hasResumeAccess("resume-1", "hash")).toBe(true);
	});

	it("returns false for a cookie value that does not match the expected signed token", () => {
		cookies.get.mockReturnValueOnce("not-the-right-token");

		expect(hasResumeAccess("resume-1", "hash")).toBe(false);
	});

	it("returns false when the cookie has a different length than the expected token", () => {
		cookies.get.mockReturnValueOnce("short");

		expect(hasResumeAccess("resume-1", "hash")).toBe(false);
	});
});

describe("grantResumeAccess", () => {
	it("writes a signed cookie scoped to the resume id with httpOnly + sameSite=lax + 10-minute TTL", () => {
		cookies.set.mockReset();

		grantResumeAccess("resume-42", "hash");

		expect(cookies.set).toHaveBeenCalledTimes(1);
		// biome-ignore lint/style/noNonNullAssertion: The assertion above verifies the cookie write exists before destructuring it.
		const [name, value, options] = cookies.set.mock.calls[0]!;
		expect(name).toBe("resume_access_resume-42");
		expect(value).toBe(signToken("resume-42", "hash"));
		expect(options).toMatchObject({
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			maxAge: 600,
		});
	});

	it("only marks the cookie secure when APP_URL is https", () => {
		envMock.APP_URL = "http://localhost:3000";
		cookies.set.mockReset();
		grantResumeAccess("r", "h");
		expect(cookies.set.mock.calls[0]?.[2]).toMatchObject({ secure: false });

		envMock.APP_URL = "https://example.com";
		cookies.set.mockReset();
		grantResumeAccess("r", "h");
		expect(cookies.set.mock.calls[0]?.[2]).toMatchObject({ secure: true });
	});
});
