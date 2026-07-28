import type { SemanticNode } from "@reactive-resume/resume/stylesheet/types";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { TemplateSemanticManifest } from "./template-manifest";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { templateSchema } from "@reactive-resume/schema/templates";
import { createBindingInventory } from "./binding-inventory";
import {
	getTemplateSemanticBindingRegistry,
	getTemplateSemanticManifest,
	getTemplateSemanticRegistryFingerprintInput,
	validateTemplateSemanticManifest,
} from "./template-manifest";
import { buildSemanticTree } from "./tree";

const EXPECTED_PARTS = {
	azurill: {
		"timeline-line": {
			key: "timeline-line",
			owner: { kind: "section-items", key: "section-items", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start" },
		},
		"timeline-dot": {
			key: "timeline-dot",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "timeline-marker", at: "start" },
		},
		"timeline-marker": {
			key: "timeline-marker",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start" },
		},
		"timeline-content": {
			key: "timeline-content",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "end", take: "all" },
		},
	},
	bronzor: {
		"interleaved-section-row": {
			key: "interleaved-section-row",
			owner: { kind: "section", key: "section", placement: "main" },
			binding: { type: "alias", canonicalKind: "section", token: "interleaved-section-row" },
		},
	},
	chikorita: {},
	ditgar: {
		"featured-summary": {
			key: "featured-summary",
			owner: { kind: "region", key: "featured" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: "all" },
		},
		"sidebar-background": {
			key: "sidebar-background",
			owner: { kind: "region", key: "sidebar" },
			binding: { type: "alias", canonicalKind: "region", token: "sidebar-background" },
		},
		"item-header-border": {
			key: "item-header-border",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: [
					"profiles",
					"experience",
					"education",
					"projects",
					"skills",
					"languages",
					"interests",
					"awards",
					"certifications",
					"publications",
					"volunteer",
					"references",
				],
			},
			binding: { type: "alias", canonicalKind: "item-header", token: "item-header-border" },
		},
	},
	ditto: {
		"header-band": {
			key: "header-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [{ kind: "picture" }, { kind: "name" }, { kind: "headline" }],
			},
		},
		"picture-anchor": {
			key: "picture-anchor",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "header-band", at: "start", take: [{ kind: "picture" }] },
		},
		"contact-offset": {
			key: "contact-offset",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: { before: { kind: "contact-list" } } },
		},
	},
	gengar: {
		"featured-summary": {
			key: "featured-summary",
			owner: { kind: "region", key: "featured" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: "all" },
		},
		"sidebar-background": {
			key: "sidebar-background",
			owner: { kind: "region", key: "sidebar" },
			binding: { type: "alias", canonicalKind: "region", token: "sidebar-background" },
		},
	},
	glalie: {
		"sidebar-background": {
			key: "sidebar-background",
			owner: { kind: "region", key: "sidebar" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start" },
		},
	},
	kakuna: {},
	lapras: {},
	leafish: {
		"header-intro": {
			key: "header-intro",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [{ kind: "picture" }, { kind: "name" }, { kind: "headline" }, { kind: "section", name: "summary" }],
			},
		},
		"header-body": {
			key: "header-body",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "header-intro", at: "start", take: "all" },
		},
		"header-contact-band": {
			key: "header-contact-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "end", take: [{ kind: "contact-list" }] },
		},
	},
	meowth: {
		"inline-item-header-leading": {
			key: "inline-item-header-leading",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: ["experience", "education", "volunteer"],
			},
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [
					{ kind: "field", name: "position", sectionTypes: ["experience", "volunteer"] },
					{ kind: "field", name: "location", sectionTypes: ["experience", "volunteer"] },
					{ kind: "field", name: "area", sectionTypes: ["education"] },
					{ kind: "field", name: "degree", sectionTypes: ["education"] },
				],
			},
		},
		"inline-item-header-middle": {
			key: "inline-item-header-middle",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: ["experience", "education", "volunteer"],
			},
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: {
				parent: "owner",
				at: "start",
				take: [
					{ kind: "field", name: "company" },
					{ kind: "field", name: "school" },
					{ kind: "field", name: "organization" },
					{ kind: "link" },
				],
			},
		},
		"inline-item-header-trailing": {
			key: "inline-item-header-trailing",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: ["experience", "education", "volunteer"],
			},
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: [{ kind: "field", name: "period" }] },
		},
	},
	onyx: {},
	pikachu: {
		"header-divider": {
			key: "header-divider",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start", take: [{ kind: "name" }, { kind: "headline" }] },
		},
	},
	rhyhorn: {
		"contact-item-content": {
			key: "contact-item-content",
			owner: { kind: "contact-item", key: "contact-item" },
			binding: {
				type: "primitive",
				primitive: { ownerRole: "structured-link", present: "Link", absent: "View" },
				source: "existing",
			},
			route: { parent: "owner", at: "start", take: "all" },
		},
		"contact-item-last": {
			key: "contact-item-last",
			owner: { kind: "contact-item", key: "contact-item", position: "last" },
			binding: { type: "alias", canonicalKind: "contact-item", token: "contact-item-last" },
		},
	},
	scizor: {
		"header-name-rule": {
			key: "header-name-rule",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: { before: { kind: "headline" } } },
		},
	},
} as const satisfies Readonly<Record<Template, Readonly<Record<string, object>>>>;

