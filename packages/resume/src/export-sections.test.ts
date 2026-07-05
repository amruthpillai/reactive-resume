import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { getResumeExportData, resumeHasCoverLetter } from "./export-sections";

describe("resume export sections", () => {
	it("detects visible cover letter sections", () => {
		expect(resumeHasCoverLetter(defaultResumeData)).toBe(false);
		expect(resumeHasCoverLetter(sampleResumeData)).toBe(true);
	});

	it("removes cover letter sections from resume-only exports", () => {
		const data = getResumeExportData(sampleResumeData, "resume");

		expect(data.customSections.some((section) => section.type === "cover-letter")).toBe(false);
		expect(data.metadata.layout.pages.flatMap((page) => [...page.main, ...page.sidebar])).not.toContain(
			"019bef5b-0b3d-7e2a-8a7c-12d9e23a4f6b",
		);
	});

	it("keeps only cover letter sections for cover-letter exports", () => {
		const data = getResumeExportData(sampleResumeData, "cover-letter");

		expect(data.customSections).toHaveLength(1);
		expect(data.customSections[0]?.type).toBe("cover-letter");
		expect(data.metadata.layout.pages).toEqual([
			{ fullWidth: true, main: ["019bef5b-0b3d-7e2a-8a7c-12d9e23a4f6b"], sidebar: [] },
		]);
	});
});
