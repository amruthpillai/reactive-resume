import { describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { buildExportSample } from "./export-playground";

vi.mock("@/features/resume/export/use-resume-export", () => ({ useResumeExport: vi.fn() }));

describe("landing page export sample", () => {
	it("exports selected design with valid content without modifying shared defaults", () => {
		i18n.loadAndActivate({ locale: "en-US", messages: {} });
		const original = structuredClone(defaultResumeData);
		const data = buildExportSample({ name: "Taylor Reed", accent: "#5987aa", typeface: "sans", template: "ditgar" });
		expect(resumeDataSchema.safeParse(data).success).toBe(true);
		expect(data.basics.name).toBe("Taylor Reed");
		expect(data.metadata.template).toBe("ditgar");
		expect(data.metadata.design.colors.primary).toBe("#5987aa");
		expect(data.metadata.typography.body.fontFamily).toBe("Helvetica");
		expect(data.sections.experience.items.length).toBeGreaterThan(0);
		expect(buildExportSample({ name: "  ", accent: "#c4a68c", typeface: "serif", template: "onyx" }).basics.name).toBe(
			"Alex Morgan",
		);
		expect(defaultResumeData).toEqual(original);
	});
});
