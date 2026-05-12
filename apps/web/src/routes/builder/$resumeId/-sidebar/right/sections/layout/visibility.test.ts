import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { filterVisibleLayoutSectionIds } from "./visibility";

const createResumeData = (): ResumeData => structuredClone(defaultResumeData);

describe("filterVisibleLayoutSectionIds", () => {
	it("removes item-backed sections with no visible items", () => {
		const data = createResumeData();
		data.sections.experience.items = [
			{ hidden: false, company: "Reactive Resume" },
			{ hidden: true, company: "Hidden Company" },
		] as never;
		data.sections.references.items = [{ hidden: true, name: "Hidden Reference" }] as never;

		expect(filterVisibleLayoutSectionIds(["experience", "volunteer", "references"], data)).toEqual(["experience"]);
	});

	it("keeps layout order for non-empty summary and custom sections", () => {
		const data = createResumeData();
		data.summary.content = "<p>Available for staff roles.</p>";
		data.customSections = [
			{
				id: "custom-visible",
				type: "projects",
				title: "Selected Work",
				columns: 1,
				hidden: false,
				items: [{ hidden: false, name: "Resume Builder" }],
			},
			{
				id: "custom-empty",
				type: "projects",
				title: "Empty Work",
				columns: 1,
				hidden: false,
				items: [],
			},
		] as never;

		expect(filterVisibleLayoutSectionIds(["custom-empty", "summary", "custom-visible"], data)).toEqual([
			"summary",
			"custom-visible",
		]);
	});
});
