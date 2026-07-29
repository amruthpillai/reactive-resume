// @vitest-environment happy-dom

import type { RrssDiagnostic, SemanticNode } from "@reactive-resume/resume/stylesheet";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { compileStylesheet } from "@reactive-resume/resume/stylesheet";
import { collectCompiledColorTokens } from "./color-tokens";
import {
	compositionAwareDocumentListener,
	copySourceToClipboard,
	createRrssEditorExtensions,
	getRrssCompletionLabels,
	getRrssHoverDocumentation,
	mapCompilerDiagnostics,
} from "./editor-extensions";

const semanticTree: SemanticNode = {
	key: "resume",
	kind: "resume",
	attributes: { template: "onyx" },
	roles: [],
	children: [
		{
			key: "section",
			kind: "section",
			id: "section-experience",
			attributes: { type: "experience", placement: "main" },
			roles: [],
			children: [
				{
					key: "item",
					kind: "item",
					id: "item-current",
					attributes: {},
					roles: [],
					children: [
						{
							key: "field",
							kind: "field",
							attributes: { name: "company" },
							roles: ["primary-text"],
							children: [],
						},
					],
				},
			],
		},
	],
};

const metadata = {
	semanticTree,
	templateParts: ["timeline-line", "timeline-marker"],
} as const;
const borderShorthands = ["border", "border-top", "border-right", "border-bottom", "border-left"] as const;

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
});

