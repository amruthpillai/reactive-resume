import type { Summary } from "@reactive-resume/schema/resume/data";

type HiddenItem = {
	hidden: boolean;
};

type ItemSectionLike<T extends HiddenItem = HiddenItem> = {
	hidden: boolean;
	items: T[];
};

type FilterableData = {
	summary: Pick<Summary, "hidden" | "content">;
	sections: Partial<Record<string, ItemSectionLike>>;
	customSections: Array<ItemSectionLike & { id: string }>;
};

const isItemSection = (section: unknown): section is ItemSectionLike => {
	return typeof section === "object" && section !== null && "items" in section;
};

const isSummarySection = (section: unknown): section is Summary => {
	return typeof section === "object" && section !== null && "content" in section;
};

export const filterItems = <T extends HiddenItem>(items: T[]): T[] => {
	return items.filter((item) => !item.hidden);
};

export const hasVisibleItems = (section: ItemSectionLike): boolean => {
	return !section.hidden && filterItems(section.items).length > 0;
};

export const isVisibleSummary = (summary: Pick<Summary, "hidden" | "content">): boolean => {
	return !summary.hidden && summary.content.trim().length > 0;
};

const getSectionForFiltering = (sectionId: string, data: FilterableData) => {
	if (sectionId === "summary") return data.summary;

	return data.sections[sectionId] ?? data.customSections.find((section) => section.id === sectionId);
};

export const isSectionVisible = (sectionId: string, data: FilterableData): boolean => {
	const section = getSectionForFiltering(sectionId, data);

	if (!section) return false;
	if (isSummarySection(section)) return isVisibleSummary(section);
	if (isItemSection(section)) return hasVisibleItems(section);

	return false;
};

export const filterSections = (sectionIds: string[], data: FilterableData): string[] => {
	return sectionIds.filter((sectionId) => isSectionVisible(sectionId, data));
};
