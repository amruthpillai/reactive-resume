import type { ResumeData, SectionType } from "@reactive-resume/schema/resume/data";

export type SectionTitleResolverInput = {
	sectionId: string;
	locale: string;
	sectionKind: "summary" | "builtin" | "custom";
	customSectionType?: string;
	defaultEnglishTitle?: string | undefined;
};

export type SectionTitleResolver = (input: SectionTitleResolverInput) => string;

const defaultEnglishSectionTitles: Record<"summary" | SectionType, string> = {
	summary: "Summary",
	profiles: "Profiles",
	experience: "Experience",
	education: "Education",
	projects: "Projects",
	skills: "Skills",
	languages: "Languages",
	interests: "Interests",
	awards: "Awards",
	certifications: "Certifications",
	publications: "Publications",
	volunteer: "Volunteer",
	references: "References",
};

const defaultEnglishCustomSectionTitles: Record<string, string> = {
	"cover-letter": "Cover Letter",
};

export const resolveSectionTitle = (
	title: string,
	input: SectionTitleResolverInput,
	resolver?: SectionTitleResolver,
	legacyFallback?: string,
) => {
	if (title.trim()) return title;

	const resolvedTitle = resolver?.(input);
	if (resolvedTitle?.trim()) return resolvedTitle;

	if (legacyFallback !== undefined) return legacyFallback;

	return input.defaultEnglishTitle ?? input.sectionId;
};

type RenderData = ResumeData & {
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

export const getResumeSectionTitle = (data: RenderData, sectionId: string, legacyFallback?: string) => {
	const locale = data.metadata.page.locale;

	if (sectionId === "summary") {
		const defaultEnglishTitle = defaultEnglishSectionTitles.summary;

		return resolveSectionTitle(
			data.summary.title,
			{ sectionId, locale, sectionKind: "summary", defaultEnglishTitle },
			data.resolveSectionTitle,
			legacyFallback,
		);
	}

	if (sectionId in data.sections) {
		const sectionType = sectionId as SectionType;
		const defaultEnglishTitle = defaultEnglishSectionTitles[sectionType];

		return resolveSectionTitle(
			data.sections[sectionType].title,
			{ sectionId, locale, sectionKind: "builtin", defaultEnglishTitle },
			data.resolveSectionTitle,
			legacyFallback,
		);
	}

	const customSection = data.customSections.find((section) => section.id === sectionId);

	if (customSection) {
		const defaultEnglishTitle =
			customSection.type in data.sections
				? defaultEnglishSectionTitles[customSection.type as SectionType]
				: (defaultEnglishCustomSectionTitles[customSection.type] ?? customSection.type);

		return resolveSectionTitle(
			customSection.title,
			{ sectionId, locale, sectionKind: "custom", customSectionType: customSection.type, defaultEnglishTitle },
			data.resolveSectionTitle,
			legacyFallback,
		);
	}

	return (
		data.resolveSectionTitle?.({ sectionId, locale, sectionKind: "custom", defaultEnglishTitle: sectionId }) ??
		legacyFallback ??
		sectionId
	);
};
