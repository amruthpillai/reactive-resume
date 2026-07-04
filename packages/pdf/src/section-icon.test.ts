import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { getResumeSectionIcon } from "./section-icon";

describe("getResumeSectionIcon", () => {
	describe("built-in sections", () => {
		it("returns the icon from section data when set", () => {
			const data = {
				...defaultResumeData,
				sections: {
					...defaultResumeData.sections,
					experience: { ...defaultResumeData.sections.experience, icon: "rocket" },
				},
			};
			expect(getResumeSectionIcon(data, "experience")).toBe("rocket");
		});

		it("falls back to default icon when section icon is empty string", () => {
			const data = {
				...defaultResumeData,
				sections: {
					...defaultResumeData.sections,
					experience: { ...defaultResumeData.sections.experience, icon: "" },
				},
			};
			expect(getResumeSectionIcon(data, "experience")).toBe("briefcase");
		});

		it("returns empty string when icon is 'none' (user explicitly hid it)", () => {
			const data = {
				...defaultResumeData,
				sections: {
					...defaultResumeData.sections,
					skills: { ...defaultResumeData.sections.skills, icon: "none" },
				},
			};
			expect(getResumeSectionIcon(data, "skills")).toBe("");
		});

		it("returns correct default icons for all built-in sections", () => {
			const data = {
				...defaultResumeData,
				sections: {
					profiles: { ...defaultResumeData.sections.profiles, icon: "" },
					experience: { ...defaultResumeData.sections.experience, icon: "" },
					education: { ...defaultResumeData.sections.education, icon: "" },
					projects: { ...defaultResumeData.sections.projects, icon: "" },
					skills: { ...defaultResumeData.sections.skills, icon: "" },
					languages: { ...defaultResumeData.sections.languages, icon: "" },
					interests: { ...defaultResumeData.sections.interests, icon: "" },
					awards: { ...defaultResumeData.sections.awards, icon: "" },
					certifications: { ...defaultResumeData.sections.certifications, icon: "" },
					publications: { ...defaultResumeData.sections.publications, icon: "" },
					volunteer: { ...defaultResumeData.sections.volunteer, icon: "" },
					references: { ...defaultResumeData.sections.references, icon: "" },
				},
			};

			expect(getResumeSectionIcon(data, "profiles")).toBe("messenger-logo");
			expect(getResumeSectionIcon(data, "experience")).toBe("briefcase");
			expect(getResumeSectionIcon(data, "education")).toBe("graduation-cap");
			expect(getResumeSectionIcon(data, "projects")).toBe("code-simple");
			expect(getResumeSectionIcon(data, "skills")).toBe("compass-tool");
			expect(getResumeSectionIcon(data, "languages")).toBe("translate");
			expect(getResumeSectionIcon(data, "interests")).toBe("football");
			expect(getResumeSectionIcon(data, "awards")).toBe("trophy");
			expect(getResumeSectionIcon(data, "certifications")).toBe("certificate");
			expect(getResumeSectionIcon(data, "publications")).toBe("books");
			expect(getResumeSectionIcon(data, "volunteer")).toBe("hand-heart");
			expect(getResumeSectionIcon(data, "references")).toBe("phone");
		});
	});

	describe("summary section", () => {
		it("returns the icon from summary data when set", () => {
			const data = {
				...defaultResumeData,
				summary: { ...defaultResumeData.summary, icon: "notebook" },
			};
			expect(getResumeSectionIcon(data, "summary")).toBe("notebook");
		});

		it("falls back to default 'article' when summary icon is empty", () => {
			const data = {
				...defaultResumeData,
				summary: { ...defaultResumeData.summary, icon: "" },
			};
			expect(getResumeSectionIcon(data, "summary")).toBe("article");
		});

		it("returns empty when summary icon is 'none'", () => {
			const data = {
				...defaultResumeData,
				summary: { ...defaultResumeData.summary, icon: "none" },
			};
			expect(getResumeSectionIcon(data, "summary")).toBe("");
		});
	});

	describe("custom sections", () => {
		it("returns the icon from custom section data when set", () => {
			const data = {
				...defaultResumeData,
				customSections: [
					{
						id: "custom-1",
						type: "experience" as const,
						title: "Freelance",
						icon: "lightning",
						columns: 1,
						hidden: false,
						keepTogether: false,
						startOnNewPage: false,
						items: [],
					},
				],
			};
			expect(getResumeSectionIcon(data, "custom-1")).toBe("lightning");
		});

		it("falls back to the base type default when custom section icon is empty", () => {
			const data = {
				...defaultResumeData,
				customSections: [
					{
						id: "custom-1",
						type: "education" as const,
						title: "Courses",
						icon: "",
						columns: 1,
						hidden: false,
						keepTogether: false,
						startOnNewPage: false,
						items: [],
					},
				],
			};
			expect(getResumeSectionIcon(data, "custom-1")).toBe("graduation-cap");
		});

		it("falls back to the cover letter default for cover-letter custom sections", () => {
			const data = {
				...defaultResumeData,
				customSections: [
					{
						id: "custom-cover-letter",
						type: "cover-letter" as const,
						title: "Cover Letter",
						icon: "",
						columns: 1,
						hidden: false,
						keepTogether: false,
						startOnNewPage: false,
						items: [],
					},
				],
			};
			expect(getResumeSectionIcon(data, "custom-cover-letter")).toBe("envelope-simple");
		});

		it("returns empty when custom section icon is 'none'", () => {
			const data = {
				...defaultResumeData,
				customSections: [
					{
						id: "custom-1",
						type: "experience" as const,
						title: "Side Projects",
						icon: "none",
						columns: 1,
						hidden: false,
						keepTogether: false,
						startOnNewPage: false,
						items: [],
					},
				],
			};
			expect(getResumeSectionIcon(data, "custom-1")).toBe("");
		});

		it("returns empty string for non-existent section id", () => {
			expect(getResumeSectionIcon(defaultResumeData, "non-existent-id")).toBe("");
		});
	});
});
