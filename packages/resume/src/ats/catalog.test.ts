import { describe, expect, it } from "vitest";
import { ATS_RULE_CATALOG_V1, ATS_RULE_CODES, atsRuleSeverity } from "./catalog";

describe("ATS_RULE_CATALOG_V1", () => {
	it("has a stable set of codes", () => {
		expect(ATS_RULE_CODES).toMatchInlineSnapshot(`
			[
			  "MISSING_NAME",
			  "MISSING_EMAIL",
			  "MALFORMED_EMAIL",
			  "MISSING_PHONE",
			  "MISSING_LOCATION",
			  "MALFORMED_URL",
			  "PICTURE_PRESENT",
			  "EMPTY_PERIOD",
			  "UNPARSEABLE_PERIOD",
			  "UNPARSEABLE_DATE",
			  "REVERSED_PERIOD",
			  "FUTURE_DATED_PERIOD",
			  "SECTION_MISSING_FROM_LAYOUT",
			  "EMPTY_RENDERED_SECTION",
			  "NO_VISIBLE_EXPERIENCE",
			  "MISSING_EXPERIENCE_DESCRIPTION",
			  "NON_STANDARD_SECTION_TITLE",
			  "MULTI_COLUMN_PROSE_SECTION",
			  "PROSE_SECTION_IN_SIDEBAR",
			  "SMALL_BODY_FONT",
			  "TIGHT_LINE_HEIGHT",
			  "TIGHT_PAGE_MARGINS",
			]
		`);
	});

	it("gives every rule a severity, a meaning and an action", () => {
		for (const code of ATS_RULE_CODES) {
			const rule = ATS_RULE_CATALOG_V1[code];
			expect(["error", "warning", "info"]).toContain(rule.severity);
			expect(rule.meaning.length).toBeGreaterThan(0);
			expect(rule.action.length).toBeGreaterThan(0);
		}
	});

	it("resolves severity by code", () => {
		expect(atsRuleSeverity("MISSING_EMAIL")).toBe("error");
		expect(atsRuleSeverity("PICTURE_PRESENT")).toBe("info");
	});
});
