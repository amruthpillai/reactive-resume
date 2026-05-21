import { describe, expect, it } from "vitest";
import {
	baseItemSchema,
	basicsSchema,
	customFieldSchema,
	experienceItemSchema,
	layoutSchema,
	pageSchema,
	pictureSchema,
	resumeDataSchema,
	skillItemSchema,
	typographySchema,
	websiteSchema,
} from "./data";
import { defaultResumeData } from "./default";

describe("resumeDataSchema", () => {
	it("validates the default resume", () => {
		expect(resumeDataSchema.safeParse(defaultResumeData).success).toBe(true);
	});

	it("rejects empty object", () => {
		expect(resumeDataSchema.safeParse({}).success).toBe(false);
	});

	it("rejects missing top-level keys", () => {
		const partial = { ...defaultResumeData, basics: undefined };
		expect(resumeDataSchema.safeParse(partial).success).toBe(false);
	});
});

describe("websiteSchema", () => {
	it("requires url and label fields", () => {
		expect(websiteSchema.safeParse({ url: "https://example.com", label: "Example" }).success).toBe(true);
	});

	it("rejects missing url", () => {
		expect(websiteSchema.safeParse({ label: "Example" }).success).toBe(false);
	});

	it("rejects missing label", () => {
		expect(websiteSchema.safeParse({ url: "https://example.com" }).success).toBe(false);
	});

	it("allows empty strings (caller decides display)", () => {
		expect(websiteSchema.safeParse({ url: "", label: "" }).success).toBe(true);
	});
});

describe("pictureSchema", () => {
	it("accepts the default picture config", () => {
		expect(pictureSchema.safeParse(defaultResumeData.picture).success).toBe(true);
	});

	it("rejects size below 32", () => {
		const invalid = { ...defaultResumeData.picture, size: 16 };
		expect(pictureSchema.safeParse(invalid).success).toBe(false);
	});

	it("rejects size above 512", () => {
		const invalid = { ...defaultResumeData.picture, size: 1024 };
		expect(pictureSchema.safeParse(invalid).success).toBe(false);
	});

	it("rejects rotation below 0", () => {
		const invalid = { ...defaultResumeData.picture, rotation: -1 };
		expect(pictureSchema.safeParse(invalid).success).toBe(false);
	});

	it("rejects rotation above 360", () => {
		const invalid = { ...defaultResumeData.picture, rotation: 361 };
		expect(pictureSchema.safeParse(invalid).success).toBe(false);
	});
});

describe("basicsSchema", () => {
	it("validates default basics", () => {
		expect(basicsSchema.safeParse(defaultResumeData.basics).success).toBe(true);
	});

	it("requires email to be a string but does not enforce email shape (catches at app level)", () => {
		const result = basicsSchema.safeParse({
			...defaultResumeData.basics,
			email: "not-an-email",
		});
		expect(result.success).toBe(true);
	});

	it("supports customFields array", () => {
		const result = basicsSchema.safeParse({
			...defaultResumeData.basics,
			customFields: [{ id: "1", icon: "phone", text: "555-0000", link: "" }],
		});
		expect(result.success).toBe(true);
	});
});

describe("customFieldSchema", () => {
	it("requires id, icon, and text", () => {
		const result = customFieldSchema.safeParse({
			id: "1",
			icon: "phone",
			text: "555-0000",
			link: "",
		});
		expect(result.success).toBe(true);
	});

	it("rejects missing id", () => {
		expect(customFieldSchema.safeParse({ icon: "phone", text: "555-0000", link: "" }).success).toBe(false);
	});

	it("falls back to empty link via .catch when missing", () => {
		const result = customFieldSchema.safeParse({ id: "1", icon: "phone", text: "x" });
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.link).toBe("");
	});
});

describe("experienceItemSchema", () => {
	it("requires company name (min 1)", () => {
		const result = experienceItemSchema.safeParse({
			id: "abcdef0123456789",
			hidden: false,
			company: "",
			position: "Engineer",
			location: "",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
		});
		expect(result.success).toBe(false);
	});

	it("validates a complete experience item", () => {
		const result = experienceItemSchema.safeParse({
			id: "abcdef0123456789",
			hidden: false,
			company: "Acme",
			position: "Engineer",
			location: "NYC",
			period: "2020 - 2023",
			website: { url: "https://acme.com", label: "Acme", inlineLink: false },
			description: "<p>Did things</p>",
			roles: [],
		});
		expect(result.success).toBe(true);
	});

	it("defaults roles to [] via .catch when missing", () => {
		const result = experienceItemSchema.safeParse({
			id: "x",
			hidden: false,
			company: "Acme",
			position: "",
			location: "",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			description: "",
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.roles).toEqual([]);
	});
});

describe("skillItemSchema", () => {
	it("requires name (min 1)", () => {
		const invalid = {
			id: "x",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "",
			proficiency: "",
			level: 4,
			keywords: [],
		};
		expect(skillItemSchema.safeParse(invalid).success).toBe(false);
	});

	it("clamps invalid level via .catch(0)", () => {
		const item = {
			id: "x",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "TS",
			proficiency: "",
			level: 99,
			keywords: [],
		};
		const result = skillItemSchema.safeParse(item);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.level).toBe(0);
	});

	it("allows level between 0 and 5", () => {
		for (const level of [0, 1, 2, 3, 4, 5]) {
			const item = {
				id: "x",
				hidden: false,
				icon: "",
				iconColor: "",
				name: "X",
				proficiency: "",
				level,
				keywords: [],
			};
			expect(skillItemSchema.safeParse(item).success).toBe(true);
		}
	});

	it("falls back to empty array when keywords is invalid via .catch", () => {
		const item = {
			id: "x",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "X",
			proficiency: "",
			level: 3,
			keywords: "not-an-array",
		};
		const result = skillItemSchema.safeParse(item);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.keywords).toEqual([]);
	});
});

