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
		},
		"timeline-dot": {
			key: "timeline-dot",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			parentPart: "timeline-marker",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"timeline-marker": {
			key: "timeline-marker",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"timeline-content": {
			key: "timeline-content",
			owner: { kind: "item", key: "item", placement: "main", columns: 1 },
			binding: { type: "primitive", primitive: "View", source: "existing" },
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
		},
		"picture-anchor": {
			key: "picture-anchor",
			owner: { kind: "header", key: "header" },
			parentPart: "header-band",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"contact-offset": {
			key: "contact-offset",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	},
	gengar: {
		"featured-summary": {
			key: "featured-summary",
			owner: { kind: "region", key: "featured" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
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
		},
	},
	kakuna: {},
	lapras: {},
	leafish: {
		"header-intro": {
			key: "header-intro",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"header-body": {
			key: "header-body",
			owner: { kind: "header", key: "header" },
			parentPart: "header-intro",
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"header-contact-band": {
			key: "header-contact-band",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
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
		},
		"inline-item-header-middle": {
			key: "inline-item-header-middle",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: ["experience", "education", "volunteer"],
			},
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
		"inline-item-header-trailing": {
			key: "inline-item-header-trailing",
			owner: {
				kind: "item-header",
				key: "item-header",
				sectionTypes: ["experience", "education", "volunteer"],
			},
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	},
	onyx: {},
	pikachu: {
		"header-divider": {
			key: "header-divider",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	},
	rhyhorn: {
		"contact-item-content": {
			key: "contact-item-content",
			owner: { kind: "contact-item", key: "contact-item" },
			binding: { type: "alias", canonicalKind: "contact-item", token: "contact-item-content" },
		},
		"contact-item-last": {
			key: "contact-item-last",
			owner: { kind: "contact-item", key: "contact-item", position: "last" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		},
	},
	scizor: {
		"header-name-rule": {
			key: "header-name-rule",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
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
		(primitive as { source: string }).source = "synthetic";
		(missing.parts as TemplateSemanticManifest["parts"][number][]).pop();
		(invented.parts as TemplateSemanticManifest["parts"][number][]).push({
			name: "invented-wrapper",
			key: "invented-wrapper",
			owner: { kind: "header", key: "header" },
			binding: { type: "primitive", primitive: "View", source: "existing" },
		});

		expect(() => validateTemplateSemanticManifest(unknownRegionPlacement)).toThrow(/unknown region placement/);
		expect(() => validateTemplateSemanticManifest(unknownHeaderPlacement)).toThrow(/unknown header placement/);
		expect(() => validateTemplateSemanticManifest(ownerLie)).toThrow(/aliases a non-owner primitive/);
		expect(() => validateTemplateSemanticManifest(synthetic)).toThrow(/synthetic wrapper/);
		expect(() => validateTemplateSemanticManifest(missing)).toThrow(/registered chrome/);
		expect(() => validateTemplateSemanticManifest(invented)).toThrow(/registered chrome/);
	});

	it.each(templateSchema.options)("%s builds its manifest-backed tree without key collisions", (template) => {
		const tree = buildFixtureTree(template);
		const nodes = flattenTree(tree);
		const partNames = new Set(
			findNodes(tree, (node) => node.kind === "template-part").map((node) => node.attributes.name),
		);

		expect(partNames).toEqual(new Set(Object.keys(EXPECTED_PARTS[template])));
		expect(new Set(nodes.map((node) => node.key)).size).toBe(nodes.length);
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
			expect(
				header &&
					findNodes(header, (node) => node.kind === "template-part" && node.attributes.name === "item-header-border"),
			).toHaveLength(1);
		}
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
				if (declaration?.binding.type === "primitive") {
					expect(binding).toEqual(declaration.binding);
				} else {
					expect(binding).toMatchObject({
						type: "alias",
						canonicalKind: declaration?.binding.canonicalKind,
						token: declaration?.binding.token,
					});
					expect(binding?.type === "alias" && inventory.bindings[binding.canonicalNodeKey]).toMatchObject({
						type: "primitive",
						source: "existing",
					});
				}
			}
		},
	);
});
