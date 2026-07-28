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
		expect(variables["--rr-primary-color"]).toBe(baseSettings.design.colors.primary);
		expect(variables["--rr-sidebar-width"]).toBe(`${baseSettings.layout.sidebarWidth}%`);
		expect(variables["--rr-page-width"]).toBe("595.28pt");
		expect(Object.keys(variables)).not.toContain("--rr-font-family");
		expect(Object.keys(variables)).not.toContain("--rr-picture-url");
	});
});
