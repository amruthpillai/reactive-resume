import { describe, expect, it } from "vitest";
import { ReactiveResumeV4JSONImporter } from "./reactive-resume-v4-json";

// Minimal v4 resume JSON to use as base in all tests.
// V4 layout is Array<Array<string[]>>: [ [mainColumn, sidebarColumn] ]
function makeV4Base(overrides: Record<string, unknown> = {}) {
	return {
		basics: {
			name: "Jane Doe",
			headline: "",
			email: "jane@example.com",
			phone: "",
			location: "",
			url: { label: "", href: "" },
			customFields: [],
			picture: {
				url: "",
				size: 64,
				aspectRatio: 1,
				borderRadius: 0,
				effects: { hidden: false, border: false, grayscale: false },
			},
		},
		sections: {
			summary: { name: "Summary", columns: 1, separateLinks: false, visible: false, id: "summary", content: "" },
			awards: { name: "Awards", columns: 1, separateLinks: false, visible: false, id: "awards", items: [] },
			certifications: {
				name: "Certifications",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "certifications",
				items: [],
			},
			education: {
				name: "Education",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "education",
				items: [],
			},
			experience: {
				name: "Experience",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "experience",
				items: [],
			},
			volunteer: {
				name: "Volunteer",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "volunteer",
				items: [],
			},
			interests: {
				name: "Interests",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "interests",
				items: [],
			},
			languages: {
				name: "Languages",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "languages",
				items: [],
			},
			profiles: {
				name: "Profiles",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "profiles",
				items: [],
			},
			projects: {
				name: "Projects",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "projects",
				items: [],
			},
			publications: {
				name: "Publications",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "publications",
				items: [],
			},
			references: {
				name: "References",
				columns: 1,
				separateLinks: false,
				visible: false,
				id: "references",
				items: [],
			},
			skills: { name: "Skills", columns: 1, separateLinks: false, visible: false, id: "skills", items: [] },
			...overrides,
		},
		metadata: {
			template: "onyx",
			layout: [[["experience", "education"], ["skills"]]],
			css: { value: "", visible: false },
			page: { margin: 14, format: "a4" as const, options: { breakLine: false, pageNumbers: false } },
			theme: { background: "#ffffff", text: "#000000", primary: "#dc2626" },
			typography: {
				font: { family: "IBM Plex Serif", subset: "latin", variants: ["regular"], size: 14.67 },
				lineHeight: 1.5,
				hideIcons: false,
				underlineLinks: false,
			},
			notes: "",
		},
	};
}

const importer = new ReactiveResumeV4JSONImporter();

// ─── Bug #2726-A: Custom section items without a name ("description-only") ───

