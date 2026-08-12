// @vitest-environment happy-dom

import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { ATS_RULE_CODES } from "@reactive-resume/resume/ats";
import { getAtsFindingLocation, getAtsFindingMessage, getAtsFindingTarget } from "./ats";

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("getAtsFindingMessage", () => {
	it("covers every rule in the catalog", () => {
		for (const code of ATS_RULE_CODES) {
			const message = getAtsFindingMessage(code);
			expect(message.title.length, code).toBeGreaterThan(0);
			expect(message.action.length, code).toBeGreaterThan(0);
		}
	});

	it("gives each rule a distinct title", () => {
		const titles = ATS_RULE_CODES.map((code) => getAtsFindingMessage(code).title);
		expect(new Set(titles).size).toBe(titles.length);
	});
});

describe("getAtsFindingTarget", () => {
	it.each([
		["/basics/email", { side: "left", section: "basics" }],
		["/basics/customFields/0/link", { side: "left", section: "basics" }],
		["/picture", { side: "left", section: "picture" }],
		["/summary/content", { side: "left", section: "summary" }],
		["/sections/experience/items/0/period", { side: "left", section: "experience" }],
		["/customSections/2/items/1/period", { side: "left", section: "custom" }],
		["/metadata/typography/body/fontSize", { side: "right", section: "typography" }],
		["/metadata/page/marginX", { side: "right", section: "page" }],
		["/metadata/layout/pages", { side: "right", section: "layout" }],
	])("resolves %s", (pointer, expected) => {
		expect(getAtsFindingTarget(pointer)).toEqual(expected);
	});

	it("returns null for a pointer with no sidebar home", () => {
		expect(getAtsFindingTarget("/metadata/styleRules/0")).toBeNull();
	});

	it("decodes escaped pointer tokens", () => {
		expect(getAtsFindingTarget("/sections/experience/items/0/period")).toEqual({
			side: "left",
			section: "experience",
		});
	});
});

describe("getAtsFindingLocation", () => {
	it("names the section for a section-level pointer", () => {
		expect(getAtsFindingLocation("/basics/email")).toBe("Basics");
	});

	it("adds a one-based item position for an item-level pointer", () => {
		expect(getAtsFindingLocation("/sections/experience/items/0/period")).toBe("Experience · Item 1");
	});

	it("returns null when the pointer has no sidebar home", () => {
		expect(getAtsFindingLocation("/metadata/styleRules/0")).toBeNull();
	});
});
