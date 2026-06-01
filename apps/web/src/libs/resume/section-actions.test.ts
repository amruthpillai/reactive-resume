import { describe, expect, it } from "vitest";
import { produce } from "immer";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createSectionItem, updateSectionItem } from "./section-actions";

describe("createSectionItem", () => {
	it("appends to a built-in section's items array", () => {
		const result = produce(defaultResumeData, (draft) => {
			createSectionItem(draft, "skills", { id: "1", name: "Go" });
		});
		expect(result.sections.skills.items).toHaveLength(1);
		expect((result.sections.skills.items[0] as { name?: string })?.name).toBe("Go");
	});

	it("appends to a custom section by id", () => {
		const initial = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "custom-1",
				type: "cover-letter",
				title: "Cover Letter",
				icon: "",
				columns: 1,
				hidden: false,
				items: [],
			});
		});

		const result = produce(initial, (draft) => {
			createSectionItem(draft, "skills", { id: "1", text: "Custom item" }, "custom-1");
		});

		const customSection = result.customSections.find((s) => s.id === "custom-1");
		expect(customSection?.items).toHaveLength(1);
		// Built-in section is untouched
		expect(result.sections.skills.items).toHaveLength(0);
	});

	it("does nothing when customSectionId does not match", () => {
		const result = produce(defaultResumeData, (draft) => {
			createSectionItem(draft, "skills", { id: "1", name: "x" }, "non-existent");
		});
		// Skills not touched, no custom section to modify
		expect(result.sections.skills.items).toHaveLength(0);
	});
});

describe("updateSectionItem", () => {
	it("replaces the matching item in a built-in section", () => {
		const initial = produce(defaultResumeData, (draft) => {
			createSectionItem(draft, "skills", { id: "abc", name: "Go", level: 4 });
		});

		const result = produce(initial, (draft) => {
			updateSectionItem(draft, "skills", { id: "abc", name: "Go", level: 5 });
		});

		const item = result.sections.skills.items[0] as { id?: string; name?: string; level?: number };
		expect(item?.level).toBe(5);
	});

	it("does nothing when item id does not exist", () => {
		const initial = produce(defaultResumeData, (draft) => {
			createSectionItem(draft, "skills", { id: "abc", name: "Go" });
		});

		const before = JSON.stringify(initial.sections.skills);
		const result = produce(initial, (draft) => {
			updateSectionItem(draft, "skills", { id: "non-existent", name: "X" });
		});
		expect(JSON.stringify(result.sections.skills)).toBe(before);
	});

	it("replaces the matching item in a custom section", () => {
		const initial = produce(defaultResumeData, (draft) => {
			draft.customSections.push({
				id: "custom-1",
				type: "cover-letter",
				title: "",
				icon: "",
				columns: 1,
				hidden: false,
				items: [{ id: "x", value: "old" } as never],
			});
		});

		const result = produce(initial, (draft) => {
			updateSectionItem(draft, "skills", { id: "x", value: "new" }, "custom-1");
		});

		const customSection = result.customSections.find((s) => s.id === "custom-1");
		expect((customSection?.items[0] as { value?: string }).value).toBe("new");
	});

	it("does nothing when custom section is not found", () => {
		const before = JSON.stringify(defaultResumeData);
		const result = produce(defaultResumeData, (draft) => {
			updateSectionItem(draft, "skills", { id: "x", value: "new" }, "non-existent");
		});
		expect(JSON.stringify(result)).toBe(before);
	});
});
