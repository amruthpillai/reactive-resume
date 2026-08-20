import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { createBaseTemplateStyles } from "./base-template-styles";
import { getTemplateMetrics } from "./metrics";
import { createRtlStyleHelpers } from "./rtl";

const boldWeightFor = (fontFamily: string, fontWeights: string[]) => {
	const metadata = {
		...defaultResumeData.metadata,
		typography: {
			...defaultResumeData.metadata.typography,
			body: { ...defaultResumeData.metadata.typography.body, fontFamily, fontWeights },
		},
	};

	return createBaseTemplateStyles({
		metadata,
		foreground: "#111111",
		background: "#ffffff",
		r: createRtlStyleHelpers(false),
		metrics: getTemplateMetrics(metadata.page),
		picture: defaultResumeData.picture,
	}).bold.fontWeight;
};

describe("bold style weight (#3310)", () => {
	it("uses the family's true Bold face when the stored weights stop below it", () => {
		// The reporter's case: Open Sans stored as ["400", "600"] rendered
		// <strong> at SemiBold, indistinguishable from the Regular body.
		expect(boldWeightFor("Open Sans", ["400", "600"])).toBe("700");
		expect(boldWeightFor("Open Sans", ["400", "500"])).toBe("700");
	});

	it("keeps a deliberate bold-class stored weight", () => {
		expect(boldWeightFor("Open Sans", ["400", "800"])).toBe("800");
	});

	it("stays on Bold for families stored with their Bold face", () => {
		expect(boldWeightFor("PT Sans", ["400", "700"])).toBe("700");
	});

	it("falls back to the last stored weight when no bold-class face exists", () => {
		expect(boldWeightFor("Not A Real Font", ["400", "600"])).toBe("600");
	});
});
