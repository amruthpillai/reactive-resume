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
		metadata: { ...data.metadata, template, css },
	});
	// Auto-inject CSS vars when the template doesn't include {{ metadata.css | safe }}
	if (css && !html.includes('id="resume-css-vars"')) {
		html = html.replace("</head>", `${css}\n</head>`);
	}
	return html.replace(stripResumeSlotTagRe, "");
};
