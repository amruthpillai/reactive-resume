import type { SemanticNode } from "@reactive-resume/resume/stylesheet";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
import type { RasterizedPdfPage } from "../../semantic/test/rasterize-pdf";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pdf, renderToBuffer } from "@react-pdf/renderer";
import { encode } from "fast-png";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { resolveLevelDisplaySizes } from "@reactive-resume/schema/resume/level-display-sizes";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

const templates = [
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"meowth",
	"onyx",
	"pikachu",
	"rhyhorn",
	"scizor",
] as const satisfies readonly Template[];

const dateMarkers = [
	"EXP_LONG",
	"EXP_NO_LOCATION",
	"ROLE_ONE",
	"ROLE_TWO",
	"EXP_NO_PERIOD",
	"EDU_DATE",
	"PROJECT_DATE",
	"AWARD_DATE",
	"CERT_DATE",
	"VOLUNTEER_DATE",
	"CUSTOM_EXP_DATE",
	"CUSTOM_ROLE_DATE",
	"CUSTOM_EDU_DATE",
	"CUSTOM_PROJECT_DATE",
	"CUSTOM_AWARD_DATE",
	"CUSTOM_CERT_DATE",
	"CUSTOM_VOLUNTEER_DATE",
] as const;

type DateMarker = (typeof dateMarkers)[number];

const expectedMissingMarkers = {
	azurill: [],
	bronzor: [],
	chikorita: [],
	ditgar: [],
	ditto: [],
	gengar: [],
	glalie: [],
	kakuna: [],
	lapras: [],
	leafish: [],
	meowth: ["EXP_NO_PERIOD"],
	onyx: [],
	pikachu: [],
	rhyhorn: [],
	scizor: [],
} as const satisfies Record<Template, readonly DateMarker[]>;

const baselineDirectory = join(dirname(fileURLToPath(import.meta.url)), "../../../test-artifacts/date-layout");

type PdfPageText = {
	pageNumber: number;
	items: TextItem[];
};

type RenderedFixture = {
	bytes: Uint8Array;
	pages: PdfPageText[];
	raster: readonly RasterizedPdfPage[];
};

const emptyWebsite = () => ({ url: "", label: "", inlineLink: false });

const required = <T,>(value: T | undefined): T => {
	if (value === undefined) throw new Error("Missing fixture value");
	return value;
};

const richText = (text: string) => `<p>${text}</p>`;