const EXPECTED_LAYOUT = {
	azurill: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	bronzor: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["sidebar", "main"], flow: "interleaved" },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	chikorita: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	ditgar: {
		regions: [
			{ name: "header", placement: "sidebar", origins: [] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
			{ name: "featured", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
		],
		header: { region: "header", placement: "sidebar" },
		specialSummary: { region: "featured", placement: "main", source: "main-with-header" },
	},
	ditto: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	gengar: {
		regions: [
			{ name: "header", placement: "sidebar", origins: [] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
			{ name: "featured", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
		],
		header: { region: "header", placement: "sidebar" },
		specialSummary: { region: "featured", placement: "main", source: "main-with-header" },
	},
	glalie: {
		regions: [
			{ name: "header", placement: "sidebar", origins: [] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
			{ name: "main", placement: "main", origins: ["main"] },
		],
		header: { region: "header", placement: "sidebar" },
		specialSummary: null,
	},
	kakuna: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	lapras: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	leafish: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: { region: "header", placement: "main", source: "always" },
	},
	meowth: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	onyx: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	pikachu: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	rhyhorn: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main"] },
			{ name: "sidebar", placement: "sidebar", origins: ["sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
	scizor: {
		regions: [
			{ name: "header", placement: "main", origins: [] },
			{ name: "main", placement: "main", origins: ["main", "sidebar"] },
		],
		header: { region: "header", placement: "main" },
		specialSummary: null,
	},
} as const satisfies Readonly<Record<Template, Omit<TemplateSemanticManifest, "template" | "parts">>>;

const flattenTree = (node: SemanticNode): SemanticNode[] => [node, ...node.children.flatMap(flattenTree)];
const flattenValues = (value: unknown): unknown[] =>
	typeof value === "object" && value !== null ? [value, ...Object.values(value).flatMap(flattenValues)] : [value];
const findNodes = (node: SemanticNode, predicate: (candidate: SemanticNode) => boolean): SemanticNode[] =>
	flattenTree(node).filter(predicate);
const findPart = (node: SemanticNode, name: string): SemanticNode | undefined =>
	findNodes(node, (candidate) => candidate.kind === "template-part" && candidate.attributes.name === name)[0];
const childLabels = (node: SemanticNode): string[] =>
	node.children.map((child) => (child.kind === "template-part" ? (child.attributes.name ?? "") : child.kind));

const buildFixture = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.picture.url = "/uploads/ada.png";
	data.basics = {
		name: "Ada Lovelace",
		headline: "Engineer",
		email: "ada@example.com",
		phone: "",
		location: "",
		website: { url: "", label: "" },
		customFields: [],
	};
	data.summary.content = "<p>Summary</p>";
	data.sections.experience.columns = 1;
	data.sections.experience.items = [
		{
			id: "experience/1",
			hidden: false,
			company: "Analytical Engines",
			position: "Engineer",
			location: "London",
			period: "1842",
			website: { url: "", label: "", inlineLink: false },
			description: "<p>Built algorithms.</p>",
			roles: [],
		},
	];
	data.sections.skills.items = [
		{
			id: "skills/1",
			hidden: false,
			icon: "code",
			iconColor: "",
			name: "TypeScript",
			proficiency: "Expert",
			level: 4,
			keywords: ["PDF"],
		},
	];

	return data;
};

const buildFixtureTree = (template: Template, showHeader = true): SemanticNode => {
	const data = buildFixture();
	const page = { fullWidth: false, main: ["summary", "experience"], sidebar: ["skills"] };

	return buildSemanticTree({ data, template, page, pageNumber: 1, showHeader });
};

describe("template semantic manifests", () => {
	it.each(templateSchema.options)("%s publishes a semantic manifest", (template) => {
		expect(getTemplateSemanticManifest(template)).toBeDefined();
	});

	it.each(templateSchema.options)("%s declares only its exact existing parts and owner bindings", (template) => {
		const parts = Object.fromEntries(
			getTemplateSemanticManifest(template).parts.map(({ name, ...part }) => [name, part]),
		);

		expect(parts).toEqual(EXPECTED_PARTS[template]);
	});

	it("declares Rhyhorn's outer contact primitive override and no unrelated canonical overrides", () => {
		expect(getTemplateSemanticManifest("rhyhorn").canonicalBindings).toEqual([
			{ kind: "contact-item", binding: { type: "primitive", primitive: "View", source: "existing" } },
		]);
		expect(
			templateSchema.options
				.filter((template) => template !== "rhyhorn")
				.every((template) => getTemplateSemanticManifest(template).canonicalBindings === undefined),
		).toBe(true);
	});

	it.each(templateSchema.options)(
		"%s declares its exact regions, header, and special-summary placement",
		(template) => {
			const { regions, header, specialSummary } = getTemplateSemanticManifest(template);

			expect({ regions, header, specialSummary }).toEqual(EXPECTED_LAYOUT[template]);
		},
	);

	it("rejects duplicate part names and keys", () => {
		const duplicateName = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;
		const duplicateKey = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;
		const first = duplicateName.parts[0];
		if (!first) throw new Error("Missing Ditto part fixture");

		(duplicateName.parts as TemplateSemanticManifest["parts"][number][]).push({
			...first,
			key: "another-key",
		});
		(duplicateKey.parts as TemplateSemanticManifest["parts"][number][]).push({
			...first,
			name: "another-name",
		});

		expect(() => validateTemplateSemanticManifest(duplicateName)).toThrow(/duplicate part name/);
		expect(() => validateTemplateSemanticManifest(duplicateKey)).toThrow(/duplicate part key/);
	});

	it("rejects unknown placements, owner lies, synthetic wrappers, and missing or invented chrome", () => {
		const unknownRegionPlacement = structuredClone(
			getTemplateSemanticManifest("chikorita"),
		) as TemplateSemanticManifest;
		const unknownHeaderPlacement = structuredClone(
			getTemplateSemanticManifest("chikorita"),
		) as TemplateSemanticManifest;
		const ownerLie = structuredClone(getTemplateSemanticManifest("bronzor")) as TemplateSemanticManifest;
		const synthetic = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;
		const missing = structuredClone(getTemplateSemanticManifest("azurill")) as TemplateSemanticManifest;
		const invented = structuredClone(getTemplateSemanticManifest("chikorita")) as TemplateSemanticManifest;

		(unknownRegionPlacement.regions[0] as { placement: string }).placement = "footer";
		(unknownHeaderPlacement.header as { placement: string }).placement = "footer";
		const alias = ownerLie.parts[0]?.binding;
		if (alias?.type !== "alias") throw new Error("Missing Bronzor alias fixture");
		(alias as { canonicalKind: string }).canonicalKind = "item";
		const primitive = synthetic.parts[0]?.binding;
		if (primitive?.type !== "primitive") throw new Error("Missing Ditto primitive fixture");
		(primitive as unknown as { source: string }).source = "synthetic";
		(missing.parts as TemplateSemanticManifest["parts"][number][]).pop();
		(invented.parts as TemplateSemanticManifest["parts"][number][]).push({
			name: "invented-wrapper",
			key: "invented-wrapper",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
			route: { parent: "owner", at: "start" },
		});

		expect(() => validateTemplateSemanticManifest(unknownRegionPlacement)).toThrow(/unknown region placement/);
		expect(() => validateTemplateSemanticManifest(unknownHeaderPlacement)).toThrow(/unknown header placement/);
		expect(() => validateTemplateSemanticManifest(ownerLie)).toThrow(/aliases a non-owner primitive/);
		expect(() => validateTemplateSemanticManifest(synthetic)).toThrow(/synthetic wrapper/);
		expect(() => validateTemplateSemanticManifest(missing)).toThrow(/frozen renderer contract/);
		expect(() => validateTemplateSemanticManifest(invented)).toThrow(/frozen renderer contract/);
	});

	it("rejects exact renderer-contract mutations across layout, routing, bindings, conditions, and chrome", () => {
		const removedMain = structuredClone(getTemplateSemanticManifest("chikorita")) as TemplateSemanticManifest;
		const wrongOrigin = structuredClone(getTemplateSemanticManifest("chikorita")) as TemplateSemanticManifest;
		const wrongFlow = structuredClone(getTemplateSemanticManifest("bronzor")) as TemplateSemanticManifest;
		const wrongPrimitive = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;
		const primitiveToAlias = structuredClone(getTemplateSemanticManifest("rhyhorn")) as TemplateSemanticManifest;
		const aliasToPrimitive = structuredClone(getTemplateSemanticManifest("bronzor")) as TemplateSemanticManifest;
		const wrongSummary = structuredClone(getTemplateSemanticManifest("leafish")) as TemplateSemanticManifest;
		const unknownOwner = structuredClone(getTemplateSemanticManifest("bronzor")) as TemplateSemanticManifest;
		const changedCondition = structuredClone(getTemplateSemanticManifest("azurill")) as TemplateSemanticManifest;
		const changedSelectorCondition = structuredClone(getTemplateSemanticManifest("meowth")) as TemplateSemanticManifest;
		const missingChrome = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;
		const extraChrome = structuredClone(getTemplateSemanticManifest("ditto")) as TemplateSemanticManifest;

		(removedMain.regions as TemplateSemanticManifest["regions"][number][]).splice(1, 1);
		(wrongOrigin.regions[1]?.origins as string[])[0] = "sidebar";
		(wrongFlow.regions[1] as { flow: string }).flow = "sequential";
		const headerBand = wrongPrimitive.parts.find((part) => part.name === "header-band");
		if (headerBand?.binding.type !== "primitive") throw new Error("Missing Ditto header band");
		(headerBand.binding as { primitive: string }).primitive = "Text";
		const content = primitiveToAlias.parts.find((part) => part.name === "contact-item-content");
		if (!content) throw new Error("Missing Rhyhorn content");
		(content as unknown as { binding: object; route?: object }).binding = {
			type: "alias",
			canonicalKind: "contact-item",
			token: "contact-item-content",
		};
		delete (content as unknown as { route?: object }).route;
		const row = aliasToPrimitive.parts[0];
		if (!row) throw new Error("Missing Bronzor row");
		(row as unknown as { binding: object; route?: object }).binding = {
			type: "primitive",
			primitive: "View",
			source: "existing",
		};
		(row as unknown as { route?: object }).route = { parent: "owner", at: "start" };
		if (!wrongSummary.specialSummary) throw new Error("Missing Leafish summary");
		(wrongSummary.specialSummary as { source: string }).source = "main-with-header";
		(unknownOwner.parts[0]?.owner as unknown as { key: string }).key = "unknown";
		const line = changedCondition.parts.find((part) => part.name === "timeline-line");
		if (!line || !("columns" in line.owner)) throw new Error("Missing Azurill timeline line");
		delete (line.owner as { columns?: number }).columns;
		const leading = changedSelectorCondition.parts.find((part) => part.name === "inline-item-header-leading");
		if (leading?.binding.type !== "primitive" || !leading.route || !Array.isArray(leading.route.take)) {
			throw new Error("Missing Meowth leading selectors");
		}
		(leading.route.take[0]?.sectionTypes as string[])[0] = "education";
		(missingChrome.parts as TemplateSemanticManifest["parts"][number][]).pop();
		const extra = structuredClone(extraChrome.parts[0]);
		if (!extra) throw new Error("Missing Ditto chrome");
		(extra as { name: string; key: string }).name = "extra";
		(extra as { name: string; key: string }).key = "extra";
		(extraChrome.parts as TemplateSemanticManifest["parts"][number][]).push(extra);

		for (const mutation of [
			removedMain,
			wrongOrigin,
			wrongFlow,
			wrongPrimitive,
			primitiveToAlias,
			aliasToPrimitive,
			wrongSummary,
			unknownOwner,
			changedCondition,
			changedSelectorCondition,
			missingChrome,
			extraChrome,
		]) {
			expect(() => validateTemplateSemanticManifest(mutation)).toThrow();
		}
	});

	it("rejects empty and unknown selector section conditions before exact-contract comparison", () => {
		const empty = structuredClone(getTemplateSemanticManifest("meowth")) as TemplateSemanticManifest;
		const unknown = structuredClone(getTemplateSemanticManifest("meowth")) as TemplateSemanticManifest;
		const getFirstSelector = (manifest: TemplateSemanticManifest) => {
			const leading = manifest.parts.find((part) => part.name === "inline-item-header-leading");
			if (
				leading?.binding.type !== "primitive" ||
				!leading.route ||
				!Array.isArray(leading.route.take) ||
				!leading.route.take[0]
			) {
				throw new Error("Missing Meowth leading selector");
			}
			return leading.route.take[0];
		};

		(getFirstSelector(empty) as { sectionTypes: string[] }).sectionTypes = [];
		(getFirstSelector(unknown) as { sectionTypes: string[] }).sectionTypes = ["unknown"];

		expect(() => validateTemplateSemanticManifest(empty)).toThrow(/selector section types must not be empty/);
		expect(() => validateTemplateSemanticManifest(unknown)).toThrow(/selector has an unknown section type/);
	});

	it("rejects cyclic and unsupported-depth primitive routing before exact-contract comparison", () => {
		const cycle = structuredClone(getTemplateSemanticManifest("azurill")) as TemplateSemanticManifest;
		const tooDeep = structuredClone(getTemplateSemanticManifest("azurill")) as TemplateSemanticManifest;
		const marker = cycle.parts.find((part) => part.name === "timeline-marker");
		if (marker?.binding.type !== "primitive") throw new Error("Missing Azurill marker");
		(marker.route as { parent: string }).parent = "timeline-dot";
		const content = tooDeep.parts.find((part) => part.name === "timeline-content");
		if (content?.binding.type !== "primitive") throw new Error("Missing Azurill content");
		(content.route as { parent: string }).parent = "timeline-dot";

		expect(() => validateTemplateSemanticManifest(cycle)).toThrow(/cyclic part routing/);
		expect(() => validateTemplateSemanticManifest(tooDeep)).toThrow(/unsupported part routing depth/);
	});

	it.each(templateSchema.options)("%s builds its manifest-backed tree without key collisions", (template) => {
		const tree = buildFixtureTree(template);
		const nodes = flattenTree(tree);
		const partNames = new Set(
			findNodes(tree, (node) => node.kind === "template-part").map((node) => node.attributes.name),
		);
		const expectedPrimitiveParts = new Set(
			getTemplateSemanticManifest(template).parts.flatMap((part) =>
				part.binding.type === "primitive" ? [part.name] : [],
			),
		);

		expect(partNames).toEqual(expectedPrimitiveParts);
		expect(new Set(nodes.map((node) => node.key)).size).toBe(nodes.length);
	});

	it("routes every registered primitive part through exactly the child kinds used by all template trees", () => {
		const data = buildFixture();
		data.basics.phone = "+44 123";
		data.basics.location = "London";
		data.basics.website = { url: "https://example.com", label: "Website" };
		data.sections.education.hidden = false;
		data.sections.volunteer.hidden = false;
		data.sections.experience.items = [
			{
				id: "experience/inline",
				hidden: false,
				company: "Analytical Engines",
				position: "Engineer",
				location: "London",
				period: "1842",
				website: { url: "https://inline.example.com", label: "Inline", inlineLink: true },
				description: "<p>Built algorithms.</p>",
				roles: [],
			},
			{
				id: "experience/nested",
				hidden: false,
				company: "Difference Engines",
				position: "Programmer",
				location: "London",
				period: "1843",
				website: { url: "https://outside.example.com", label: "Outside", inlineLink: false },
				description: "",
				roles: [
					{
						id: "role/1",
						position: "Programmer",
						period: "1843",
						description: "<p>Published programs.</p>",
					},
				],
			},
		];
		data.sections.education.items = [
			{
				id: "education/coverage",
				hidden: false,
				school: "University",
				area: "Mathematics",
				degree: "BSc",
				grade: "First",
				location: "Oxford",
				period: "1835",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		data.sections.volunteer.items = [
			{
				id: "volunteer/coverage",
				hidden: false,
				organization: "Volunteer Guild",
				location: "Paris",
				period: "1840",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		const page = {
			fullWidth: false,
			main: ["summary", "experience", "education", "volunteer", "skills"],
			sidebar: [],
		};
		const partNames = new Set<string>();
		const childPairs = new Set<string>();

		for (const template of templateSchema.options) {
			const tree = buildSemanticTree({ data, template, page, pageNumber: 1, showHeader: true });
			for (const part of findNodes(tree, (node) => node.kind === "template-part")) {
				const name = part.attributes.name;
				if (!name) throw new Error("Template part is missing its name");
				partNames.add(name);
				for (const child of part.children) {
					childPairs.add(`${name}:${child.kind}`);
				}
			}
		}

		expect([...partNames].sort()).toEqual(
			[
				"contact-item-content",
				"contact-offset",
				"featured-summary",
				"header-band",
				"header-body",
				"header-contact-band",
				"header-divider",
				"header-intro",
				"header-name-rule",
				"inline-item-header-leading",
				"inline-item-header-middle",
				"inline-item-header-trailing",
				"picture-anchor",
				"sidebar-background",
				"timeline-content",
				"timeline-dot",
				"timeline-line",
				"timeline-marker",
			].sort(),
		);
		expect([...childPairs].sort()).toEqual(
			[
				"contact-item-content:field",
				"contact-item-content:icon",
				"contact-item-content:link",
				"featured-summary:section",
				"header-band:headline",
				"header-band:name",
				"header-band:template-part",
				"header-body:headline",
				"header-body:name",
				"header-body:picture",
				"header-body:section",
				"header-contact-band:contact-list",
				"header-divider:headline",
				"header-divider:name",
				"header-intro:template-part",
				"inline-item-header-leading:field",
				"inline-item-header-middle:field",
				"inline-item-header-middle:link",
				"inline-item-header-trailing:field",
				"picture-anchor:picture",
				"timeline-content:field",
				"timeline-content:item",
				"timeline-content:item-header",
				"timeline-content:level",
				"timeline-content:link",
				"timeline-marker:template-part",
			].sort(),
		);
	});

	it("nests Azurill's dot under its existing marker primitive", () => {
		const tree = buildFixtureTree("azurill");
		const marker = findNodes(
			tree,
			(node) => node.kind === "template-part" && node.attributes.name === "timeline-marker",
		)[0];

		expect(marker).toBeDefined();
		expect(
			marker && findNodes(marker, (node) => node.kind === "template-part" && node.attributes.name === "timeline-dot"),
		).toHaveLength(1);
	});

	it("routes Azurill's canonical items through its exact timeline primitive hierarchy", () => {
		const tree = buildFixtureTree("azurill");
		const experience = findNodes(tree, (node) => node.kind === "section" && node.id === "experience")[0];
		const sectionItems = experience && findNodes(experience, (node) => node.kind === "section-items")[0];
		const item = sectionItems?.children.find((node) => node.kind === "item");
		const marker = item && findPart(item, "timeline-marker");
		const content = item && findPart(item, "timeline-content");

		expect(sectionItems && childLabels(sectionItems)).toEqual(["timeline-line", "item"]);
		expect(item && childLabels(item)).toEqual(["timeline-marker", "timeline-content"]);
		expect(marker && childLabels(marker)).toEqual(["timeline-dot"]);
		expect(content?.children.some((node) => node.kind === "item-header")).toBe(true);
	});

	it("routes Leafish's header content through intro, body, and contact-band primitives", () => {
		const tree = buildFixtureTree("leafish");
		const header = findNodes(tree, (node) => node.kind === "header")[0];
		const intro = header && findPart(header, "header-intro");
		const body = intro && findPart(intro, "header-body");
		const contactBand = header && findPart(header, "header-contact-band");

		expect(header && childLabels(header)).toEqual(["header-intro", "header-contact-band"]);
		expect(intro && childLabels(intro)).toEqual(["header-body"]);
		expect(body && childLabels(body)).toEqual(["picture", "name", "headline", "section"]);
		expect(contactBand && childLabels(contactBand)).toEqual(["contact-list"]);
	});

	it("routes Ditto's header content through its exact primitive hierarchy and order", () => {
		const tree = buildFixtureTree("ditto");
		const header = findNodes(tree, (node) => node.kind === "header")[0];
		const band = header && findPart(header, "header-band");
		const anchor = band && findPart(band, "picture-anchor");

		expect(header && childLabels(header)).toEqual(["header-band", "contact-offset", "contact-list"]);
		expect(band && childLabels(band)).toEqual(["picture-anchor", "name", "headline"]);
		expect(anchor && childLabels(anchor)).toEqual(["picture"]);
	});

	it.each([
		["bronzor", "section", "interleaved-section-row"],
		["ditgar", "region", "sidebar-background"],
		["gengar", "region", "sidebar-background"],
	] as const)("%s applies %s to its canonical %s owner without an alias node", (template, kind, token) => {
		const tree = buildFixtureTree(template);
		const owner = findNodes(
			tree,
			(node) => node.kind === kind && node.attributes.part?.split(" ").includes(token) === true,
		)[0];

		expect(owner).toBeDefined();
		expect(findPart(tree, token)).toBeUndefined();
	});

	it("counts template aliases on their canonical owners in the binding inventory", () => {
		const tree = buildFixtureTree("bronzor");
		const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry("bronzor"));
		const aliasedSections = findNodes(
			tree,
			(node) => node.kind === "section" && node.attributes.part === "interleaved-section-row",
		);

		expect(aliasedSections.length).toBeGreaterThan(0);
		expect(aliasedSections.map((node) => inventory.aliasTokensByNodeKey[node.key])).toEqual(
			aliasedSections.map(() => ["interleaved-section-row"]),
		);
		expect(
			Object.values(inventory.bindings).some(
				(binding) => binding.type === "alias" && binding.token === "interleaved-section-row",
			),
		).toBe(false);
	});

	it("binds Rhyhorn's outer contacts to View, nests their real content primitive, and aliases the rendered last owner", () => {
		const data = buildFixture();
		data.basics.location = "London";
		const tree = buildSemanticTree({
			data,
			template: "rhyhorn",
			page: { fullWidth: true, main: [], sidebar: [] },
			pageNumber: 1,
			showHeader: true,
		});
		const contacts = findNodes(tree, (node) => node.kind === "contact-item");
		const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry("rhyhorn"));

		expect(contacts).toHaveLength(2);
		expect(contacts.map((node) => childLabels(node))).toEqual([["contact-item-content"], ["contact-item-content"]]);
		expect(contacts.map((node) => inventory.bindings[node.key])).toEqual([
			{ type: "primitive", primitive: "View", source: "existing" },
			{ type: "primitive", primitive: "View", source: "existing" },
		]);
		expect(
			contacts.map((node) => {
				const content = findPart(node, "contact-item-content");
				return content && inventory.bindings[content.key];
			}),
		).toEqual([
			{ type: "primitive", primitive: "Link", source: "existing" },
			{ type: "primitive", primitive: "View", source: "existing" },
		]);
		const semanticLink = findNodes(contacts[0] ?? tree, (node) => node.kind === "link")[0];
		const linkedContent = findPart(contacts[0] ?? tree, "contact-item-content");
		expect(semanticLink && inventory.bindings[semanticLink.key]).toEqual({
			type: "alias",
			canonicalKind: "template-part",
			canonicalNodeKey: linkedContent?.key,
			token: "structured-link",
		});
		expect(
			[contacts[0]?.key, linkedContent?.key, semanticLink?.key].filter(
				(key): key is string => key !== undefined && inventory.bindings[key]?.type === "primitive",
			),
		).toEqual([contacts[0]?.key, linkedContent?.key]);
		expect(contacts[0]?.attributes.part).toBeUndefined();
		expect(contacts[1]?.attributes.part).toBe("contact-item-last");
		expect(inventory.aliasTokensByNodeKey[contacts[1]?.key ?? ""]).toEqual(["contact-item-last"]);
		expect(findPart(tree, "contact-item-last")).toBeUndefined();
	});

	it("does not invent Rhyhorn last-contact chrome when no contact is rendered or the header is hidden", () => {
		const data = buildFixture();
		data.basics.email = "";
		data.basics.customFields = [];
		const input = {
			data,
			template: "rhyhorn" as const,
			page: { fullWidth: true, main: [], sidebar: [] },
			pageNumber: 1,
		};
		const empty = buildSemanticTree({ ...input, showHeader: true });
		const hidden = buildSemanticTree({ ...input, showHeader: false });

		expect(findNodes(empty, (node) => node.kind === "contact-item")).toHaveLength(0);
		expect(findNodes(empty, (node) => node.attributes.part === "contact-item-last")).toHaveLength(0);
		expect(findNodes(hidden, (node) => node.kind === "header")).toHaveLength(0);
	});

	it.each(["bronzor", "scizor"] as const)(
		"%s preserves layout origin separately from physical placement",
		(template) => {
			const tree = buildFixtureTree(template);
			const sidebarOrigin = findNodes(tree, (node) => node.kind === "section" && node.attributes.origin === "sidebar");

			expect(sidebarOrigin.length).toBeGreaterThan(0);
			expect(sidebarOrigin.every((node) => node.attributes.placement === "main")).toBe(true);
		},
	);

	it.each([
		["ditgar", "sidebar"],
		["gengar", "sidebar"],
		["glalie", "sidebar"],
		["azurill", "main"],
		["leafish", "main"],
		["pikachu", "main"],
	] as const)("%s places its header in the renderer-owned %s column", (template, placement) => {
		const headerRegion = findNodes(
			buildFixtureTree(template),
			(node) => node.kind === "region" && node.attributes.region === "header",
		)[0];

		expect(headerRegion?.attributes.placement).toBe(placement);
	});

	it.each(["ditgar", "gengar"] as const)("%s moves the first-page summary into its featured region", (template) => {
		const tree = buildFixtureTree(template);
		const featured = findNodes(tree, (node) => node.kind === "region" && node.attributes.region === "featured")[0];
		const summaries = findNodes(tree, (node) => node.kind === "section" && node.id === "summary");

		expect(featured && findNodes(featured, (node) => node.kind === "section" && node.id === "summary")).toHaveLength(1);
		expect(summaries).toHaveLength(1);
		expect(summaries[0]?.roles).toContain("featured-summary");
	});

	it("places Leafish summary in the header only while the renderer shows that header", () => {
		const withHeader = buildFixtureTree("leafish", true);
		const withoutHeader = buildFixtureTree("leafish", false);
		const headerRegion = findNodes(
			withHeader,
			(node) => node.kind === "region" && node.attributes.region === "header",
		)[0];

		expect(
			headerRegion && findNodes(headerRegion, (node) => node.kind === "section" && node.id === "summary"),
		).toHaveLength(1);
		expect(findNodes(withHeader, (node) => node.kind === "section" && node.id === "summary")).toHaveLength(1);
		expect(findNodes(withoutHeader, (node) => node.kind === "section" && node.id === "summary")).toHaveLength(0);
	});

	it("omits Leafish's header summary when the shared Summary renderer is not visible", () => {
		const data = buildFixture();
		data.summary.content = "";
		const tree = buildSemanticTree({
			data,
			template: "leafish",
			page: { fullWidth: true, main: ["summary", "experience"], sidebar: [] },
			pageNumber: 1,
			showHeader: true,
		});

		expect(findNodes(tree, (node) => node.kind === "section" && node.id === "summary")).toHaveLength(0);
	});

	it.each(["ditgar", "gengar"] as const)("%s leaves summary in main when featured chrome is absent", (template) => {
		const tree = buildFixtureTree(template, false);
		const summary = findNodes(tree, (node) => node.kind === "section" && node.id === "summary");

		expect(findNodes(tree, (node) => node.kind === "region" && node.attributes.region === "featured")).toHaveLength(0);
		expect(summary).toHaveLength(1);
		expect(summary[0]?.attributes).toMatchObject({ origin: "main", placement: "main" });
		expect(summary[0]?.roles).not.toContain("featured-summary");
	});

	it("emits Ditgar's existing item-header border owner for language and reference items", () => {
		const data = buildFixture();
		data.sections.languages.items = [
			{ id: "language/1", hidden: false, language: "English", fluency: "Native", level: 4 },
		];
		data.sections.references.items = [
			{
				id: "reference/1",
				hidden: false,
				name: "Charles Babbage",
				position: "Inventor",
				phone: "+44 123",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "ditgar",
			page: { fullWidth: true, main: ["languages", "references"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});

		for (const itemId of ["language/1", "reference/1"]) {
			const item = findNodes(tree, (node) => node.kind === "item" && node.id === itemId)[0];
			const header = item && findNodes(item, (node) => node.kind === "item-header")[0];

			expect(header).toBeDefined();
			expect(header?.attributes.part).toBe("item-header-border");
			expect(header && findPart(header, "item-header-border")).toBeUndefined();
		}
	});

	it("keeps Ditgar's item-header border owner when optional language and reference header values are empty", () => {
		const data = buildFixture();
		data.sections.languages.hidden = false;
		data.sections.references.hidden = false;
		data.sections.languages.items = [
			{ id: "language/empty", hidden: false, language: "English", fluency: "", level: 4 },
		];
		data.sections.references.items = [
			{
				id: "reference/empty",
				hidden: false,
				name: "Charles Babbage",
				position: "",
				phone: "",
				website: { url: "", label: "", inlineLink: false },
				description: "<p>Reference body</p>",
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "ditgar",
			page: { fullWidth: true, main: ["languages", "references"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});

		for (const itemId of ["language/empty", "reference/empty"]) {
			const item = findNodes(tree, (node) => node.kind === "item" && node.id === itemId)[0];
			const headers = item ? item.children.filter((node) => node.kind === "item-header") : [];

			expect(item).toBeDefined();
			expect(headers).toHaveLength(1);
			expect(headers[0]?.attributes.part).toBe("item-header-border");
		}
	});

	it("keeps Meowth's three inline header primitives when optional header slots are empty", () => {
		const data = buildFixture();
		data.sections.experience.hidden = false;
		data.sections.education.hidden = false;
		data.sections.volunteer.hidden = false;
		data.sections.experience.items = [
			{
				id: "experience/empty",
				hidden: false,
				company: "Analytical Engines",
				position: "",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: false },
				description: "<p>Experience body</p>",
				roles: [],
			},
		];
		data.sections.education.items = [
			{
				id: "education/empty",
				hidden: false,
				school: "University",
				area: "",
				degree: "",
				grade: "",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: false },
				description: "<p>Education body</p>",
			},
		];
		data.sections.volunteer.items = [
			{
				id: "volunteer/empty",
				hidden: false,
				organization: "Volunteer Guild",
				location: "",
				period: "",
				website: { url: "", label: "", inlineLink: false },
				description: "<p>Volunteer body</p>",
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "meowth",
			page: { fullWidth: true, main: ["experience", "education", "volunteer"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});

		for (const itemId of ["experience/empty", "education/empty", "volunteer/empty"]) {
			const item = findNodes(tree, (node) => node.kind === "item" && node.id === itemId)[0];
			const header = item?.children.find((node) => node.kind === "item-header");

			expect(item).toBeDefined();
			expect(header && childLabels(header)).toEqual([
				"inline-item-header-leading",
				"inline-item-header-middle",
				"inline-item-header-trailing",
			]);
			expect(header?.children[0]?.children).toEqual([]);
			expect(header?.children[1]?.children).toHaveLength(1);
			expect(header?.children[2]?.children).toEqual([]);
		}
	});

	it("routes Meowth header fields by section while leaving education grade and location after the inline parts", () => {
		const data = buildFixture();
		data.sections.experience.hidden = false;
		data.sections.education.hidden = false;
		data.sections.volunteer.hidden = false;
		data.sections.experience.items = [
			{
				id: "experience/routing",
				hidden: false,
				company: "Analytical Engines",
				position: "Engineer",
				location: "London",
				period: "1842",
				website: { url: "", label: "", inlineLink: false },
				description: "",
				roles: [],
			},
		];
		data.sections.education.items = [
			{
				id: "education/routing",
				hidden: false,
				school: "University",
				area: "Mathematics",
				degree: "BSc",
				grade: "First",
				location: "Oxford",
				period: "1835",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		data.sections.volunteer.items = [
			{
				id: "volunteer/routing",
				hidden: false,
				organization: "Volunteer Guild",
				location: "Paris",
				period: "1840",
				website: { url: "", label: "", inlineLink: false },
				description: "",
			},
		];
		const tree = buildSemanticTree({
			data,
			template: "meowth",
			page: { fullWidth: true, main: ["experience", "education", "volunteer"], sidebar: [] },
			pageNumber: 1,
			showHeader: false,
		});
		const itemHeader = (itemId: string) => {
			const item = findNodes(tree, (node) => node.kind === "item" && node.id === itemId)[0];
			return item?.children.find((node) => node.kind === "item-header");
		};
		const partFields = (header: SemanticNode | undefined, name: string) =>
			(header && findPart(header, name)?.children.map((node) => node.attributes.name)) ?? [];
		const experience = itemHeader("experience/routing");
		const education = itemHeader("education/routing");
		const volunteer = itemHeader("volunteer/routing");

		expect(partFields(experience, "inline-item-header-leading")).toEqual(["position", "location"]);
		expect(partFields(volunteer, "inline-item-header-leading")).toEqual(["location"]);
		expect(partFields(education, "inline-item-header-leading")).toEqual(["area", "degree"]);
		expect(education && childLabels(education)).toEqual([
			"inline-item-header-leading",
			"inline-item-header-middle",
			"inline-item-header-trailing",
			"field",
			"field",
		]);
		expect(education?.children.slice(3).map((node) => node.attributes.name)).toEqual(["grade", "location"]);
	});

	it.each(["bronzor", "scizor"] as const)(
		"%s keeps duplicate flattened origins and repeated authored pages collision-safe",
		(template) => {
			const data = buildFixture();
			const page = { fullWidth: false, main: ["experience"], sidebar: ["experience"] };
			const first = buildSemanticTree({ data, template, page, pageNumber: 1, showHeader: false });
			const second = buildSemanticTree({ data, template, page, pageNumber: 2, showHeader: false });
			const fullWidth = buildSemanticTree({
				data,
				template,
				page: { ...page, fullWidth: true },
				pageNumber: 1,
				showHeader: false,
			});
			const firstSections = findNodes(first, (node) => node.kind === "section" && node.id === "experience");

			expect(firstSections).toHaveLength(2);
			expect(new Set(firstSections.map((node) => node.key)).size).toBe(2);
			expect(findNodes(second, (node) => node.kind === "section").every((node) => node.key.startsWith("page-2/"))).toBe(
				true,
			);
			expect(findNodes(fullWidth, (node) => node.kind === "section" && node.id === "experience")).toHaveLength(1);
		},
	);

	it("publishes stable, deterministic, deeply frozen fingerprint input without functions", () => {
		const first = getTemplateSemanticRegistryFingerprintInput();
		const second = getTemplateSemanticRegistryFingerprintInput();
		const serialized = JSON.stringify(first);

		expect(second).toBe(first);
		expect(JSON.stringify(second)).toBe(serialized);
		expect(Object.isFrozen(first)).toBe(true);
		expect(Object.isFrozen(first.azurill.parts)).toBe(true);
		expect(flattenValues(first).every((value) => typeof value !== "function")).toBe(true);
		expect(() => {
			(first.azurill.parts as unknown as object[]).pop();
		}).toThrow();
		expect(JSON.stringify(getTemplateSemanticRegistryFingerprintInput())).toBe(serialized);
	});

	it.each(templateSchema.options)(
		"%s binds every manifest node to existing chrome without synthetic wrappers",
		(template) => {
			const tree = buildFixtureTree(template);
			const inventory = createBindingInventory(tree, getTemplateSemanticBindingRegistry(template));
			const nodeCount = flattenTree(tree).length;

			expect(inventory.unboundNodeKeys).toEqual([]);
			expect(inventory.syntheticWrapperCount).toBe(0);
			expect(Object.keys(inventory.bindings)).toHaveLength(nodeCount);
			for (const partNode of findNodes(tree, (node) => node.kind === "template-part")) {
				const binding = inventory.bindings[partNode.key];
				const declaration = getTemplateSemanticManifest(template).parts.find(
					(part) => part.name === partNode.attributes.name,
				);

				expect(declaration).toBeDefined();
				expect(declaration?.binding.type).toBe("primitive");
				if (declaration?.binding.type === "primitive" && typeof declaration.binding.primitive === "string") {
					expect(binding).toEqual(declaration.binding);
				} else if (declaration?.binding.type === "primitive") {
					const primitive = declaration.binding.primitive;
					if (typeof primitive === "string") throw new Error("Expected conditional primitive");
					expect(binding).toMatchObject({
						type: "primitive",
						source: "existing",
					});
					expect([primitive.present, primitive.absent]).toContain(
						binding?.type === "primitive" ? binding.primitive : undefined,
					);
				}
			}
		},
	);
});
