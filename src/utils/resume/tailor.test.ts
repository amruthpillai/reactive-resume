import { describe, expect, it } from "vitest";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData } from "@/schema/resume/data";
import type { TailorOutput } from "@/schema/tailor";
import { buildSkillSyncOperations, sanitizeText, tailorOutputToPatches, validateTailorOutput } from "./tailor";

// Helper to create resume data with experience, skills, and references
function makeResumeData(overrides?: {
	experiences?: ResumeData["sections"]["experience"]["items"];
	skills?: ResumeData["sections"]["skills"]["items"];
	references?: ResumeData["sections"]["references"]["items"];
}): ResumeData {
	return {
		...defaultResumeData,
		summary: { ...defaultResumeData.summary, content: "<p>Original summary</p>" },
		sections: {
			...defaultResumeData.sections,
			experience: {
				...defaultResumeData.sections.experience,
				items: overrides?.experiences ?? [
					{
						id: "exp-1",
						hidden: false,
						company: "TechCorp",
						position: "Engineer",
						location: "NYC",
						period: "2020-2024",
						website: { url: "", label: "" },
						description: "<p>Original description</p>",
						roles: [
							{ id: "role-1", position: "Senior", period: "2022-2024", description: "<p>Senior role</p>" },
							{ id: "role-2", position: "Junior", period: "2020-2022", description: "<p>Junior role</p>" },
						],
					},
					{
						id: "exp-2",
						hidden: false,
						company: "StartupInc",
						position: "Developer",
						location: "Remote",
						period: "2018-2020",
						website: { url: "", label: "" },
						description: "<p>Startup description</p>",
						roles: [],
					},
				],
			},
			skills: {
				...defaultResumeData.sections.skills,
				items: overrides?.skills ?? [
					{
						id: "skill-0",
						hidden: false,
						icon: "",
						name: "JavaScript",
						proficiency: "Advanced",
						level: 4,
						keywords: ["React", "Node.js"],
					},
					{
						id: "skill-1",
						hidden: false,
						icon: "",
						name: "Python",
						proficiency: "Intermediate",
						level: 3,
						keywords: ["Django"],
					},
					{
						id: "skill-2",
						hidden: true,
						icon: "",
						name: "Photography",
						proficiency: "",
						level: 0,
						keywords: [],
					},
				],
			},
			references: {
				...defaultResumeData.sections.references,
				items: overrides?.references ?? [
					{
						id: "ref-1",
						hidden: false,
						name: "Jane Smith",
						position: "Engineering Manager",
						website: { url: "", label: "" },
						phone: "555-1234",
						description: "<p>Jane was my direct manager at TechCorp.</p>",
					},
					{
						id: "ref-2",
						hidden: false,
						name: "Bob Jones",
						position: "CTO at StartupInc",
						website: { url: "", label: "" },
						phone: "555-5678",
						description: "<p>Bob can speak to my contributions.</p>",
					},
				],
			},
		},
	};
}

const emptyTailorOutput: TailorOutput = {
	summary: { content: "" },
	experiences: [],
	references: [],
	skills: [],
};

// --- sanitizeText ---

describe("sanitizeText", () => {
	it("replaces emdash and endash with hyphen", () => {
		expect(sanitizeText("2020\u20132024")).toBe("2020-2024");
		expect(sanitizeText("skills \u2014 leadership")).toBe("skills - leadership");
	});

	it("replaces curly quotes with straight quotes", () => {
		expect(sanitizeText("\u201CHello\u201D")).toBe('"Hello"');
		expect(sanitizeText("\u2018world\u2019")).toBe("'world'");
	});

	it("replaces ellipsis character with three dots", () => {
		expect(sanitizeText("and more\u2026")).toBe("and more...");
	});

	it("replaces non-breaking and special whitespace with standard space", () => {
		expect(sanitizeText("hello\u00A0world")).toBe("hello world");
		expect(sanitizeText("thin\u2009space")).toBe("thin space");
	});

	it("removes Unicode bullet characters", () => {
		expect(sanitizeText("\u2022 item one")).toBe(" item one");
		expect(sanitizeText("\u2219 item two")).toBe(" item two");
	});

	it("leaves normal ASCII text unchanged", () => {
		expect(sanitizeText("<p>Normal text - with hyphens.</p>")).toBe("<p>Normal text - with hyphens.</p>");
	});
});

// --- tailorOutputToPatches ---

