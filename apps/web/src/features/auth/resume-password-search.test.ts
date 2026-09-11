import { describe, expect, it } from "vitest";
import { resumePasswordSearchSchema } from "./resume-password-search";

describe("resume password continuation", () => {
	it("keeps ordinary slug redirects compatible", () => {
		expect(resumePasswordSearchSchema.parse({ redirect: "/owner/resume" })).toEqual({ redirect: "/owner/resume" });
	});
	it("accepts root return independently of the verification identity", () => {
		expect(resumePasswordSearchSchema.parse({ redirect: "/owner/resume", returnTo: "/" })).toEqual({
			redirect: "/owner/resume",
			returnTo: "/",
		});
	});
	it.each(["//evil.example", "https://evil.example", "/\\evil.example", "/other/path", "/?next=evil"])(
		"rejects return path %s",
		(returnTo) => {
			expect(resumePasswordSearchSchema.safeParse({ redirect: "/owner/resume", returnTo }).success).toBe(false);
		},
	);
	it.each([
		"/",
		"//evil.example",
		"/owner/slug/extra",
		"/owner/slug?next=evil",
		"/owner/%2f%2fevil",
		"/owner/\\evil",
		"/owner/slug#hash",
	])("rejects malformed verification identity %s", (redirect) => {
		expect(resumePasswordSearchSchema.safeParse({ redirect, returnTo: "/" }).success).toBe(false);
	});
});
