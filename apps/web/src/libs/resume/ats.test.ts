// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeAll, describe, expect, it } from "vitest";
import { i18n } from "@lingui/core";
import { ATS_RULE_CODES } from "@reactive-resume/resume/ats";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { atsFindingItemElementId, getAtsFindingLocation, getAtsFindingMessage, getAtsFindingTarget } from "./ats";

const experienceItem = (id: string) => ({
	id,
	hidden: false,
	company: "Analytical Engines",
	position: "Engineer",
	location: "London",
	period: "",
	website: { url: "", label: "", inlineLink: false },
	description: "",
	roles: [],
});

function makeResume(): ResumeData {
	const data = structuredClone(defaultResumeData);
	data.sections.experience.items = [experienceItem("exp-a"), experienceItem("exp-b")] as never;
	data.customSections = [
		{
			id: "custom-1",
			type: "experience",
			title: "Consulting",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [experienceItem("custom-item-a")],
		},
	] as never;
	return data;
}

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

describe("getAtsFindingTarget item resolution", () => {
	it("resolves the item a finding belongs to", () => {
		expect(getAtsFindingTarget("/sections/experience/items/0/period", makeResume())).toEqual({
			side: "left",
			section: "experience",
			itemId: "exp-a",
		});
	});

	it("sends two findings in the same section to different items", () => {
		const data = makeResume();
		const first = getAtsFindingTarget("/sections/experience/items/0/period", data);
		const second = getAtsFindingTarget("/sections/experience/items/1/period", data);

		expect(first?.itemId).toBe("exp-a");
		expect(second?.itemId).toBe("exp-b");
		expect(first?.section).toBe(second?.section);
	});

	it("resolves items inside custom sections", () => {
		expect(getAtsFindingTarget("/customSections/0/items/0/period", makeResume())).toEqual({
			side: "left",
			section: "custom",
			itemId: "custom-item-a",
		});
	});

	it("omits the item when no resume data is supplied", () => {
		expect(getAtsFindingTarget("/sections/experience/items/0/period")).toEqual({
			side: "left",
			section: "experience",
		});
	});

	it("omits the item for a section-level pointer", () => {
		expect(getAtsFindingTarget("/sections/experience", makeResume())).toEqual({
			side: "left",
			section: "experience",
		});
	});

	it("omits the item when the index is out of range", () => {
		expect(getAtsFindingTarget("/sections/experience/items/9/period", makeResume())).toEqual({
			side: "left",
			section: "experience",
		});
	});

	it("builds a stable element id", () => {
		expect(atsFindingItemElementId("exp-a")).toBe("resume-item-exp-a");
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
