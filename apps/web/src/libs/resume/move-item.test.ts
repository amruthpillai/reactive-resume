import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { produce } from "immer";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import {
	addItemToSection,
	createCustomSectionWithItem,
	createPageWithSection,
	getCompatibleMoveTargets,
	getSourceSectionTitle,
	removeItemFromSource,
} from "./move-item";

beforeAll(() => {
	// Lingui requires an active locale before t`...` macros can render.
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("getSourceSectionTitle", () => {
	it("returns custom section title for custom sections", () => {
		const data = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "ext-1",
				type: "cover-letter",
				title: "My Custom Title",
				icon: "",
				columns: 1,
				hidden: false,
				items: [],
			});
		});
		expect(getSourceSectionTitle(data, "cover-letter", "ext-1")).toBe("My Custom Title");
	});

	it("returns localized default title when customSectionId is undefined", () => {
		// Default section title comes from t`...` macro — we just check it's a non-empty string
		expect(getSourceSectionTitle(defaultResumeData, "experience").length).toBeGreaterThan(0);
	});

	it("falls back to default title when custom section is not found", () => {
		expect(getSourceSectionTitle(defaultResumeData, "experience", "non-existent").length).toBeGreaterThan(0);
	});
});

describe("getCompatibleMoveTargets", () => {
	it("excludes the source section itself", () => {
		// Default has experience in main; trying to move from experience to other targets
		const targets = getCompatibleMoveTargets(defaultResumeData, "experience", undefined);
		expect(targets[0]?.sections.find((s) => s.sectionId === "experience")).toBeUndefined();
	});

	it("returns only custom sections of the same type as source", () => {
		const data = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "ext-1",
				type: "cover-letter",
				title: "Cover Letter",
				icon: "",
				columns: 1,
				hidden: false,
				items: [],
			});
			draft.metadata.layout.pages[0].main.push("ext-1");
		});

		// Source is also a cover-letter custom section, but with different id
		const targets = getCompatibleMoveTargets(data, "cover-letter", "different-id");
		expect(targets[0]?.sections.find((s) => s.sectionId === "ext-1")).toBeDefined();
	});

	it("returns empty per page when no compatible targets", () => {
		const targets = getCompatibleMoveTargets(defaultResumeData, "cover-letter", undefined);
		// No custom sections of cover-letter type in default
		for (const page of targets) {
			expect(page.sections).toHaveLength(0);
		}
	});

	it("returns one entry per page", () => {
		const targets = getCompatibleMoveTargets(defaultResumeData, "experience", undefined);
		expect(targets).toHaveLength(defaultResumeData.metadata.layout.pages.length);
	});
});

describe("removeItemFromSource", () => {
	it("removes an item from a built-in section and returns its id", () => {
		const initial = produce(defaultResumeData, (draft) => {
			draft.sections.skills.items.push({
				id: "skill-1",
				hidden: false,
				icon: "",
				iconColor: "",
				name: "Go",
				proficiency: "",
				level: 4,
				keywords: [],
			});
		});

		// Capture the id before produce revokes the draft proxy.
		let removedId: string | undefined;
		const result = produce(initial, (draft) => {
			const removed = removeItemFromSource(draft, "skill-1", "skills");
			removedId = (removed as { id: string } | null)?.id;
		});

		expect(result.sections.skills.items).toHaveLength(0);
		expect(removedId).toBe("skill-1");
	});

	it("returns null when item id is not found in built-in section", () => {
		let removed: unknown;
		produce(defaultResumeData, (draft) => {
			removed = removeItemFromSource(draft, "non-existent", "skills");
		});
		expect(removed).toBeNull();
	});

	it("removes an item from a custom section and returns its id", () => {
		const initial = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "ext-1",
				type: "cover-letter",
				title: "",
				icon: "",
				columns: 1,
				hidden: false,
				items: [{ id: "i1" } as never],
			});
		});

		let removedId: string | undefined;
		const result = produce(initial, (draft) => {
			const removed = removeItemFromSource(draft, "i1", "cover-letter", "ext-1");
			removedId = (removed as { id?: string } | null)?.id;
		});

		expect(result.customSections[0]?.items).toHaveLength(0);
		expect(removedId).toBe("i1");
	});

	it("returns null when custom section does not exist", () => {
		let removed: unknown;
		produce(defaultResumeData, (draft) => {
			removed = removeItemFromSource(draft, "i1", "cover-letter", "non-existent");
		});
		expect(removed).toBeNull();
	});
});

