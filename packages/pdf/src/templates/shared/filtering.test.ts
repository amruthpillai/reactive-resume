import { describe, expect, it } from "vitest";
import {
	filterItems,
	filterSections,
	hasVisibleItems,
	isSectionVisible,
	isVisibleSummary,
	splitFirstVisibleSection,
} from "./filtering";

describe("filterItems", () => {
	it("returns only items where hidden is false", () => {
		const items = [
			{ id: 1, hidden: false },
			{ id: 2, hidden: true },
			{ id: 3, hidden: false },
		];
		expect(filterItems(items)).toEqual([
			{ id: 1, hidden: false },
			{ id: 3, hidden: false },
		]);
	});

	it("returns empty array when all items are hidden", () => {
		const items = [{ hidden: true }, { hidden: true }];
		expect(filterItems(items)).toEqual([]);
	});

	it("returns empty array for empty input", () => {
		expect(filterItems([])).toEqual([]);
	});

	it("preserves additional properties on items", () => {
		const items = [{ hidden: false, name: "Alice", level: 4 }];
		expect(filterItems(items)).toEqual([{ hidden: false, name: "Alice", level: 4 }]);
	});

	it("filters items with invalid primary titles when a section type is provided", () => {
		const items = [
			{ hidden: false, company: "   ", position: "Engineer" },
			{ hidden: false, company: "Acme", position: "Engineer" },
			{ hidden: false, company: "\n\t", position: "Manager" },
		];

		expect(filterItems(items, "experience")).toEqual([{ hidden: false, company: "Acme", position: "Engineer" }]);
	});

	it("filters invalid experience roles by position", () => {
		const items = [
			{
				hidden: false,
				company: "Acme",
				roles: [
					{ id: "role-1", position: "   ", period: "2020", description: "" },
					{ id: "role-2", position: "Lead Engineer", period: "2021", description: "" },
					{ id: "role-3", position: "\n", period: "2022", description: "" },
				],
			},
		];

		expect(filterItems(items, "experience")).toEqual([
			{
				hidden: false,
				company: "Acme",
				roles: [{ id: "role-2", position: "Lead Engineer", period: "2021", description: "" }],
			},
		]);
	});
});

describe("hasVisibleItems", () => {
	it("returns false when section.hidden is true", () => {
		expect(hasVisibleItems({ hidden: true, items: [{ hidden: false }] })).toBe(false);
	});

	it("returns false when no items are visible", () => {
		expect(hasVisibleItems({ hidden: false, items: [{ hidden: true }] })).toBe(false);
	});

	it("returns true when at least one item is visible and section not hidden", () => {
		expect(hasVisibleItems({ hidden: false, items: [{ hidden: false }] })).toBe(true);
	});

	it("returns false for empty items", () => {
		expect(hasVisibleItems({ hidden: false, items: [] })).toBe(false);
	});

	it("returns false when all items have invalid primary titles", () => {
		expect(hasVisibleItems({ hidden: false, items: [{ hidden: false, school: " " }] }, "education")).toBe(false);
	});
});

describe("isVisibleSummary", () => {
	it("returns true when not hidden and content is non-empty", () => {
		expect(isVisibleSummary({ hidden: false, content: "<p>Some text</p>" })).toBe(true);
	});

	it("returns false when summary is hidden", () => {
		expect(isVisibleSummary({ hidden: true, content: "<p>Text</p>" })).toBe(false);
	});

	it("returns false when content is empty after trimming", () => {
		expect(isVisibleSummary({ hidden: false, content: "  \n  " })).toBe(false);
	});

	it("returns false when content is empty", () => {
		expect(isVisibleSummary({ hidden: false, content: "" })).toBe(false);
	});
});

describe("isSectionVisible", () => {
	const data = {
		summary: { hidden: false, content: "<p>Hi</p>" },
		sections: {
			experience: { hidden: false, items: [{ hidden: false, company: "Acme" }] },
			skills: { hidden: false, items: [] },
			education: { hidden: true, items: [{ hidden: false }] },
		},
		customSections: [{ id: "ext-1", hidden: false, items: [{ hidden: false }] }],
	};

	it("returns true for visible summary", () => {
		expect(isSectionVisible("summary", data)).toBe(true);
	});

	it("returns false for hidden summary", () => {
		expect(isSectionVisible("summary", { ...data, summary: { hidden: true, content: "<p>x</p>" } })).toBe(false);
	});

	it("returns true for built-in section with visible items", () => {
		expect(isSectionVisible("experience", data)).toBe(true);
	});

	it("returns false for built-in section when all items have invalid primary titles", () => {
		expect(
			isSectionVisible("experience", {
				...data,
				sections: { experience: { hidden: false, items: [{ hidden: false, company: "  " }] } },
			}),
		).toBe(false);
	});

	it("returns false for built-in section with no items", () => {
		expect(isSectionVisible("skills", data)).toBe(false);
	});

	it("returns false for built-in section with hidden flag", () => {
		expect(isSectionVisible("education", data)).toBe(false);
	});

	it("returns true for matching custom section by id", () => {
		expect(isSectionVisible("ext-1", data)).toBe(true);
	});

	it("uses custom section type to validate item primary titles", () => {
		expect(
			isSectionVisible("ext-education", {
				...data,
				customSections: [
					{ id: "ext-education", type: "education", hidden: false, items: [{ hidden: false, school: "" }] },
				],
			}),
		).toBe(false);
	});

	it("returns false for unknown section id", () => {
		expect(isSectionVisible("does-not-exist", data)).toBe(false);
	});
});

describe("filterSections", () => {
	const data = {
		summary: { hidden: false, content: "<p>Hi</p>" },
		sections: {
			experience: { hidden: false, items: [{ hidden: false, company: "Acme" }] },
			skills: { hidden: false, items: [] },
		},
		customSections: [],
	};

	it("returns only visible section ids in input order", () => {
		expect(filterSections(["summary", "experience", "skills"], data)).toEqual(["summary", "experience"]);
	});

	it("returns empty array when no sections are visible", () => {
		const empty = {
			summary: { hidden: false, content: "" },
			sections: { skills: { hidden: false, items: [] } },
			customSections: [],
		};
		expect(filterSections(["summary", "skills"], empty)).toEqual([]);
	});

	it("preserves order of input section ids", () => {
		expect(filterSections(["experience", "summary"], data)).toEqual(["experience", "summary"]);
	});
});

describe("splitFirstVisibleSection", () => {
	const data = {
		summary: { hidden: false, content: "<p>Hi</p>" },
		sections: {
			profiles: { hidden: false, items: [] },
			experience: { hidden: false, items: [{ hidden: false, company: "Acme" }] },
			skills: { hidden: false, items: [{ hidden: false, name: "TypeScript" }] },
		},
		customSections: [],
	};

	it("does not promote the next visible section when the configured first section is empty", () => {
		expect(splitFirstVisibleSection(["profiles", "experience", "skills"], data)).toEqual({
			firstSection: undefined,
			remainingSections: ["experience", "skills"],
		});
	});

	it("keeps the configured first section separate when it is visible", () => {
		expect(splitFirstVisibleSection(["summary", "experience", "skills"], data)).toEqual({
			firstSection: "summary",
			remainingSections: ["experience", "skills"],
		});
	});
});
