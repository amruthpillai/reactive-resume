import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createSystemVariables, SYSTEM_VARIABLE_REGISTRY_V1 } from "./system-variables";

const baseSettings = {
	picture: defaultResumeData.picture,
	template: defaultResumeData.metadata.template,
	design: defaultResumeData.metadata.design,
	typography: defaultResumeData.metadata.typography,
	page: defaultResumeData.metadata.page,
	layout: defaultResumeData.metadata.layout,
};

describe("system-variable registry", () => {
	it("injects builder values without exposing fonts or assets", () => {
		const variables = createSystemVariables(baseSettings, { width: 595.28, height: 841.89 });

		expect(Object.keys(SYSTEM_VARIABLE_REGISTRY_V1)).toEqual([
			"--resume-primary-color",
			"--resume-text-color",
			"--resume-background-color",
			"--resume-body-font-size",
			"--resume-body-line-height",
			"--resume-heading-font-size",
			"--resume-heading-line-height",
			"--resume-page-gap-x",
			"--resume-page-gap-y",
			"--resume-page-margin-x",
			"--resume-page-margin-y",
			"--resume-page-width",
			"--resume-page-height",
			"--resume-sidebar-width",
			"--resume-picture-size",
			"--resume-picture-rotation",
			"--resume-picture-aspect-ratio",
			"--resume-picture-border-radius",
			"--resume-picture-border-width",
			"--resume-picture-border-color",
			"--resume-picture-shadow-width",
			"--resume-picture-shadow-color",
		]);
		expect(variables).toEqual({
			"--resume-primary-color": "rgba(220, 38, 38, 1)",
			"--resume-text-color": "rgba(0, 0, 0, 1)",
			"--resume-background-color": "rgba(255, 255, 255, 1)",
			"--resume-body-font-size": "10pt",
			"--resume-body-line-height": "1.5",
			"--resume-heading-font-size": "14pt",
			"--resume-heading-line-height": "1.5",
			"--resume-page-gap-x": "4pt",
			"--resume-page-gap-y": "6pt",
			"--resume-page-margin-x": "14pt",
			"--resume-page-margin-y": "12pt",
			"--resume-page-width": "595.28pt",
			"--resume-page-height": "841.89pt",
			"--resume-sidebar-width": "35%",
			"--resume-picture-size": "80pt",
			"--resume-picture-rotation": "0deg",
			"--resume-picture-aspect-ratio": "1",
			"--resume-picture-border-radius": "0pt",
			"--resume-picture-border-width": "0pt",
			"--resume-picture-border-color": "rgba(0, 0, 0, 0.5)",
			"--resume-picture-shadow-width": "0pt",
			"--resume-picture-shadow-color": "rgba(0, 0, 0, 0.5)",
		});
		expect(Object.keys(variables)).not.toContain("--resume-font-family");
		expect(Object.keys(variables)).not.toContain("--resume-picture-url");
	});
});