describe("RRSS editor extensions", () => {
	it("uses only RRSS registries and the current resume for completion", async () => {
		const selectorLabels = await getRrssCompletionLabels("", 0, metadata);
		const propertyLabels = await getRrssCompletionLabels("section {\n\tco", 13, metadata);
		const variableSource = "resume { --brand-accent: #f00; color: var(--br";
		const variableLabels = await getRrssCompletionLabels(variableSource, variableSource.length, metadata);
		const systemLabels = await getRrssCompletionLabels("--rr-", 5, metadata);
		const directiveLabels = await getRrssCompletionLabels("@", 1, metadata);

		expect(selectorLabels).toEqual(
			expect.arrayContaining([
				"section",
				"#section-experience",
				"#item-current",
				'[name="company"]',
				'[role~="primary-text"]',
				'template-part[name="timeline-marker"]',
			]),
		);
		expect(propertyLabels).toContain("color");
		expect(propertyLabels).toContain("-rr-fixed");
		expect(propertyLabels).not.toContain("cursor");
		expect(propertyLabels).not.toContain("font-family");
		expect(variableLabels).toEqual(expect.arrayContaining(["--brand-accent", "--rr-primary-color"]));
		expect(systemLabels).toEqual(expect.arrayContaining(["--rr-primary-color", "--rr-sidebar-width"]));
		expect(systemLabels).not.toContain("--rr-font-family");
		expect(directiveLabels).toEqual(expect.arrayContaining(["@media", "@rr-version 1;"]));
	});

	it("offers only the current property's registered compiler vocabulary", () => {
		const displaySource = "section { display: f";
		const borderStyleSource = "section { border-style: d";
		const fontSizeSource = "section { font-size: 1";

		const displayLabels = getRrssCompletionLabels(displaySource, displaySource.length, metadata);
		const borderStyleLabels = getRrssCompletionLabels(borderStyleSource, borderStyleSource.length, metadata);
		const fontSizeLabels = getRrssCompletionLabels(fontSizeSource, fontSizeSource.length, metadata);

		expect(displayLabels).toEqual(expect.arrayContaining(["flex", "none", "inherit"]));
		expect(displayLabels).not.toEqual(expect.arrayContaining(["portrait", "dashed", "pt"]));
		expect(borderStyleLabels).toEqual(expect.arrayContaining(["dashed", "dotted", "solid"]));
		expect(borderStyleLabels).not.toContain("double");
		expect(fontSizeLabels).toEqual(expect.arrayContaining(["pt", "rem"]));
		expect(fontSizeLabels).not.toEqual(expect.arrayContaining(["none", "normal", "max-content"]));
	});

	it.each(borderShorthands)("offers complete %s shorthand values instead of bare units", (property) => {
		const source = `section { ${property}: `;
		const labels = getRrssCompletionLabels(source, source.length, metadata);

		expect(labels).toEqual(expect.arrayContaining(["1pt dotted", "1pt dashed", "1pt solid"]));
		expect(labels).not.toEqual(expect.arrayContaining(["pt", "px", "in", "mm", "cm", "%", "vw", "vh", "em", "rem"]));
	});

	it("escapes dynamic IDs and attribute values before inserting selectors", () => {
		const unsafeMetadata = {
			semanticTree: {
				...semanticTree,
				children: [
					{
						key: "unsafe",
						kind: "field",
						id: "123 current#item",
						attributes: { name: 'company"lead\n' },
						roles: [],
						children: [],
					},
				],
			},
			templateParts: ['timeline"marker\n'],
		} as const;

		const labels = getRrssCompletionLabels("", 0, unsafeMetadata);

		expect(labels).toEqual(
			expect.arrayContaining([
				"#\\31 23\\ current\\#item",
				'[name="company\\"lead\\a "]',
				'template-part[name="timeline\\"marker\\a "]',
			]),
		);
		expect(labels).not.toContain("#123 current#item");
		expect(labels).not.toContain('[name="company"lead\n"]');
	});

	it("builds hover text from the same registries", () => {
		expect(getRrssHoverDocumentation("section", metadata)).toMatch(/semantic element.*placement.*featured-summary/i);
		expect(getRrssHoverDocumentation("color", metadata)).toMatch(/property.*inherited.*field/i);
		expect(getRrssHoverDocumentation("--rr-primary-color", metadata)).toMatch(/read-only.*builder primary color/i);
		expect(getRrssHoverDocumentation("#section-experience", metadata)).toMatch(/current resume.*section/i);
		expect(getRrssHoverDocumentation('template-part[name="timeline-line"]', metadata)).toMatch(
			/current template part/i,
		);
	});

	it("maps compiler offsets and only decorates compiler-confirmed color values", () => {
		const source = "@rr-version 1;\nsection { color: #ff0000; background-color: rgb(0 0 0); }\n";
		const compiled = compileStylesheet({ languageVersion: 1, text: source });
		expect(compiled.program).not.toBeNull();
		const tokens = collectCompiledColorTokens(source, compiled.program);
		expect(tokens).toEqual([
			{ from: source.indexOf("#ff0000"), to: source.indexOf("#ff0000") + 7, value: "#ff0000" },
			{
				from: source.indexOf("rgb(0 0 0)"),
				to: source.indexOf("rgb(0 0 0)") + "rgb(0 0 0)".length,
				value: "rgb(0 0 0)",
			},
		]);

		const diagnostic: RrssDiagnostic = {
			code: "INVALID_VALUE",
			severity: "error",
			message: "Bad value",
			range: {
				start: { line: 1, column: 1, offset: 2 },
				end: { line: 1, column: 30, offset: 99 },
			},
		};
		expect(mapCompilerDiagnostics(10, [diagnostic])).toEqual([
			expect.objectContaining({ from: 2, to: 10, severity: "error", message: "Bad value" }),
		]);

		const selected = vi.fn();
		const view = new EditorView({
			doc: source,
			extensions: createRrssEditorExtensions({
				metadata,
				diagnostics: [],
				colorTokens: tokens,
				onColorSelect: selected,
			}),
		});
		views.push(view);
		const swatches = view.dom.querySelectorAll<HTMLButtonElement>(".rrss-color-swatch");
		expect(swatches).toHaveLength(2);
		swatches[0]?.click();
		expect(selected).toHaveBeenCalledWith(tokens[0], expect.any(DOMRect));
	});

	it("preserves exact clipboard text and emits one change for an IME composition", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
		const source = "@rr-version 1;\n/*  exact spacing  */\n";
		await copySourceToClipboard(source);
		expect(writeText).toHaveBeenCalledWith(source);

		const onChange = vi.fn();
		const view = new EditorView({
			doc: "",
			extensions: compositionAwareDocumentListener(onChange),
		});
		views.push(view);
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" }));
		view.dispatch({
			changes: { from: 0, insert: "セク" },
			annotations: Transaction.userEvent.of("input.type.compose"),
		});
		view.dispatch({
			changes: { from: 0, to: 2, insert: "セクション" },
			annotations: Transaction.userEvent.of("input.type.compose"),
		});
		view.contentDOM.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "セクション" }));
		await Promise.resolve();

		expect(view.state.doc.toString()).toBe("セクション");
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange).toHaveBeenCalledWith("セクション");
	});

	it("opens the built-in search and replace panel", () => {
		const view = new EditorView({
			doc: "section { color: red; }",
			extensions: createRrssEditorExtensions({
				metadata,
				diagnostics: [],
				colorTokens: [],
				onColorSelect: vi.fn(),
			}),
		});
		views.push(view);
		view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "f" }));

		expect(view.dom.querySelector("[name=search]")).not.toBeNull();
		expect(view.dom.querySelector("[name=replace]")).not.toBeNull();
	});
});