describe("tailorOutputToPatches", () => {
	it("generates summary replace patch", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			summary: { content: "<p>Tailored summary</p>" },
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/summary/content",
			value: "<p>Tailored summary</p>",
		});
	});

	it("sanitizes summary content", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			summary: { content: "<p>Expert \u2014 Full Stack Developer</p>" },
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const summaryOp = operations.find((op) => op.path === "/summary/content");
		expect(summaryOp?.value).toBe("<p>Expert - Full Stack Developer</p>");
	});

	it("skips summary patch when content is empty", () => {
		const { operations } = tailorOutputToPatches(emptyTailorOutput, makeResumeData());

		const summaryOps = operations.filter((op) => op.path === "/summary/content");
		expect(summaryOps).toHaveLength(0);
	});

	it("generates experience description patches", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 0, description: "<p>Tailored exp</p>" }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/experience/items/0/description",
			value: "<p>Tailored exp</p>",
		});
	});

	it("sanitizes experience descriptions", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 0, description: "<p>Led team \u2013 built \u201Cgreat\u201D things</p>" }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const expOp = operations.find((op) => op.path === "/sections/experience/items/0/description");
		expect(expOp?.value).toBe('<p>Led team - built "great" things</p>');
	});

	it("handles role progression with nested role patches", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [
				{
					index: 0,
					description: "<p>Main desc</p>",
					roles: [
						{ index: 0, description: "<p>Tailored senior</p>" },
						{ index: 1, description: "<p>Tailored junior</p>" },
					],
				},
			],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/experience/items/0/roles/0/description",
			value: "<p>Tailored senior</p>",
		});
		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/experience/items/0/roles/1/description",
			value: "<p>Tailored junior</p>",
		});
	});

	it("generates reference description patches", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [
				{ index: 0, description: "<p>Jane supervised my engineering work and can speak to my technical skills.</p>" },
			],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/references/items/0/description",
			value: "<p>Jane supervised my engineering work and can speak to my technical skills.</p>",
		});
	});

	it("generates patches for multiple references", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [
				{ index: 0, description: "<p>Ref 0 tailored</p>" },
				{ index: 1, description: "<p>Ref 1 tailored</p>" },
			],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/references/items/0/description",
			value: "<p>Ref 0 tailored</p>",
		});
		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/references/items/1/description",
			value: "<p>Ref 1 tailored</p>",
		});
	});

	it("sanitizes reference descriptions", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [{ index: 0, description: "<p>Jane\u2019s team \u2014 excellent work</p>" }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const refOp = operations.find((op) => op.path === "/sections/references/items/0/description");
		expect(refOp?.value).toBe("<p>Jane's team - excellent work</p>");
	});

	it("ignores out-of-bounds reference indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [{ index: 99, description: "<p>Bad ref</p>" }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const refOps = operations.filter((op) => op.path.includes("/references/"));
		expect(refOps).toHaveLength(0);
	});

	it("hides all existing skills and adds curated skills", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [{ name: "React", keywords: ["Hooks", "JSX"], proficiency: "Developer", icon: "code", isNew: false }],
		};

		const resumeData = makeResumeData();
		const { operations } = tailorOutputToPatches(output, resumeData);

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/skills/items/0/hidden",
			value: true,
		});
		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/skills/items/1/hidden",
			value: true,
		});

		// Already-hidden skill (index 2) should not get a redundant hide op
		const hideSkill2 = operations.find((op) => op.path === "/sections/skills/items/2/hidden");
		expect(hideSkill2).toBeUndefined();

		const addOp = operations.find((op) => op.op === "add" && op.path === "/sections/skills/items/-");
		expect(addOp).toBeDefined();
		expect(addOp?.value).toMatchObject({
			name: "React",
			keywords: ["Hooks", "JSX"],
			proficiency: "Developer",
			icon: "code",
			hidden: false,
			level: 0,
		});
		expect(addOp?.value.id).toBeTruthy();
	});

	it("sanitizes skill names and keywords", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [
				{
					name: "Full\u2013Stack Development",
					keywords: ["React \u2014 Frontend", "Node\u2019s Server"],
					proficiency: "\u201CAdvanced\u201D",
					icon: "code",
					isNew: false,
				},
			],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const addOp = operations.find((op) => op.op === "add" && op.path === "/sections/skills/items/-");
		expect(addOp?.value.name).toBe("Full-Stack Development");
		expect(addOp?.value.keywords).toEqual(["React - Frontend", "Node's Server"]);
		expect(addOp?.value.proficiency).toBe('"Advanced"');
	});

	it("returns newSkills only for skills marked isNew", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [
				{ name: "React", keywords: ["Hooks"], proficiency: "Developer", icon: "code", isNew: false },
				{ name: "Docker", keywords: ["K8s"], proficiency: "Intermediate", icon: "cloud", isNew: true },
				{ name: "AWS", keywords: ["EC2", "S3"], proficiency: "Advanced", icon: "cloud", isNew: true },
			],
		};

		const { newSkills } = tailorOutputToPatches(output, makeResumeData());

		expect(newSkills).toEqual([
			{ name: "Docker", keywords: ["K8s"], proficiency: "Intermediate" },
			{ name: "AWS", keywords: ["EC2", "S3"], proficiency: "Advanced" },
		]);
	});

	it("does not return newSkills when all skills are existing", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [{ name: "React", keywords: ["Hooks"], proficiency: "Developer", icon: "code", isNew: false }],
		};

		const { newSkills } = tailorOutputToPatches(output, makeResumeData());
		expect(newSkills).toHaveLength(0);
	});

	it("handles empty skills array without modifying existing skills", () => {
		const { operations } = tailorOutputToPatches(emptyTailorOutput, makeResumeData());

		const skillOps = operations.filter((op) => op.path.includes("/skills/"));
		expect(skillOps).toHaveLength(0);
	});

	it("handles empty experiences, references, and skills gracefully", () => {
		const { operations, newSkills } = tailorOutputToPatches(emptyTailorOutput, makeResumeData());

		expect(operations).toHaveLength(0);
		expect(newSkills).toHaveLength(0);
	});

	it("ignores out-of-bounds experience indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 99, description: "<p>Bad</p>" }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const expOps = operations.filter((op) => op.path.includes("/experience/"));
		expect(expOps).toHaveLength(0);
	});

	it("ignores out-of-bounds role indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 0, description: "<p>Ok</p>", roles: [{ index: 99, description: "<p>Bad role</p>" }] }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const roleOps = operations.filter((op) => op.path.includes("/roles/"));
		expect(roleOps).toHaveLength(0);
	});

	it("generates multiple experience patches at different indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [
				{ index: 0, description: "<p>First</p>" },
				{ index: 1, description: "<p>Second</p>" },
			],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/experience/items/0/description",
			value: "<p>First</p>",
		});
		expect(operations).toContainEqual({
			op: "replace",
			path: "/sections/experience/items/1/description",
			value: "<p>Second</p>",
		});
	});

	it("uses skill icon from AI output", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [{ name: "Cloud", keywords: ["AWS"], proficiency: "Advanced", icon: "cloud", isNew: false }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const addOp = operations.find((op) => op.op === "add" && op.path === "/sections/skills/items/-");
		expect(addOp?.value.icon).toBe("cloud");
	});

	it("defaults empty icon to empty string", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			skills: [{ name: "Cloud", keywords: ["AWS"], proficiency: "Advanced", icon: "", isNew: false }],
		};

		const { operations } = tailorOutputToPatches(output, makeResumeData());

		const addOp = operations.find((op) => op.op === "add" && op.path === "/sections/skills/items/-");
		expect(addOp?.value.icon).toBe("");
	});
});

