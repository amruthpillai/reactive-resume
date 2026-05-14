import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({ APP_URL: "https://example.com" }));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

const { hasResumeAccess, grantResumeAccess } = await import("./resume-access");

const signToken = (resumeId: string, passwordHash: string) =>
	createHash("sha256").update(`${resumeId}:${passwordHash}`).digest("hex");

const requestHeadersWithCookie = (name: string, value: string) =>
	new Headers({ Cookie: `other=value; ${name}=${value}; theme=dark` });

describe("hasResumeAccess", () => {
	it("returns false when no passwordHash is supplied", () => {
		expect(hasResumeAccess(new Headers(), "resume-1", null)).toBe(false);
	});

	it("returns false when no cookie is present", () => {
		expect(hasResumeAccess(new Headers(), "resume-1", "hash")).toBe(false);
	});

	it("returns true for a cookie value that matches the expected signed token", () => {
		const token = signToken("resume-1", "hash");
		const headers = requestHeadersWithCookie("resume_access_resume-1", token);

		expect(hasResumeAccess(headers, "resume-1", "hash")).toBe(true);
	});

	it("returns false for a cookie value that does not match the expected signed token", () => {
		const headers = requestHeadersWithCookie("resume_access_resume-1", "not-the-right-token");

		expect(hasResumeAccess(headers, "resume-1", "hash")).toBe(false);
	});

	it("returns false when the cookie has a different length than the expected token", () => {
		const headers = requestHeadersWithCookie("resume_access_resume-1", "short");

		expect(hasResumeAccess(headers, "resume-1", "hash")).toBe(false);
	});
});

describe("grantResumeAccess", () => {
	it("appends a signed Set-Cookie header scoped to the resume id with httpOnly + sameSite=lax + 10-minute TTL", () => {
		const responseHeaders = new Headers();

		grantResumeAccess(responseHeaders, "resume-42", "hash");

		const cookie = responseHeaders.get("Set-Cookie");
		expect(cookie).toContain(`resume_access_resume-42=${signToken("resume-42", "hash")}`);
		expect(cookie).toContain("Path=/");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("SameSite=Lax");
		expect(cookie).toContain("Max-Age=600");
	});

	it("only marks the cookie secure when APP_URL is https", () => {
		envMock.APP_URL = "http://localhost:3000";
		const localHeaders = new Headers();
		grantResumeAccess(localHeaders, "r", "h");
		expect(localHeaders.get("Set-Cookie")).not.toContain("Secure");

		envMock.APP_URL = "https://example.com";
		const productionHeaders = new Headers();
		grantResumeAccess(productionHeaders, "r", "h");
		expect(productionHeaders.get("Set-Cookie")).toContain("Secure");
	});
});
