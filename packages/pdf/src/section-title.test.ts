import { describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { getResumeSectionTitle, resolveSectionTitle } from "./section-title";

describe("resolveSectionTitle", () => {
	it("returns the trimmed user-provided title when non-empty", () => {
		const result = resolveSectionTitle("My Title", {
			sectionId: "experience",
			locale: "en-US",
			sectionKind: "builtin",
		});
		expect(result).toBe("My Title");
	});

	it("falls through to resolver when title is empty", () => {
		const resolver = vi.fn().mockReturnValue("Resolved");
		const result = resolveSectionTitle(
			"",
			{
				sectionId: "experience",
				locale: "en-US",
				sectionKind: "builtin",
			},
			resolver,
		);
		expect(resolver).toHaveBeenCalled();
		expect(result).toBe("Resolved");
	});

	it("falls through to legacyFallback when title and resolver return blank", () => {
		const resolver = vi.fn().mockReturnValue("");
		const result = resolveSectionTitle(
			"",
			{ sectionId: "experience", locale: "en-US", sectionKind: "builtin" },
			resolver,
			"Legacy Title",
		);
		expect(result).toBe("Legacy Title");
	});

	it("falls through to defaultEnglishTitle when no other source available", () => {
		const result = resolveSectionTitle("", {
			sectionId: "experience",
			locale: "en-US",
			sectionKind: "builtin",
			defaultEnglishTitle: "Experience",
		});
		expect(result).toBe("Experience");
	});

	it("falls through to sectionId as last resort", () => {
		const result = resolveSectionTitle("", {
			sectionId: "experience",
			locale: "en-US",
			sectionKind: "builtin",
		});
		expect(result).toBe("experience");
	});

	it("treats whitespace-only title as empty", () => {
		const result = resolveSectionTitle("   ", {
			sectionId: "x",
			locale: "en-US",
			sectionKind: "builtin",
			defaultEnglishTitle: "Default",
		});
		expect(result).toBe("Default");
	});
});

describe("getResumeSectionTitle", () => {
	it("uses summary's user-provided title when set", () => {
		const data = {
			...defaultResumeData,
			summary: { ...defaultResumeData.summary, title: "Profile Summary" },
		};
		expect(getResumeSectionTitle(data, "summary")).toBe("Profile Summary");
	});

	it("uses default English title for summary when title is empty", () => {
		expect(getResumeSectionTitle(defaultResumeData, "summary")).toBe("Summary");
	});

	it("uses default English title for built-in sections", () => {
		expect(getResumeSectionTitle(defaultResumeData, "experience")).toBe("Experience");
		expect(getResumeSectionTitle(defaultResumeData, "skills")).toBe("Skills");
	});

	it("falls back to legacyFallback for unknown section ids", () => {
		expect(getResumeSectionTitle(defaultResumeData, "unknown-id", "Custom Legacy")).toBe("Custom Legacy");
	});

	it("falls back to sectionId for unknown sections without legacyFallback", () => {
		expect(getResumeSectionTitle(defaultResumeData, "unknown-section")).toBe("unknown-section");
	});

	it("calls user's resolveSectionTitle when present", () => {
		const resolver = vi.fn().mockReturnValue("Translated");
		const data = { ...defaultResumeData, resolveSectionTitle: resolver };
		expect(getResumeSectionTitle(data, "experience")).toBe("Translated");
		expect(resolver).toHaveBeenCalledWith(expect.objectContaining({ sectionId: "experience", sectionKind: "builtin" }));
	});

	it("uses custom section's title when defined", () => {
		const data = {
			...defaultResumeData,
			customSections: [
				{
					id: "ext-1",
					type: "cover-letter" as const,
					title: "My Cover Letter",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [],
				},
			],
		};
		expect(getResumeSectionTitle(data, "ext-1")).toBe("My Cover Letter");
	});

	it("uses default English title 'Cover Letter' for cover-letter custom sections", () => {
		const data = {
			...defaultResumeData,
			customSections: [
				{
					id: "ext-1",
					type: "cover-letter" as const,
					title: "",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [],
				},
			],
		};
		expect(getResumeSectionTitle(data, "ext-1")).toBe("Cover Letter");
	});
});