describe("ReactiveResumeV4JSONImporter – custom section description-only items", () => {
	it("puts description in the body (not the title) when item has no name", () => {
		const v4 = makeV4Base({
			custom: {
				techstack: {
					name: "Tech Stack",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "techstack",
					items: [
						{
							id: "item-1",
							visible: true,
							// No 'name' — this is a description-only item
							description: "React, TypeScript, GraphQL",
						},
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const section = result.customSections[0];
		expect(section).toBeDefined();

		const item = section?.items[0] as { company: string; position: string; description: string };
		// company is a required field on experience items; #1 is the expected fallback for nameless items
		expect(item.company).toBe("#1");
		// The description content must appear in the BODY field (not silently discarded)
		expect(item.description).toBe("React, TypeScript, GraphQL");
		// position (subtitle) must be empty — description IS the whole content, not a subtitle
		expect(item.position).toBe("");
	});

	it("uses name as title and description as subtitle when item has a name", () => {
		const v4 = makeV4Base({
			custom: {
				awards: {
					name: "Recognitions",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "custom-awards",
					items: [
						{
							id: "item-2",
							visible: true,
							name: "Best Developer Award",
							description: "Received for outstanding contributions",
						},
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const section = result.customSections[0];
		const item = section?.items[0] as { company: string; position: string; description: string };

		expect(item.company).toBe("Best Developer Award");
		expect(item.position).toBe("Received for outstanding contributions");
	});

	it("falls back to summary for the body when both summary and description are present", () => {
		const v4 = makeV4Base({
			custom: {
				extra: {
					name: "Extra",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "extra",
					items: [
						{
							id: "item-3",
							visible: true,
							// No name — description-only
							description: "plain text fallback",
							summary: "<p>Rich HTML content</p>",
						},
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const item = result.customSections[0]?.items[0] as { description: string };
		// summary takes priority over description
		expect(item.description).toBe("<p>Rich HTML content</p>");
	});

	it("treats whitespace-only name the same as missing name", () => {
		const v4 = makeV4Base({
			custom: {
				ws: {
					name: "Whitespace",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "ws",
					items: [
						{
							id: "item-ws",
							visible: true,
							name: "   ",
							description: "Content goes here",
						},
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const item = result.customSections[0]?.items[0] as { company: string; position: string; description: string };
		expect(item.company).toBe("#1");
		expect(item.position).toBe("");
		expect(item.description).toBe("Content goes here");
	});

	it("defaults item to visible when 'visible' field is missing in v4 data", () => {
		const v4 = makeV4Base({
			custom: {
				test: {
					name: "Test",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "test",
					items: [
						{
							id: "item-no-vis",
							// 'visible' intentionally omitted
							name: "Some Item",
						},
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const item = result.customSections[0]?.items[0] as { hidden: boolean };
		// Should default to visible (hidden=false), consistent with all other sections
		expect(item.hidden).toBe(false);
	});

	it("preserves hidden items as hidden=true instead of dropping them", () => {
		const v4 = makeV4Base({
			custom: {
				test: {
					name: "Test",
					columns: 1,
					separateLinks: false,
					visible: true,
					id: "test",
					items: [
						{ id: "visible-item", visible: true, name: "Visible Item" },
						{ id: "hidden-item", visible: false, name: "Hidden Item" },
					],
				},
			},
		});

		const result = importer.parse(JSON.stringify(v4));
		const section = result.customSections[0];
		// Both items must migrate — hidden items must NOT be dropped
		expect(section?.items).toHaveLength(2);
		const hiddenItem = section?.items.find((i) => (i as { id: string }).id === "hidden-item") as
			| { hidden: boolean }
			| undefined;
		expect(hiddenItem?.hidden).toBe(true);
	});
});

// ─── Bug #2726-B: Skill / Language levels incorrectly clamped to max ──────────

describe("ReactiveResumeV4JSONImporter – skill level scaling (v4: 0-10 → v5: 0-5)", () => {
	function makeWithSkills(items: Array<{ id: string; visible: boolean; name: string; level: number }>) {
		return makeV4Base({
			skills: {
				name: "Skills",
				columns: 1,
				separateLinks: false,
				visible: true,
				id: "skills",
				items,
			},
		});
	}

	it("scales level 10 → 5", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s1", visible: true, name: "TypeScript", level: 10 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(5);
	});

	it("scales level 8 → 4 (not 5)", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s2", visible: true, name: "React", level: 8 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(4);
	});

	it("scales level 6 → 3 (not 5)", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s3", visible: true, name: "GraphQL", level: 6 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(3);
	});

	it("scales level 5 → 3 (rounds 2.5 up)", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s4", visible: true, name: "Node", level: 5 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(3);
	});

	it("keeps level 0 → 0 (hides the visual indicator)", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s5", visible: true, name: "Rust", level: 0 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(0);
	});

	it("clamps negative level to 0", () => {
		const result = importer.parse(JSON.stringify(makeWithSkills([{ id: "s6", visible: true, name: "Go", level: -3 }])));
		expect(result.sections.skills.items[0]?.level).toBe(0);
	});

	it("clamps level above 10 to 5", () => {
		const result = importer.parse(
			JSON.stringify(makeWithSkills([{ id: "s7", visible: true, name: "C++", level: 15 }])),
		);
		expect(result.sections.skills.items[0]?.level).toBe(5);
	});
});

describe("ReactiveResumeV4JSONImporter – language level scaling (v4: 0-10 → v5: 0-5)", () => {
	function makeWithLanguages(items: Array<{ id: string; visible: boolean; name: string; level: number }>) {
		return makeV4Base({
			languages: {
				name: "Languages",
				columns: 1,
				separateLinks: false,
				visible: true,
				id: "languages",
				items,
			},
		});
	}

	it("scales level 10 → 5", () => {
		const result = importer.parse(
			JSON.stringify(makeWithLanguages([{ id: "l1", visible: true, name: "Spanish", level: 10 }])),
		);
		expect(result.sections.languages.items[0]?.level).toBe(5);
	});

	it("scales level 6 → 3 (not 5)", () => {
		const result = importer.parse(
			JSON.stringify(makeWithLanguages([{ id: "l2", visible: true, name: "French", level: 6 }])),
		);
		expect(result.sections.languages.items[0]?.level).toBe(3);
	});
});
