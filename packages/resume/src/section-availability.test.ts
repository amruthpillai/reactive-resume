import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { getSectionAvailability } from "./section-availability";

describe("section availability", () => {
	it("includes every printable section and records every authored location", () => {
		const data = structuredClone(sampleResumeData);
		const customSection = data.customSections[0];
		const laterPage = data.metadata.layout.pages[2];
		if (!customSection || !laterPage) throw new Error("Sample resume lacks expected section fixtures.");
		const customSectionId = customSection.id;
		laterPage.sidebar.push(customSectionId, customSectionId, "unknown-section");

		const availability = getSectionAvailability(data);
		const sectionIds = availability.map((entry) => entry.sectionId);

		expect(sectionIds).toEqual([
			"summary",
			...Object.keys(data.sections),
			...data.customSections.map((section) => section.id),
		]);
		expect(sectionIds).not.toContain("picture");
		expect(sectionIds).not.toContain("basics");
		expect(sectionIds).not.toContain("custom");
		expect(sectionIds).not.toContain("unknown-section");
		expect(availability.find((entry) => entry.sectionId === customSectionId)?.locations).toEqual([
			{ pageIndex: 1, columnId: "main" },
			{ pageIndex: 2, columnId: "sidebar" },
			{ pageIndex: 2, columnId: "sidebar" },
		]);
	});

	it("derives hidden and placement state independently without mutation", () => {
		const data = structuredClone(sampleResumeData);
		data.sections.experience.hidden = true;
		data.sections.awards.items = [];
		for (const page of data.metadata.layout.pages) {
			page.main = page.main.filter((id) => id !== "experience");
			page.sidebar = page.sidebar.filter((id) => id !== "experience");
			page.main = page.main.filter((id) => id !== "projects");
			page.sidebar = page.sidebar.filter((id) => id !== "projects");
		}
		data.summary.hidden = true;
		const before = structuredClone(data);

		const availability = getSectionAvailability(data);

		expect(availability.find((entry) => entry.sectionId === "experience")).toEqual({
			sectionId: "experience",
			hidden: true,
			locations: [],
		});
		expect(availability.find((entry) => entry.sectionId === "summary")).toEqual({
			sectionId: "summary",
			hidden: true,
			locations: [{ pageIndex: 0, columnId: "main" }],
		});
		expect(availability.find((entry) => entry.sectionId === "projects")).toEqual({
			sectionId: "projects",
			hidden: false,
			locations: [],
		});
		expect(availability.find((entry) => entry.sectionId === "awards")).toEqual({
			sectionId: "awards",
			hidden: false,
			locations: [{ pageIndex: 1, columnId: "main" }],
		});
		expect(data).toEqual(before);
	});
});
