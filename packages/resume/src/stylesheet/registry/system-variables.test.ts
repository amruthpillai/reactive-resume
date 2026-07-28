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
			"--rr-primary-color",
			"--rr-text-color",
			"--rr-background-color",
			"--rr-body-font-size",
			"--rr-body-line-height",
			"--rr-heading-font-size",
			"--rr-heading-line-height",
			"--rr-page-gap-x",
			"--rr-page-gap-y",
			"--rr-page-margin-x",
			"--rr-page-margin-y",
			"--rr-page-width",
			"--rr-page-height",
			"--rr-sidebar-width",
			"--rr-picture-size",
			"--rr-picture-rotation",
			"--rr-picture-aspect-ratio",
			"--rr-picture-border-radius",
			"--rr-picture-border-width",
			"--rr-picture-border-color",
			"--rr-picture-shadow-width",
			"--rr-picture-shadow-color",
		]);
		expect(variables).toEqual({
			"--rr-primary-color": "rgba(220, 38, 38, 1)",
			"--rr-text-color": "rgba(0, 0, 0, 1)",
			"--rr-background-color": "rgba(255, 255, 255, 1)",
			"--rr-body-font-size": "10pt",
			"--rr-body-line-height": "1.5",
			"--rr-heading-font-size": "14pt",
			"--rr-heading-line-height": "1.5",
			"--rr-page-gap-x": "4pt",
			"--rr-page-gap-y": "6pt",
			"--rr-page-margin-x": "14pt",
			"--rr-page-margin-y": "12pt",
			"--rr-page-width": "595.28pt",
			"--rr-page-height": "841.89pt",
			"--rr-sidebar-width": "35%",
			"--rr-picture-size": "80pt",
			"--rr-picture-rotation": "0deg",
			"--rr-picture-aspect-ratio": "1",
			"--rr-picture-border-radius": "0pt",
			"--rr-picture-border-width": "0pt",
			"--rr-picture-border-color": "rgba(0, 0, 0, 0.5)",
			"--rr-picture-shadow-width": "0pt",
			"--rr-picture-shadow-color": "rgba(0, 0, 0, 0.5)",
		});
		expect(Object.keys(variables)).not.toContain("--rr-font-family");
		expect(Object.keys(variables)).not.toContain("--rr-picture-url");
	});
});
