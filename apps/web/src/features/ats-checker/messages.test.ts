// @vitest-environment happy-dom

import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { PDF_ATS_RULE_CODES } from "@reactive-resume/resume/ats-pdf";
import {
	getPdfCategoryDescription,
	getPdfCategoryLabel,
	getPdfFindingMessage,
	getPdfSeverityLabel,
	getPdfSkipReasonLabel,
} from "./messages";

const CATEGORIES = ["parseability", "layout", "sections", "contact", "dates", "content"] as const;
const SEVERITIES = ["blocker", "warning", "tip"] as const;
const SKIP_REASONS = [
	"no-text",
	"no-operators",
	"not-english",
	"not-applicable",
	"encrypted",
	"insufficient-data",
] as const;

beforeAll(() => {
	i18n.load("en", {});
	i18n.activate("en");
});

describe("getPdfFindingMessage", () => {
	it("covers every rule the engine can report", () => {
		for (const code of PDF_ATS_RULE_CODES) {
			const message = getPdfFindingMessage(code);

			expect(message.title.length, code).toBeGreaterThan(0);
			expect(message.action.length, code).toBeGreaterThan(0);
			expect(message.title, code).not.toBe(code);
		}
	});

	it("gives each rule its own wording", () => {
		const titles = PDF_ATS_RULE_CODES.map((code) => getPdfFindingMessage(code).title);
		expect(new Set(titles).size).toBe(titles.length);
	});

	it("never promises a rejection it cannot predict", () => {
		for (const code of PDF_ATS_RULE_CODES) {
			const message = getPdfFindingMessage(code);
			expect(`${message.title} ${message.action}`.toLowerCase()).not.toMatch(/will be rejected|auto[- ]reject/);
		}
	});
});

describe("labels", () => {
	it("names every category and severity", () => {
		for (const category of CATEGORIES) {
			expect(getPdfCategoryLabel(category).length).toBeGreaterThan(0);
			expect(getPdfCategoryDescription(category).length).toBeGreaterThan(0);
		}

		for (const severity of SEVERITIES) expect(getPdfSeverityLabel(severity).length).toBeGreaterThan(0);
	});

	it("explains every reason a check can be skipped", () => {
		for (const reason of SKIP_REASONS) expect(getPdfSkipReasonLabel(reason).length).toBeGreaterThan(0);
	});
});
