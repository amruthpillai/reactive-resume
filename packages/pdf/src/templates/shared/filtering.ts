import type { CustomSectionType, Summary } from "@reactive-resume/schema/resume/data";

type HiddenItem = {
	hidden: boolean;
	[key: string]: unknown;
};

type TitleBackedSectionType = Exclude<CustomSectionType, "summary" | "cover-letter">;

type ItemSectionLike<T extends HiddenItem = HiddenItem> = {
	hidden: boolean;
	items: T[];
};

type CustomSectionLike = ItemSectionLike & {
	id: string;
	type?: string;
};

type FilterableData = {
	summary: Pick<Summary, "hidden" | "content">;
	sections: Partial<Record<string, ItemSectionLike>>;
	customSections: CustomSectionLike[];
};

const primaryTitleFields = {
	profiles: "network",
	experience: "company",
	education: "school",
	projects: "name",
	skills: "name",
	languages: "language",
	interests: "name",
	awards: "title",
	certifications: "title",
	publications: "title",
	volunteer: "organization",
	references: "name",
} satisfies Record<TitleBackedSectionType, string>;

const isItemSection = (section: unknown): section is ItemSectionLike => {
	return typeof section === "object" && section !== null && "items" in section;
};

const isSummarySection = (section: unknown): section is Summary => {
	return typeof section === "object" && section !== null && "content" in section;
};

const hasText = (value: unknown): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

const getPrimaryTitleField = (sectionType?: string): string | undefined => {
	return primaryTitleFields[sectionType as TitleBackedSectionType];
};

const hasValidPrimaryTitle = (item: HiddenItem, sectionType?: string): boolean => {
	const titleField = getPrimaryTitleField(sectionType);

	if (!titleField) return true;

	return hasText((item as Record<string, unknown>)[titleField]);
};

const hasVisibleExperienceRole = (role: unknown): boolean => {
	return typeof role === "object" && role !== null && hasText((role as { position?: unknown }).position);
};

const filterExperienceRoles = <T extends HiddenItem>(item: T, sectionType?: string): T => {
	if (sectionType !== "experience") return item;

	const roles = (item as { roles?: unknown }).roles;

	if (!Array.isArray(roles)) return item;

	const visibleRoles = roles.filter(hasVisibleExperienceRole);

	if (visibleRoles.length === roles.length) return item;

	return { ...item, roles: visibleRoles } as T;
};

export const filterItems = <T extends HiddenItem>(items: T[], sectionType?: string): T[] => {
	return items
		.filter((item) => !item.hidden && hasValidPrimaryTitle(item, sectionType))
		.map((item) => filterExperienceRoles(item, sectionType));
};

export const hasVisibleItems = (section: ItemSectionLike, sectionType?: string): boolean => {
	return !section.hidden && filterItems(section.items, sectionType).length > 0;
};

export const isVisibleSummary = (summary: Pick<Summary, "hidden" | "content">): boolean => {
	return !summary.hidden && summary.content.trim().length > 0;
};

const getSectionForFiltering = (sectionId: string, data: FilterableData) => {
	if (sectionId === "summary") return data.summary;

	return data.sections[sectionId] ?? data.customSections.find((section) => section.id === sectionId);
};

const getSectionTypeForFiltering = (sectionId: string, section: unknown): string | undefined => {
	if (sectionId === "summary") return "summary";

	if (typeof section === "object" && section !== null && "type" in section) {
		const type = (section as { type?: unknown }).type;

		if (typeof type === "string") return type;
	}

	return sectionId;
};

export const isSectionVisible = (sectionId: string, data: FilterableData): boolean => {
	const section = getSectionForFiltering(sectionId, data);
	const sectionType = getSectionTypeForFiltering(sectionId, section);

	if (!section) return false;
	if (isSummarySection(section)) return isVisibleSummary(section);
	if (isItemSection(section)) return hasVisibleItems(section, sectionType);

	return false;
};

export const filterSections = (sectionIds: string[], data: FilterableData): string[] => {
	return sectionIds.filter((sectionId) => isSectionVisible(sectionId, data));
};

export const splitFirstVisibleSection = (
	sectionIds: string[],
	data: FilterableData,
): { firstSection: string | undefined; remainingSections: string[] } => {
	const [firstSectionId, ...remainingSectionIds] = sectionIds;
	const firstSection = firstSectionId && isSectionVisible(firstSectionId, data) ? firstSectionId : undefined;

	return {
		firstSection,
		remainingSections: filterSections(remainingSectionIds, data),
	};
};
