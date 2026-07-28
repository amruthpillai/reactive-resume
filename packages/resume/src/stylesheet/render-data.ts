import type { ResumeData, StyleRule } from "@reactive-resume/schema/resume/data";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";

export type RenderDataProjection = {
	picture: ResumeData["picture"];
	basics: ResumeData["basics"];
	summary: ResumeData["summary"];
	sections: ResumeData["sections"];
	customSections: ResumeData["customSections"];
	metadata: {
		template: ResumeData["metadata"]["template"];
		layout: ResumeData["metadata"]["layout"];
		page: ResumeData["metadata"]["page"];
		design: ResumeData["metadata"]["design"];
		typography: ResumeData["metadata"]["typography"];
		styleRules?: StyleRule[];
		stylesheet?: never;
		notes?: never;
	};
};

function project(data: ResumeData): RenderDataProjection {
	const parsed = resumeDataSchema.parse(data);
	const includeLegacyRules = parsed.metadata.stylesheet?.mode !== "semantic";

	return {
		picture: parsed.picture,
		basics: parsed.basics,
		summary: parsed.summary,
		sections: parsed.sections,
		customSections: parsed.customSections,
		metadata: {
			template: parsed.metadata.template,
			layout: parsed.metadata.layout,
			page: parsed.metadata.page,
			design: parsed.metadata.design,
			typography: parsed.metadata.typography,
			...(includeLegacyRules ? { styleRules: parsed.metadata.styleRules } : {}),
		},
	};
}

export function projectRenderData(data: ResumeData): RenderDataProjection {
	return project(data);
}

export function projectPublicRenderData(data: ResumeData): RenderDataProjection {
	return project(data);
}
