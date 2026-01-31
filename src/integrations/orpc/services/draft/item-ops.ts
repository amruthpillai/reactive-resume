import type { DraftData } from "@/schema/draft/data";
import type { DraftOperation } from "@/schema/draft/operations";

/**
 * @remarks Represents a draft operation that mutates list items in-place.
 */
type ItemOpsOperation = Extract<DraftOperation, { op: "itemOps" }>;

/**
 * @remarks Represents a list item that is addressable by a stable identifier.
 */
type ItemWithId = { id: string };

/**
 * @remarks Creates a labeled URL payload with empty values.
 * @returns An empty labeled URL object.
 */
const createEmptyLabeledUrl = () => ({ label: "", url: "" });

/**
 * @remarks Creates an empty custom field entry for iterative drafting.
 * @param id - The stable identifier for the custom field.
 * @returns A custom field payload with empty values.
 */
const createEmptyCustomField = (id: string): DraftData["basics"]["customFields"][number] => ({
	id,
	text: "",
	link: "",
});

/**
 * @remarks Produces an empty list item shape for a given section type.
 * @param section - The target section to initialize.
 * @param id - The stable identifier for the item.
 * @returns An item payload with empty values.
 */
const createEmptyItemForSection = (
	section: keyof DraftData["sections"],
	id: string,
): DraftData["sections"][keyof DraftData["sections"]]["items"][number] => {
	switch (section) {
		case "profiles":
			return { id, network: "", username: "", website: createEmptyLabeledUrl() };
		case "experience":
			return {
				id,
				company: "",
				position: "",
				location: "",
				period: "",
				website: createEmptyLabeledUrl(),
				description: "",
			};
		case "education":
			return {
				id,
				school: "",
				degree: "",
				area: "",
				grade: "",
				location: "",
				period: "",
				website: createEmptyLabeledUrl(),
				description: "",
			};
		case "projects":
			return { id, name: "", period: "", website: createEmptyLabeledUrl(), description: "" };
		case "skills":
			return { id, name: "", proficiency: "", level: 0, keywords: [] };
		case "languages":
			return { id, language: "", fluency: "", level: 0 };
		case "interests":
			return { id, name: "", keywords: [] };
		case "awards":
			return { id, title: "", awarder: "", date: "", website: createEmptyLabeledUrl(), description: "" };
		case "certifications":
			return { id, title: "", issuer: "", date: "", website: createEmptyLabeledUrl(), description: "" };
		case "publications":
			return { id, title: "", publisher: "", date: "", website: createEmptyLabeledUrl(), description: "" };
		case "volunteer":
			return { id, organization: "", location: "", period: "", website: createEmptyLabeledUrl(), description: "" };
		case "references":
			return { id, name: "", position: "", website: createEmptyLabeledUrl(), phone: "", description: "" };
	}
};

/**
 * @remarks Applies item-level operations to a targeted list in the draft.
 * @param draft - The current draft payload.
 * @param operation - The item operation to apply.
 * @returns The updated draft payload.
 */
export const applyItemOpsOperation = (draft: DraftData, operation: ItemOpsOperation): DraftData => {
	switch (operation.target.kind) {
		case "section": {
			const section = operation.target.section;
			const sectionData = draft.sections[section];
			const nextItems = applyItemOpsToList(
				sectionData.items as ItemWithId[],
				operation,
				(id) => createEmptyItemForSection(section, id) as ItemWithId,
			) as typeof sectionData.items;

			return {
				...draft,
				sections: {
					...draft.sections,
					[section]: {
						...sectionData,
						items: nextItems,
					},
				},
			};
		}
		case "customField": {
			const nextItems = applyItemOpsToList(
				draft.basics.customFields as ItemWithId[],
				operation,
				(id) => createEmptyCustomField(id) as ItemWithId,
			) as DraftData["basics"]["customFields"];

			return {
				...draft,
				basics: {
					...draft.basics,
					customFields: nextItems,
				},
			};
		}
		case "customSection": {
			const target = operation.target as Extract<ItemOpsOperation["target"], { kind: "customSection" }>;
			const sectionIndex = draft.customSections.findIndex((section) => section.id === target.sectionId);
			if (sectionIndex < 0) return draft;

			const section = draft.customSections[sectionIndex];
			const nextItems = applyItemOpsToList(
				section.items as ItemWithId[],
				operation,
				(id) => createEmptyItemForSection(section.type, id) as ItemWithId,
			) as DraftData["customSections"][number]["items"];
			const nextSections = [...draft.customSections];
			nextSections[sectionIndex] = { ...section, items: nextItems };

			return {
				...draft,
				customSections: nextSections,
			};
		}
	}
};

/**
 * @remarks Applies list mutations based on the item operation action.
 * @param items - The existing list items.
 * @param operation - The operation describing the mutation.
 * @param createEmpty - Factory for initializing new list items.
 * @returns The updated list items.
 */
const applyItemOpsToList = (
	items: ItemWithId[],
	operation: ItemOpsOperation,
	createEmpty: (id: string) => ItemWithId,
): ItemWithId[] => {
	switch (operation.action) {
		case "upsert":
			return upsertItems(items, operation.items as Array<Partial<ItemWithId> & ItemWithId>, createEmpty);
		case "remove":
			return removeItems(items, operation.ids);
		case "reorder":
			return reorderItems(items, operation.ids);
	}
};

/**
 * @remarks Adds or updates list items by stable identifier.
 * @param items - The current list.
 * @param patches - The partial item payloads to merge.
 * @param createEmpty - Factory for new item defaults.
 * @returns The updated list.
 */
const upsertItems = (
	items: ItemWithId[],
	patches: Array<Partial<ItemWithId> & ItemWithId>,
	createEmpty: (id: string) => ItemWithId,
): ItemWithId[] => {
	const nextItems = [...items];

	for (const patch of patches) {
		const index = nextItems.findIndex((item) => item.id === patch.id);

		if (index >= 0) {
			nextItems[index] = { ...nextItems[index], ...patch, id: patch.id };
			continue;
		}

		nextItems.push({ ...createEmpty(patch.id), ...patch, id: patch.id });
	}

	return nextItems;
};

/**
 * @remarks Removes list items by stable identifier.
 * @param items - The current list.
 * @param ids - The identifiers to remove.
 * @returns The filtered list.
 */
const removeItems = (items: ItemWithId[], ids: string[]): ItemWithId[] => {
	const idsToRemove = new Set(ids);
	return items.filter((item) => !idsToRemove.has(item.id));
};

/**
 * @remarks Reorders list items using the provided identifier order.
 * @param items - The current list.
 * @param ids - The desired ordering of item identifiers.
 * @returns The reordered list with unknown identifiers ignored.
 */
const reorderItems = (items: ItemWithId[], ids: string[]): ItemWithId[] => {
	const order = new Set(ids);
	const itemsById = new Map(items.map((item) => [item.id, item]));
	const orderedItems = ids.map((id) => itemsById.get(id)).filter((item): item is ItemWithId => Boolean(item));
	const remainingItems = items.filter((item) => !order.has(item.id));

	return [...orderedItems, ...remainingItems];
};