describe("layoutSchema", () => {
	it("validates default layout", () => {
		expect(layoutSchema.safeParse(defaultResumeData.metadata.layout).success).toBe(true);
	});

	it("clamps sidebarWidth out-of-range to 35", () => {
		const result = layoutSchema.safeParse({
			...defaultResumeData.metadata.layout,
			sidebarWidth: 999,
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.sidebarWidth).toBe(35);
	});

	it("clamps sidebarWidth below 10 to 35", () => {
		const result = layoutSchema.safeParse({
			...defaultResumeData.metadata.layout,
			sidebarWidth: 5,
		});
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.sidebarWidth).toBe(35);
	});
});

describe("pageSchema", () => {
	it("rejects negative gap or margin values", () => {
		const invalid = { ...defaultResumeData.metadata.page, gapX: -1 };
		expect(pageSchema.safeParse(invalid).success).toBe(false);
	});

	it("falls back to 'a4' for unknown format via .catch", () => {
		const invalid = { ...defaultResumeData.metadata.page, format: "huge" };
		const result = pageSchema.safeParse(invalid);
		expect(result.success).toBe(true);
		if (result.success) expect(result.data.format).toBe("a4");
	});

	it("accepts each known format", () => {
		for (const format of ["a4", "letter", "free-form"] as const) {
			const valid = { ...defaultResumeData.metadata.page, format };
			expect(pageSchema.safeParse(valid).success).toBe(true);
		}
	});
});

describe("typographySchema — slots", () => {
	it("defaults slots to empty object when absent", () => {
		const result = typographySchema.safeParse({
			body: { fontFamily: "IBM Plex Serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
			heading: { fontFamily: "IBM Plex Serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
		});
		expect(result.success).toBe(true);
		expect(result.data?.slots).toEqual({});
	});

	it("accepts slot overrides with partial fields", () => {
		const result = typographySchema.safeParse({
			body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
			heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
			slots: {
				name: { fontFamily: "Playfair Display", fontSize: 28, fontWeight: 700 },
				caption: { fontSize: 8.5 },
			},
		});
		expect(result.success).toBe(true);
		expect(result.data?.slots.name?.fontFamily).toBe("Playfair Display");
		expect(result.data?.slots.caption?.fontSize).toBe(8.5);
	});
});

describe("layoutSchema — sidebarPosition", () => {
	it("defaults sidebarPosition to undefined when absent", () => {
		const result = layoutSchema.safeParse({
			sidebarWidth: 35,
			pages: [{ fullWidth: false, main: ["experience"], sidebar: [] }],
		});
		expect(result.success).toBe(true);
		expect(result.data?.sidebarPosition).toBeUndefined();
	});

	it("accepts sidebarPosition left or right", () => {
		for (const pos of ["left", "right"] as const) {
			const result = layoutSchema.safeParse({ sidebarWidth: 35, pages: [], sidebarPosition: pos });
			expect(result.success).toBe(true);
			expect(result.data?.sidebarPosition).toBe(pos);
		}
	});
});

describe("baseItemSchema — extensions", () => {
	it("accepts extensions as a record of unknown values", () => {
		const result = baseItemSchema.safeParse({
			id: "item-1",
			hidden: false,
			extensions: { additionalHtml: "<p>extra</p>", logoUrl: "https://example.com/logo.png" },
		});
		expect(result.success).toBe(true);
		expect(result.data?.extensions).toEqual({
			additionalHtml: "<p>extra</p>",
			logoUrl: "https://example.com/logo.png",
		});
	});

	it("defaults extensions to empty object when absent", () => {
		const result = baseItemSchema.safeParse({ id: "item-1", hidden: false });
		expect(result.success).toBe(true);
		expect(result.data?.extensions).toEqual({});
	});

	it("defaults extensions to empty object when null is passed", () => {
		const result = baseItemSchema.safeParse({ id: "item-1", hidden: false, extensions: null });
		expect(result.success).toBe(true);
		expect(result.data?.extensions).toEqual({});
	});

	it("experienceItemSchema inherits extensions from baseItemSchema", () => {
		const result = experienceItemSchema.safeParse({
			id: "exp-1",
			hidden: false,
			company: "Acme",
			position: "Engineer",
			location: "",
			period: "",
			website: { url: "", label: "", inlineLink: false },
			description: "",
			roles: [],
			extensions: { logoUrl: "https://example.com/logo.png" },
		});
		expect(result.success).toBe(true);
		expect(result.data?.extensions?.logoUrl).toBe("https://example.com/logo.png");
	});
});