// --- validateTailorOutput ---

describe("validateTailorOutput", () => {
	it("returns empty array for valid output", () => {
		const output: TailorOutput = {
			summary: { content: "<p>Summary</p>" },
			experiences: [{ index: 0, description: "<p>Desc</p>" }],
			references: [{ index: 0, description: "<p>Ref desc</p>" }],
			skills: [{ name: "React", keywords: ["Hooks"], proficiency: "Advanced", icon: "code", isNew: false }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors).toHaveLength(0);
	});

	it("detects out-of-bounds experience index", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 10, description: "<p>Bad</p>" }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Experience index 10 out of bounds");
	});

	it("detects out-of-bounds role index", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: 0, description: "<p>Ok</p>", roles: [{ index: 5, description: "<p>Bad role</p>" }] }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Role index 5");
	});

	it("detects out-of-bounds reference index", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [{ index: 50, description: "<p>Bad ref</p>" }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors.length).toBeGreaterThan(0);
		expect(errors[0]).toContain("Reference index 50 out of bounds");
	});

	it("handles resume with no items gracefully", () => {
		const emptyResume = makeResumeData({ experiences: [], skills: [], references: [] });

		const output: TailorOutput = {
			summary: { content: "<p>Summary</p>" },
			experiences: [],
			references: [],
			skills: [{ name: "New Skill", keywords: [], proficiency: "", icon: "", isNew: true }],
		};

		const errors = validateTailorOutput(output, emptyResume);
		expect(errors).toHaveLength(0);
	});

	it("detects negative indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			experiences: [{ index: -1, description: "<p>Negative</p>" }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors.length).toBeGreaterThan(0);
	});

	it("detects negative reference indices", () => {
		const output: TailorOutput = {
			...emptyTailorOutput,
			references: [{ index: -1, description: "<p>Negative ref</p>" }],
		};

		const errors = validateTailorOutput(output, makeResumeData());
		expect(errors.length).toBeGreaterThan(0);
	});
});

// --- buildSkillSyncOperations ---

describe("buildSkillSyncOperations", () => {
	it("generates add operations for each skill", () => {
		const skills = [
			{ name: "React", keywords: ["Hooks", "JSX"], proficiency: "Advanced" },
			{ name: "Go", keywords: ["Goroutines"], proficiency: "" },
		];

		const operations = buildSkillSyncOperations(skills);

		expect(operations).toHaveLength(2);
		expect(operations[0].op).toBe("add");
		expect(operations[0].path).toBe("/sections/skills/items/-");
		expect(operations[0].value).toMatchObject({
			name: "React",
			keywords: ["Hooks", "JSX"],
			proficiency: "Advanced",
			hidden: false,
			icon: "",
			level: 0,
		});
		expect(operations[0].value.id).toBeTruthy();
	});

	it("generates unique IDs for each skill", () => {
		const skills = [
			{ name: "A", keywords: [], proficiency: "" },
			{ name: "B", keywords: [], proficiency: "" },
		];

		const operations = buildSkillSyncOperations(skills);

		expect(operations[0].value.id).not.toBe(operations[1].value.id);
	});

	it("returns empty array for empty input", () => {
		const operations = buildSkillSyncOperations([]);
		expect(operations).toHaveLength(0);
	});
});
