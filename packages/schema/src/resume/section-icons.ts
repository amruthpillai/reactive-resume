import type { CustomSectionType } from "./data";

export const defaultSectionIconNames = {
	summary: "article",
	profiles: "messenger-logo",
	experience: "briefcase",
	education: "graduation-cap",
	projects: "code-simple",
	skills: "compass-tool",
	languages: "translate",
	interests: "football",
	awards: "trophy",
	certifications: "certificate",
	publications: "books",
	volunteer: "hand-heart",
	references: "phone",
	"cover-letter": "envelope-simple",
} as const satisfies Record<CustomSectionType, string>;

export const getDefaultSectionIconName = (sectionType: CustomSectionType): string =>
	defaultSectionIconNames[sectionType];
