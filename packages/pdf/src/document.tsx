import type { LayoutPage, ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { ComponentType } from "react";
import type { SectionTitleResolver } from "./section-title";
import { Document } from "@react-pdf/renderer";
import { RenderProvider } from "./context";
import { registerFonts } from "./hooks/use-register-fonts";
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

export const ResumeDocument = ({ data, template, resolveSectionTitle }: ResumeDocumentProps) => {
	const TemplatePageComponent = getTemplatePage(template);
	registerFonts(data.metadata.typography);

	return (
		<RenderProvider data={data} resolveSectionTitle={resolveSectionTitle}>
			<Document title={`${data.basics.name} Resume`} author={data.basics.name} subject={data.basics.headline}>
				{data.metadata.layout.pages.map((page, index) => (
					<TemplatePageComponent key={index} page={page} pageIndex={index} />
				))}
			</Document>
		</RenderProvider>
	);
};