const dateFixture = (locale: "en-US" | "ar-SA" = "en-US"): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics = {
		name: locale === "ar-SA" ? "RTL Date Matrix" : "LTR Date Matrix",
		headline: "Date layout characterization",
		email: "dates@example.com",
		phone: "",
		location: locale === "ar-SA" ? "دبي" : "Berlin",
		website: { url: "", label: "" },
		customFields: [],
	};
	data.metadata.page.locale = locale;
	data.metadata.page.marginX = 28;
	data.metadata.page.marginY = 20;
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [
		{
			fullWidth: true,
			main: [
				"experience",
				"education",
				"projects",
				"awards",
				"certifications",
				"publications",
				"volunteer",
				"custom-experience",
				"custom-education",
				"custom-projects",
				"custom-awards",
				"custom-certifications",
				"custom-publications",
				"custom-volunteer",
			],
			sidebar: [],
		},
	];

	data.sections.experience = {
		...data.sections.experience,
		title: "Experience matrix",
		items: [
			{
				id: "experience-dated",
				hidden: false,
				company: "Experience Parent",
				position: "Lead Engineer",
				location: "Oslo LOCATION_ORDER",
				period: "März 2018 – Dezember 2024 EXP_LONG",
				website: emptyWebsite(),
				description: richText("Experience dated details"),
				roles: [
					{
						id: "role-one",
						position: "Role One",
						period: "2020 ROLE_ONE",
						description: richText("First role details"),
					},
					{
						id: "role-two",
						position: "Role Two",
						period: "2022 ROLE_TWO",
						description: richText("Second role details"),
					},
				],
			},
			{
				id: "experience-no-location",
				hidden: false,
				company: "Experience No Location",
				position: "Solo Role",
				location: "",
				period: "2016 EXP_NO_LOCATION",
				website: emptyWebsite(),
				description: "",
				roles: [],
			},
			{
				id: "experience-no-period",
				hidden: false,
				company: "Experience No Period",
				position: "No Date Role",
				location: "Oslo EXP_NO_PERIOD",
				period: "",
				website: emptyWebsite(),
				description: "",
				roles: [],
			},
		],
	};
	data.sections.education = {
		...data.sections.education,
		title: "Education matrix",
		items: [
			{
				id: "education-dated",
				hidden: false,
				school: "Education School",
				degree: "Degree",
				area: "Area",
				grade: "Grade",
				location: "Education City",
				period: "2019 EDU_DATE",
				website: emptyWebsite(),
				description: richText("Education details"),
			},
			{
				id: "education-empty-period",
				hidden: false,
				school: "Education Empty Period",
				degree: "",
				area: "",
				grade: "",
				location: "",
				period: "",
				website: emptyWebsite(),
				description: "",
			},
		],
	};
	data.sections.projects = {
		...data.sections.projects,
		title: "Projects matrix",
		items: [
			{
				id: "project-dated",
				hidden: false,
				name: "Project Entry",
				period: "2020 PROJECT_DATE",
				website: emptyWebsite(),
				description: richText("Project details"),
			},
		],
	};
	data.sections.awards = {
		...data.sections.awards,
		title: "Awards matrix",
		items: [
			{
				id: "award-dated",
				hidden: false,
				title: "Award Entry",
				awarder: "Award Society",
				date: "2021 AWARD_DATE",
				website: emptyWebsite(),
				description: richText("Award details"),
			},
		],
	};
	data.sections.certifications = {
		...data.sections.certifications,
		title: "Certifications matrix",
		items: [
			{
				id: "certification-dated",
				hidden: false,
				title: "Certification Entry",
				issuer: "Certification Issuer",
				date: "2022 CERT_DATE",
				website: emptyWebsite(),
				description: richText("Certification details"),
			},
		],
	};
	data.sections.publications = {
		...data.sections.publications,
		title: "Publications matrix",
		items: [
			{
				id: "publication-empty-date",
				hidden: false,
				title: "Publication Empty Date",
				publisher: "Publication Publisher",
				date: "",
				website: emptyWebsite(),
				description: richText("Publication details"),
			},
		],
	};
	data.sections.volunteer = {
		...data.sections.volunteer,
		title: "Volunteer matrix",
		items: [
			{
				id: "volunteer-dated",
				hidden: false,
				organization: "Volunteer Organization",
				location: "Volunteer City",
				period: "2023 VOLUNTEER_DATE",
				website: emptyWebsite(),
				description: richText("Volunteer details"),
			},
		],
	};

	data.customSections = [
		{
			...data.sections.experience,
			id: "custom-experience",
			type: "experience",
			title: "Custom Experience matrix",
			items: [
				{
					...required(data.sections.experience.items[0]),
					id: "custom-experience-item",
					company: "Custom Experience",
					location: "Custom Oslo",
					period: "2024 CUSTOM_EXP_DATE",
					roles: [
						{
							id: "custom-role",
							position: "Custom Role",
							period: "2024 CUSTOM_ROLE_DATE",
							description: "",
						},
					],
				},
			],
		},
		{
			...data.sections.education,
			id: "custom-education",
			type: "education",
			title: "Custom Education matrix",
			items: [
				{ ...required(data.sections.education.items[0]), id: "custom-education-item", period: "2024 CUSTOM_EDU_DATE" },
			],
		},
		{
			...data.sections.projects,
			id: "custom-projects",
			type: "projects",
			title: "Custom Projects matrix",
			items: [
				{ ...required(data.sections.projects.items[0]), id: "custom-project-item", period: "2024 CUSTOM_PROJECT_DATE" },
			],
		},
		{
			...data.sections.awards,
			id: "custom-awards",
			type: "awards",
			title: "Custom Awards matrix",
			items: [{ ...required(data.sections.awards.items[0]), id: "custom-award-item", date: "2024 CUSTOM_AWARD_DATE" }],
		},
		{
			...data.sections.certifications,
			id: "custom-certifications",
			type: "certifications",
			title: "Custom Certifications matrix",
			items: [
				{
					...required(data.sections.certifications.items[0]),
					id: "custom-certification-item",
					date: "2024 CUSTOM_CERT_DATE",
				},
			],
		},
		{
			...data.sections.publications,
			id: "custom-publications",
			type: "publications",
			title: "Custom Publications matrix",
			items: [{ ...required(data.sections.publications.items[0]), id: "custom-publication-item", date: "" }],
		},
		{
			...data.sections.volunteer,
			id: "custom-volunteer",
			type: "volunteer",
			title: "Custom Volunteer matrix",
			items: [
				{
					...required(data.sections.volunteer.items[0]),
					id: "custom-volunteer-item",
					period: "2024 CUSTOM_VOLUNTEER_DATE",
				},
			],
		},
	];

	return data;
};

