import type { LayoutPage, ResumeData, Typography } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { Locale } from "@reactive-resume/utils/locale";
import type { ComponentType } from "react";
import type { SectionTitleResolver } from "./section-title";
import { useMemo } from "react";
import { RenderProvider } from "./context";
import { registerFonts, resumeContentCjkScripts, resumeContentContainsCJK } from "./hooks/use-register-fonts";
import { Document } from "./renderer";
import { getTemplatePage } from "./templates";

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
	const TemplatePageComponent = getTemplatePage(template);
	const creationDate = useMemo(() => new Date(), []);
	const hasCjkContent = useMemo(() => resumeContentContainsCJK(data), [data]);
	const cjkScripts = useMemo(() => resumeContentCjkScripts(data), [data]);
	const typography = registerFonts(
		data.metadata.typography,
		data.metadata.page.locale as Locale,
		hasCjkContent,
		cjkScripts,
	) as Typography;

	// `registerFonts` widens `fontFamily` to `string | string[]` for CJK
	// fallback (#2986); the cast carries that wider runtime value through
	// `ResumeData` without changing the public schema.
	const resumeData = useMemo(() => ({ ...data, metadata: { ...data.metadata, typography } }), [data, typography]);

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
				{resumeData.metadata.layout.pages.map((page, index) => (
					<TemplatePageComponent key={getLayoutPageKey(page, index)} page={page} pageIndex={index} />
				))}
			</Document>
		</RenderProvider>
	);
};
