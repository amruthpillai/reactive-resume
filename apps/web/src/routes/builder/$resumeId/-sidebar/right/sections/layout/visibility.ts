import type { CustomSectionType, ResumeData, SectionType } from "@reactive-resume/schema/resume/data";

type HiddenItem = {
	hidden: boolean;
	[key: string]: unknown;
};

type ItemSectionLike = {
	hidden: boolean;
	items: HiddenItem[];
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
} satisfies Record<SectionType, string>;

type TitleBackedSectionType = keyof typeof primaryTitleFields;

const hasText = (value: unknown): value is string => {
	return typeof value === "string" && value.trim().length > 0;
};

const getPrimaryTitleField = (sectionType: CustomSectionType | SectionType | undefined): string | undefined => {
	return primaryTitleFields[sectionType as TitleBackedSectionType];
};

const hasValidPrimaryTitle = (item: HiddenItem, sectionType: CustomSectionType | SectionType | undefined): boolean => {
	const titleField = getPrimaryTitleField(sectionType);
	if (!titleField) return true;
	return hasText(item[titleField]);
};

const hasVisibleItems = (
	section: ItemSectionLike,
	sectionType: CustomSectionType | SectionType | undefined,
): boolean => {
	return !section.hidden && section.items.some((item) => !item.hidden && hasValidPrimaryTitle(item, sectionType));
};

const getBuiltInSection = (sectionId: string, data: ResumeData): ItemSectionLike | null => {
	if (!(sectionId in data.sections)) return null;

	return data.sections[sectionId as SectionType] as ItemSectionLike;
};

const isVisibleLayoutSection = (sectionId: string, data: ResumeData): boolean => {
	if (sectionId === "summary") return !data.summary.hidden && data.summary.content.trim().length > 0;

	const builtInSection = getBuiltInSection(sectionId, data);
	if (builtInSection) return hasVisibleItems(builtInSection, sectionId as SectionType);

	const customSection = data.customSections.find((section) => section.id === sectionId);
	if (customSection) return hasVisibleItems(customSection as ItemSectionLike, customSection.type);

	return false;
};

export const filterVisibleLayoutSectionIds = (sectionIds: string[], data: ResumeData): string[] => {
	return sectionIds.filter((sectionId) => isVisibleLayoutSection(sectionId, data));
};