const extractPages = async (bytes: Uint8Array): Promise<PdfPageText[]> => {
	const loadingTask = getDocument({ data: bytes, useSystemFonts: true });
	try {
		const document = await loadingTask.promise;
		const pages: PdfPageText[] = [];
		for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
			const page = await document.getPage(pageNumber);
			const content = await page.getTextContent();
			pages.push({
				pageNumber,
				items: content.items.filter(
					(item): item is TextItem => "str" in item && typeof item.str === "string" && item.str.trim().length > 0,
				),
			});
		}
		return pages;
	} finally {
		await loadingTask.destroy();
	}
};

const renderFixture = async (data: ResumeData, template: Template): Promise<RenderedFixture> => {
	const element = createElement(ResumeDocument, { data, template }) as unknown as Parameters<typeof renderToBuffer>[0];
	let bytes = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const pages = await extractPages(bytes.slice());
	const raster = await rasterizePdf(bytes.slice());
	return { bytes, pages, raster };
};

const allItems = (result: RenderedFixture) => result.pages.flatMap((page) => page.items);

const textFor = (result: RenderedFixture) =>
	allItems(result)
		.map((item) => item.str)
		.join(" ");

const markerItems = (result: RenderedFixture, marker: DateMarker) =>
	allItems(result).filter((item) => new RegExp(`(?:^|\\s)${marker}(?=\\s|$)`).test(item.str));

const textItems = (result: RenderedFixture, text: string) => allItems(result).filter((item) => item.str.includes(text));

const coordinatesFor = (result: RenderedFixture, markers: readonly DateMarker[]) =>
	Object.fromEntries(
		markers.map((marker) => [
			marker,
			markerItems(result, marker).map((item) => ({
				x: Number(item.transform[4].toFixed(2)),
				y: Number(item.transform[5].toFixed(2)),
				width: Number(item.width.toFixed(2)),
				text: item.str,
			})),
		]),
	);

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

// Rasterized pixels depend on the host's font rasterizer: the identical PDF, with byte-identical
// text coordinates, hashes differently on macOS and Linux. These PNG baselines were authored on
// macOS, so the pixel comparison only runs there. Coordinates, page counts and item counts are
// portable and stay asserted on every host, which is what the characterization actually protects.
const comparesPixels = process.platform === "darwin";

const withoutPixels = <T extends { rasterSha256: string[] }>(evidence: T): Omit<T, "rasterSha256"> => {
	const { rasterSha256: _rasterSha256, ...portable } = evidence;
	return portable;
};

