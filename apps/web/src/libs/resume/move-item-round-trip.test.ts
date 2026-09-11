import { describe, expect, it } from "vitest";
import { applyPatches, enablePatches, produce, produceWithPatches } from "immer";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { moveItem } from "./move-item";

const company = (id: string) => ({
	id,
	hidden: false,
	company: `Company ${id}`,
	position: `Position ${id}`,
	location: "",
	period: "",
	description: "",
	roles: [],
	website: { url: "", label: "", inlineLink: false },
});
const base = () =>
	produce(defaultResumeData, (draft) => {
		draft.sections.experience.items = [company("1"), company("2")];
		draft.metadata.layout.pages = [{ fullWidth: false, main: ["experience"], sidebar: [] }];
	});
const split = () =>
	produce(base(), (draft) => {
		moveItem(draft, { itemId: "2", type: "experience", target: { type: "new-page", title: "Experience" } });
	});

describe("moving the last custom-section item (#3180)", () => {
	it("restores the original JSON after moving an experience item to a new page and back", () => {
		const initial = base();
		const moved = split();
		expect(moved.metadata.layout.pages).toHaveLength(2);
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "section", sectionId: "experience" },
			});
		});
		expect(restored).toEqual(initial);
	});
	it("preserves unrelated blank pages and pages with other section references", () => {
		const moved = produce(split(), (draft) => {
			draft.metadata.layout.pages.push({ fullWidth: true, main: [], sidebar: [] });
			draft.metadata.layout.pages[1].sidebar.push("skills");
		});
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "section", sectionId: "experience" },
			});
		});
		expect(restored.customSections).toEqual([]);
		expect(restored.metadata.layout.pages).toEqual([
			{ fullWidth: false, main: ["experience"], sidebar: [] },
			{ fullWidth: false, main: [], sidebar: ["skills"] },
			{ fullWidth: true, main: [], sidebar: [] },
		]);
	});
	it("preserves the first page when its only custom section becomes empty", () => {
		const moved = produce(split(), (draft) => {
			draft.metadata.layout.pages.reverse();
		});
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "section", sectionId: "experience" },
			});
		});
		expect(restored.metadata.layout.pages).toEqual([
			{ fullWidth: false, main: [], sidebar: [] },
			{ fullWidth: false, main: ["experience"], sidebar: [] },
		]);
	});
	it("inserts into the selected later page before pruning the source page", () => {
		const moved = produce(split(), (draft) => {
			draft.metadata.layout.pages.push({ fullWidth: true, main: [], sidebar: ["skills"] });
		});
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "new-section", pageIndex: 2, title: "Later" },
			});
		});
		expect(restored.metadata.layout.pages).toHaveLength(2);
		expect(restored.customSections).toHaveLength(1);
		expect(restored.customSections[0]).toMatchObject({ title: "Later", items: [company("2")] });
		expect(restored.metadata.layout.pages[1]).toEqual({
			fullWidth: true,
			main: [restored.customSections[0].id],
			sidebar: ["skills"],
		});
	});
	it("keeps a custom section with hidden remaining items", () => {
		const moved = produce(split(), (draft) => {
			draft.customSections[0].items.push({ ...company("3"), hidden: true });
		});
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "section", sectionId: "experience" },
			});
		});
		expect(restored.customSections[0].items).toEqual([{ ...company("3"), hidden: true }]);
		expect(restored.metadata.layout.pages).toHaveLength(2);
	});
	it.each([
		{ type: "section", sectionId: "missing" },
		{ type: "section", sectionId: "skills" },
		{ type: "new-section", pageIndex: 99, title: "Missing" },
	] as const)("leaves data intact for an invalid destination $type", (target) => {
		const moved = split();
		expect(
			produce(moved, (draft) => {
				moveItem(draft, { itemId: "2", type: "experience", customSectionId: moved.customSections[0].id, target });
			}),
		).toEqual(moved);
	});

	it("keeps data intact when the source is missing or destination is the source", () => {
		const moved = split();
		const sourceId = moved.customSections[0].id;
		for (const [itemId, sectionId] of [
			["missing", "experience"],
			["2", sourceId],
		]) {
			expect(
				produce(moved, (draft) => {
					moveItem(draft, {
						itemId,
						type: "experience",
						customSectionId: sourceId,
						target: { type: "section", sectionId },
					});
				}),
			).toEqual(moved);
		}
	});
	it("cleans the source sidebar while preserving unrelated blank pages when moving to a new page", () => {
		const moved = produce(split(), (draft) => {
			const page = draft.metadata.layout.pages[1];
			page.sidebar = page.main;
			page.main = [];
			draft.metadata.layout.pages.push({ fullWidth: true, main: [], sidebar: [] });
		});
		const restored = produce(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "new-page", title: "New destination" },
			});
		});
		expect(restored.customSections).toHaveLength(1);
		expect(restored.metadata.layout.pages).toEqual([
			{ fullWidth: false, main: ["experience"], sidebar: [] },
			{ fullWidth: true, main: [], sidebar: [] },
			{ fullWidth: false, main: [restored.customSections[0].id], sidebar: [] },
		]);
		expect(restored.customSections[0].items).toEqual([company("2")]);
	});
	it("undo restores the custom section, layout page, and custom settings", () => {
		enablePatches();
		const moved = produce(split(), (draft) => {
			Object.assign(draft.customSections[0], { title: "Custom title", icon: "star", columns: 2, keepTogether: true });
		});
		const [restored, , inverse] = produceWithPatches(moved, (draft) => {
			moveItem(draft, {
				itemId: "2",
				type: "experience",
				customSectionId: moved.customSections[0].id,
				target: { type: "section", sectionId: "experience" },
			});
		});
		expect(restored.customSections).toEqual([]);
		expect(applyPatches(restored, inverse)).toEqual(moved);
	});
});
