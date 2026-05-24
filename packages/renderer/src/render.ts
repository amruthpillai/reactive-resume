import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { buildInjectedStyles } from "./css-injection";
import { createEnvironment } from "./environment";

export type RenderContext = {
	data: ResumeData;
	template: TemplateMetadata;
	templateId: string;
	baseUrl: string;
};

const stripResumeSlotTagRe = /<resume-slot[^>]*>|<\/resume-slot>/g;
const defaultEnglishSectionTitles: Record<string, string> = {
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

const buildSectionById = (data: ResumeData): Record<string, unknown> => ({
	...data.sections,
	...Object.fromEntries(data.customSections.map((section) => [section.id, section])),
});

const buildGetSectionTitle =
	(data: ResumeData) =>
	(sectionId: string, legacyFallback = ""): string => {
		if (sectionId === "summary") {
			return data.summary.title.trim() || defaultEnglishSectionTitles.summary;
		}

		if (sectionId in data.sections) {
			const section = data.sections[sectionId as keyof typeof data.sections];
			const defaultTitle = defaultEnglishSectionTitles[sectionId] ?? sectionId;
			return section.title.trim() || defaultTitle;
		}

		const customSection = data.customSections.find((section) => section.id === sectionId);
		if (customSection) {
			const defaultTitle =
				defaultEnglishSectionTitles[customSection.type] ??
				defaultEnglishCustomSectionTitles[customSection.type] ??
				customSection.type;
			return customSection.title.trim() || defaultTitle;
		}

		return legacyFallback.trim() || sectionId;
	};

export const render = (
	files: Record<string, string>,
	data: ResumeData,
	template: TemplateMetadata,
	templateId: string,
	baseUrl: string,
): string => {
	const env = createEnvironment(files);
	const css = buildInjectedStyles(data, template, templateId, baseUrl);
	let html = env.render("index.html", {
		...data,
		sectionById: buildSectionById(data),
		getSectionTitle: buildGetSectionTitle(data),
		metadata: { ...data.metadata, template, css },
	});
	// Auto-inject CSS vars when the template doesn't include {{ metadata.css | safe }}
	if (css && !html.includes('id="resume-css-vars"')) {
		html = html.replace("</head>", `${css}\n</head>`);
	}
	return html.replace(stripResumeSlotTagRe, "");
};