const fixtureEvidence = (result: RenderedFixture, coordinates: Record<string, unknown>) => {
	const rasterPngs = result.raster.map((page) => encode(page));
	return {
		pages: result.pages.map((page) => ({ pageNumber: page.pageNumber, itemCount: page.items.length })),
		rasterSha256: rasterPngs.map(sha256),
		coordinates,
	};
};

const requiredMarkers = (result: RenderedFixture) => {
	const text = textFor(result);
	for (const marker of dateMarkers) expect(text).toContain(marker);
	return coordinatesFor(result, dateMarkers);
};

const writeArtifacts = (name: string, result: RenderedFixture, coordinates: Record<string, unknown>): void => {
	const output = process.env.DATE_LAYOUT_ARTIFACT_DIR;
	if (!output) return;
	mkdirSync(output, { recursive: true });
	writeFileSync(join(output, `${name}.json`), `${JSON.stringify(fixtureEvidence(result, coordinates), null, "\t")}\n`);
	for (const [index, page] of result.raster.entries()) {
		writeFileSync(join(output, `${name}-page-${index + 1}.png`), encode(page));
	}
};

const assertFixtureBaseline = (name: string, result: RenderedFixture, coordinates: Record<string, unknown>): void => {
	if (process.env.DATE_LAYOUT_ARTIFACT_DIR) return;
	const evidence = fixtureEvidence(result, coordinates);
	const baseline = JSON.parse(readFileSync(join(baselineDirectory, `${name}.json`), "utf8"));
	if (!comparesPixels) {
		expect(withoutPixels(baseline)).toEqual(withoutPixels(evidence));
		return;
	}
	expect(baseline).toEqual(evidence);
	for (const index of result.raster.keys()) {
		const expectedPng = readFileSync(join(baselineDirectory, `${name}-page-${index + 1}.png`));
		expect(sha256(expectedPng)).toBe(evidence.rasterSha256[index]);
	}
};

type HostNode = {
	type: string;
	style?: unknown;
	value?: string;
	children?: HostNode[];
};

const nodeText = (node: HostNode): string => node.value ?? (node.children ?? []).map(nodeText).join("");

const findLink = (node: HostNode, target: string): HostNode | undefined => {
	if (node.type === "LINK" && nodeText(node) === target) return node;
	for (const child of node.children ?? []) {
		const match = findLink(child, target);
		if (match) return match;
	}
};

const linkDecoration = async (hideLinkUnderline: boolean) => {
	const data = structuredClone(defaultResumeData);
	data.picture.hidden = true;
	data.basics.name = "Link control";
	data.basics.email = "dates@example.com";
	data.metadata.page.hideLinkUnderline = hideLinkUnderline;
	data.metadata.layout.pages = [{ fullWidth: true, main: [], sidebar: [] }];
	const instance = pdf(createElement(ResumeDocument, { data, template: "chikorita" }) as never);
	await expect.poll(() => instance.container.document).not.toBeNull();
	const link = findLink(instance.container.document as HostNode, data.basics.email);
	const styles = Array.isArray(link?.style) ? link.style : link?.style ? [link.style] : [];
	return Object.assign({}, ...styles).textDecoration;
};

const flatten = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flatten)];

