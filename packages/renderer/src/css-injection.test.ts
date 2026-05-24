import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { describe, expect, it } from "vitest";
import { buildInjectedStyles } from "./css-injection";

const makeData = (overrides: Partial<ResumeData["metadata"]> = {}): ResumeData =>
	({
		basics: {
			name: "Khaled AbuShqear",
			headline: "Infrastructure Engineer",
			email: "q@example.com",
			phone: "",
			location: "",
			website: { url: "", label: "" },
			customFields: [],
		},
		picture: {
			hidden: true,
			url: "",
			size: 64,
			rotation: 0,
			aspectRatio: 1,
			borderRadius: 0,
			borderColor: "rgba(0,0,0,0)",
			borderWidth: 0,
			shadowColor: "rgba(0,0,0,0)",
			shadowWidth: 0,
		},
		summary: { title: "", columns: 1, hidden: false, content: "" },
		sections: {} as ResumeData["sections"],
		customSections: [],
		metadata: {
			template: "test",
			layout: { sidebarWidth: 35, pages: [] },
			page: { format: "a4", gapX: 4, gapY: 6, marginX: 14, marginY: 12, locale: "en-US", hideIcons: false },
			design: {
				colors: { primary: "rgba(220,38,38,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" },
				level: { icon: "", type: "circle" },
			},
			typography: {
				body: { fontFamily: "IBM Plex Serif", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
				heading: { fontFamily: "IBM Plex Serif", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
				slots: {},
			},
			notes: "",
			...overrides,
		},
	}) as unknown as ResumeData;

const noneTemplate: TemplateMetadata = {
	id: "test",
	name: "Test",
	sidebarPosition: "none",
	tags: [],
	fonts: [],
	typography: [],
};

const leftTemplate: TemplateMetadata = {
	id: "khaled",
	name: "Khaled",
	sidebarPosition: "left",
	tags: [],
	fonts: [],
	typography: [],
};

const eitherTemplate: TemplateMetadata = {
	id: "khaled",
	name: "Khaled",
	sidebarPosition: "either",
	tags: [],
	fonts: [],
	typography: [
		{ id: "name", label: "Your name", defaultFont: "Playfair Display", defaultSize: 28, defaultWeight: 700 },
	],
};

describe("buildInjectedStyles — @page", () => {
	it("injects @page A4 for a4 format", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("size: A4");
	});

	it("injects @page letter for letter format", () => {
		const data = makeData({
			page: { gapX: 4, gapY: 6, marginX: 14, marginY: 12, format: "letter", locale: "en-US", hideIcons: false },
		});
		const out = buildInjectedStyles(data, noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("size: letter");
	});
});

describe("buildInjectedStyles — CSS vars", () => {
	it("injects primary color", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("--resume-primary: rgba(220,38,38,1)");
	});

	it("injects page padding from marginX/marginY", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("--resume-page-padding-x: 14pt");
		expect(out).toContain("--resume-page-padding-y: 12pt");
	});

	it("injects body typography slot vars", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("--resume-font-body: 'IBM Plex Serif'");
		expect(out).toContain("--resume-size-body: 10pt");
		expect(out).toContain("--resume-weight-body: 400");
	});

	it("does not inject sidebar vars when sidebarPosition is none", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).not.toContain("--resume-sidebar-grid-areas");
	});

	it("injects sidebar-left vars for left template", () => {
		const out = buildInjectedStyles(makeData(), leftTemplate, "khaled", "http://localhost:3001");
		expect(out).toContain('"sidebar main"');
		expect(out).toContain("var(--resume-sidebar-width) 1fr");
	});

	it("uses user sidebarPosition override for either template", () => {
		const data = makeData({ layout: { sidebarWidth: 35, pages: [], sidebarPosition: "right" } });
		const out = buildInjectedStyles(data, eitherTemplate, "khaled", "http://localhost:3001");
		expect(out).toContain('"main sidebar"');
		expect(out).toContain("1fr var(--resume-sidebar-width)");
	});

	it("defaults to left when either template has no user override", () => {
		const out = buildInjectedStyles(makeData(), eitherTemplate, "khaled", "http://localhost:3001");
		expect(out).toContain('"sidebar main"');
	});

	it("injects extra typography slot vars from template declaration", () => {
		const out = buildInjectedStyles(makeData(), eitherTemplate, "khaled", "http://localhost:3001");
		expect(out).toContain("--resume-font-name");
		expect(out).toContain("--resume-size-name: 28pt");
		expect(out).toContain("--resume-weight-name: 700");
	});

	it("user slot override takes priority over template default", () => {
		const data = makeData({
			typography: {
				body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: 10, lineHeight: 1.5 },
				heading: { fontFamily: "Inter", fontWeights: ["600"], fontSize: 14, lineHeight: 1.5 },
				slots: { name: { fontFamily: "Roboto", fontSize: 24 } },
			},
		});
		const out = buildInjectedStyles(data, eitherTemplate, "khaled", "http://localhost:3001");
		expect(out).toContain("--resume-font-name: 'Roboto'");
		expect(out).toContain("--resume-size-name: 24pt");
	});
});

describe("buildInjectedStyles — fonts", () => {
	it("generates @font-face for bundled fonts", () => {
		const tmpl: TemplateMetadata = {
			id: "khaled",
			name: "Khaled",
			sidebarPosition: "none",
			tags: [],
			fonts: [
				{
					family: "Playfair Display",
					weights: [400, 700],
					source: "bundled",
					files: { "400": "fonts/pf-400.woff2", "700": "fonts/pf-700.woff2" },
				},
			],
			typography: [],
		};
		const out = buildInjectedStyles(makeData(), tmpl, "khaled", "http://localhost:3001");
		expect(out).toContain("@font-face");
		expect(out).toContain('"Playfair Display"');
		expect(out).toContain("http://localhost:3001/api/templates/khaled/fonts/fonts/pf-400.woff2");
	});

	it("generates @font-face for resume typography web fonts", () => {
		const out = buildInjectedStyles(makeData(), noneTemplate, "test", "http://localhost:3001");
		expect(out).toContain("@font-face");
		expect(out).toContain('"IBM Plex Serif"');
		expect(out).toContain("fonts.gstatic.com");
	});
});
