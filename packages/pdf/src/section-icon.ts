import type { ResumeData, SectionType } from "@reactive-resume/schema/resume/data";

type RenderData = ResumeData & {
	resolveSectionTitle?: unknown;
};

const defaultSectionIcons: Record<string, string> = {
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
};

export const getResumeSectionIcon = (data: RenderData, sectionId: string): string => {
	if (sectionId === "summary") {
		const icon = data.summary.icon;
		if (icon === "none") return "";
		return icon || defaultSectionIcons.summary || "";
	}

	if (sectionId in data.sections) {
		const sectionType = sectionId as SectionType;
		const icon = data.sections[sectionType].icon;
		if (icon === "none") return "";
		return icon || defaultSectionIcons[sectionType] || "";
	}

	const customSection = data.customSections.find((section) => section.id === sectionId);
	if (!customSection) return "";

	const icon = customSection.icon;
	if (icon === "none") return "";
	// For custom sections, fall back to the default icon of their base type
	return icon || defaultSectionIcons[customSection.type] || "";
};