describe("date layout characterization (#3155, #2841)", () => {
	it.each([
		["chikorita", "ltr"],
		["ditto", "ltr"],
		["chikorita", "rtl"],
		["ditto", "rtl"],
	] as const)("records Q7 date matrix coordinates and raster for %s %s", async (template, direction) => {
		const data = dateFixture(direction === "rtl" ? "ar-SA" : "en-US");
		const result = await renderFixture(data, template);
		const coordinates = requiredMarkers(result);
		const text = textFor(result);
		expect(text).toContain("Publication Empty Date");
		expect(text).toContain("Custom Publications matrix");
		const location = textItems(result, "Oslo LOCATION_ORDER");
		expect(
			location,
			location.map((item) => `${item.str}@${item.transform[4]},${item.transform[5]}`).join(" | "),
		).toHaveLength(1);
		coordinates.LOCATION_ORDER = location.map((item) => ({
			x: Number(item.transform[4].toFixed(2)),
			y: Number(item.transform[5].toFixed(2)),
			width: Number(item.width.toFixed(2)),
			text: item.str,
		}));
		if (template === "chikorita" && direction === "ltr") {
			const date = required(markerItems(result, "EXP_LONG")[0]);
			expect(location[0]?.transform[5]).toBeGreaterThan(date.transform[5]);
		}
		for (const marker of dateMarkers) expect(markerItems(result, marker), marker).toHaveLength(1);
		writeArtifacts(`${template}-${direction}`, result, coordinates);
		assertFixtureBaseline(`${template}-${direction}`, result, coordinates);
	});

	it("records default date evidence for every template without claiming parity geometry", async () => {
		const evidence: Record<string, unknown> = {};
		for (const template of templates) {
			const result = await renderFixture(dateFixture(), template);
			const coordinates = coordinatesFor(result, dateMarkers);
			const missingMarkers = dateMarkers.filter((marker) => markerItems(result, marker).length === 0);
			expect(missingMarkers, template).toEqual(expectedMissingMarkers[template]);
			evidence[template] = {
				pageCount: result.pages.length,
				textItemCount: allItems(result).length,
				missingMarkers,
				rasterSha256: result.raster.map((page) => createHash("sha256").update(page.data).digest("hex")),
				coordinates,
			};
		}
		const output = process.env.DATE_LAYOUT_ARTIFACT_DIR;
		if (output) {
			mkdirSync(output, { recursive: true });
			writeFileSync(join(output, "all-templates.json"), `${JSON.stringify(evidence, null, "\t")}\n`);
		} else {
			const baseline: Record<string, { rasterSha256: string[] }> = JSON.parse(
				readFileSync(join(baselineDirectory, "all-templates.json"), "utf8"),
			);
			if (comparesPixels) expect(baseline).toEqual(evidence);
			else {
				const portable = (entries: Record<string, { rasterSha256: string[] }>) =>
					Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, withoutPixels(value)]));
				expect(portable(baseline)).toEqual(portable(evidence as Record<string, { rasterSha256: string[] }>));
			}
		}
	});

	it("verifies #2841 link underline toggle independently of date layout", async () => {
		expect(await linkDecoration(false)).toBe("underline");
		expect(await linkDecoration(true)).toBe("none");
	});

	it("verifies #2841 level design variants and explicit size control independently", () => {
		const data = dateFixture();
		data.sections.skills.items = [
			{
				id: "skill-level-control",
				hidden: false,
				icon: "star",
				iconColor: "",
				name: "Level control",
				proficiency: "",
				level: 3,
				keywords: [],
			},
		];
		data.metadata.layout.pages = [{ fullWidth: true, main: ["skills"], sidebar: [] }];
		for (const type of ["hidden", "circle", "square", "rectangle", "rectangle-full", "progress-bar", "icon"] as const) {
			data.metadata.design.level = { type, icon: "star" };
			const runtime = resolveResumeRuntime({ data, template: "chikorita", mode: "legacy" });
			const level = flatten(runtime.sourceTree).find((node) => node.kind === "level");
			if (type === "hidden") expect(level).toBeUndefined();
			else expect(level?.children.every((node) => node.attributes.type === type)).toBe(true);
		}
		expect(resolveLevelDisplaySizes({ bodyFontSize: 12 })).toEqual({ decorationSize: 10, levelIconExplicitSize: 14 });
		expect(resolveLevelDisplaySizes({ bodyFontSize: 12, levelFontSize: 7 })).toEqual({
			decorationSize: 7,
			levelIconExplicitSize: 7,
		});
	});
});