describe("addItemToSection", () => {
	it("adds to a matching built-in section", () => {
		const item = {
			id: "skill-x",
			hidden: false,
			icon: "",
			iconColor: "",
			name: "Rust",
			proficiency: "",
			level: 4,
			keywords: [],
		};

		const result = produce(defaultResumeData, (draft) => {
			addItemToSection(draft, item, "skills", "skills");
		});

		expect(result.sections.skills.items).toHaveLength(1);
	});

	it("adds to a custom section by id", () => {
		const initial = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "ext-1",
				type: "cover-letter",
				title: "",
				icon: "",
				columns: 1,
				hidden: false,
				items: [],
			});
		});

		const result = produce(initial, (draft) => {
			addItemToSection(draft, { id: "i1" } as never, "ext-1", "cover-letter");
		});

		expect(result.customSections[0]?.items).toHaveLength(1);
	});

	it("does not add when target id does not match anything", () => {
		const result = produce(defaultResumeData, (draft) => {
			addItemToSection(draft, { id: "x" } as never, "non-existent", "skills");
		});
		expect(result.sections.skills.items).toHaveLength(0);
	});
});

describe("createCustomSectionWithItem", () => {
	it("creates a new custom section and adds it to the target page main", () => {
		let newSectionId = "";
		const result = produce(defaultResumeData, (draft) => {
			newSectionId = createCustomSectionWithItem(draft, { id: "i1" } as never, "cover-letter", "My Section", 0);
		});

		expect(result.customSections).toHaveLength(1);
		expect(result.customSections[0]?.title).toBe("My Section");
		expect(result.customSections[0]?.items).toHaveLength(1);
		expect(result.metadata.layout.pages[0]?.main).toContain(newSectionId);
	});

	it("returns the generated section id", () => {
		let newSectionId = "";
		produce(defaultResumeData, (draft) => {
			newSectionId = createCustomSectionWithItem(draft, { id: "i1" } as never, "cover-letter", "X", 0);
		});
		expect(newSectionId.length).toBeGreaterThan(0);
	});

	it("does not crash on out-of-range page index (no main column to push to)", () => {
		// targetPageIndex=99 — page does not exist; section should still be created
		const result = produce(defaultResumeData, (draft) => {
			createCustomSectionWithItem(draft, { id: "i1" } as never, "cover-letter", "X", 99);
		});
		expect(result.customSections).toHaveLength(1);
	});
});

describe("createPageWithSection", () => {
	it("creates a new page with the new custom section in main", () => {
		const initialPageCount = defaultResumeData.metadata.layout.pages.length;
		const result = produce(defaultResumeData, (draft) => {
			createPageWithSection(draft, { id: "i1" } as never, "cover-letter", "My New Page");
		});
		expect(result.metadata.layout.pages).toHaveLength(initialPageCount + 1);

		const newPage = result.metadata.layout.pages.at(-1);
		expect(newPage?.main).toHaveLength(1);
		expect(newPage?.sidebar).toEqual([]);
		expect(newPage?.fullWidth).toBe(false);
	});

	it("adds the custom section to customSections array", () => {
		const result = produce(defaultResumeData, (draft) => {
			createPageWithSection(draft, { id: "i1" } as never, "cover-letter", "My Section");
		});
		expect(result.customSections).toHaveLength(1);
		expect(result.customSections[0]?.title).toBe("My Section");
	});
});
