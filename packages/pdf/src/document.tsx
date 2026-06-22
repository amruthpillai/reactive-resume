import type { CustomTemplateData } from "@reactive-resume/schema/custom-template";
import type { LayoutPage, ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { Locale } from "@reactive-resume/utils/locale";
import type { ComponentType } from "react";
import type { SectionTitleResolver } from "./section-title";
import { useMemo } from "react";
import { RenderProvider } from "./context";
import { registerFonts, resumeContentContainsCJK } from "./hooks/use-register-fonts";
import { Document } from "./renderer";
import { CustomTemplatePage, getCustomTemplatePageCount, getTemplatePage } from "./templates";

export type TemplatePageProps = {
	page: LayoutPage;
	pageIndex: number;
};

export type TemplatePage = ComponentType<TemplatePageProps>;

export type ResumeDocumentProps = {
	data: ResumeData;
	template: Template;
	resolveSectionTitle?: SectionTitleResolver | undefined;
};

const getLayoutPageKey = (page: LayoutPage, pageIndex: number) =>
	`${page.fullWidth ? "full" : "split"}:${page.main.join(",")}:${page.sidebar.join(",")}:${pageIndex}`;

export const ResumeDocument = ({ data, template, resolveSectionTitle }: ResumeDocumentProps) => {
	const customTemplate = (data.metadata as { customTemplate?: CustomTemplateData }).customTemplate;
	const TemplatePageComponent = customTemplate ? CustomTemplatePage : getTemplatePage(template);
	const creationDate = useMemo(() => new Date(), []);
	const hasCjkContent = useMemo(() => resumeContentContainsCJK(data), [data]);
	const typography = registerFonts(
		data.metadata.typography,
		data.metadata.page.locale as Locale,
		hasCjkContent,
	) as Typography;

	// `registerFonts` widens `fontFamily` to `string | string[]` for CJK
	// fallback (#2986); the cast carries that wider runtime value through
	// `ResumeData` without changing the public schema.
	//
	// When a custom template defines its own colours (editor "Colors" settings),
	// override the resume's design colours so the base template's styling picks
	// them up. The base-template hooks accept hex or rgba via `rgbaStringToHex`.
	const resumeData = useMemo(() => {
		const metadata = { ...data.metadata, typography };
		const cp = customTemplate?.page;
		if (cp?.primaryColor || cp?.textColor || cp?.backgroundColor) {
			metadata.design = {
				...metadata.design,
				colors: {
					...metadata.design.colors,
					...(cp.primaryColor ? { primary: cp.primaryColor } : {}),
					...(cp.textColor ? { text: cp.textColor } : {}),
					...(cp.backgroundColor ? { background: cp.backgroundColor } : {}),
				},
			};
		}
		return { ...data, metadata };
	}, [data, typography, customTemplate]);

	// For custom templates, the page count is driven by the template's own
	// page-break nodes (not metadata.layout.pages). Build a synthetic page
	// list to drive the iteration so each Page component fires.
	const pageList = useMemo<LayoutPage[]>(() => {
		if (customTemplate) {
			const count = getCustomTemplatePageCount(customTemplate);
			return Array.from({ length: count }, () => ({
				fullWidth: false,
				main: [],
				sidebar: [],
			}));
		}
		return resumeData.metadata.layout.pages;
	}, [customTemplate, resumeData.metadata.layout.pages]);

	return (
		<RenderProvider data={resumeData} resolveSectionTitle={resolveSectionTitle}>
			<Document
				pageMode="useNone"
				creationDate={creationDate}
				producer="Reactive Resume"
				title={resumeData.basics.name}
				author={resumeData.basics.name}
				creator={resumeData.basics.name}
				subject={resumeData.basics.headline}
				language={resumeData.metadata.page.locale}
			>
				{pageList.map((page, index) => (
					<TemplatePageComponent key={getLayoutPageKey(page, index)} page={page} pageIndex={index} />
				))}
			</Document>
		</RenderProvider>
	);
};
