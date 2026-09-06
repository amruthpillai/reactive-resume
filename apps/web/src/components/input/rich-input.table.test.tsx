// @vitest-environment happy-dom

import type { Editor, JSONContent } from "@tiptap/react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { useState } from "react";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { RichInput } from "./rich-input";

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

const inlineTable = `<table style="width: 300pt; border-collapse: collapse"><tbody><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Alpha</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Beta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Gamma</td></tr><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Delta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Epsilon</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Zeta</td></tr></tbody></table>`;

const complexTable = `<table style="width: 300pt; border-collapse: collapse"><tbody><tr><th colspan="2" rowspan="2" style="width: 200pt; border: 2pt dashed #123456; padding: 3pt"><p><strong>Lead</strong> cell</p><p><em>Second</em> paragraph</p></th><th style="width: 100pt">Side</th></tr><tr><td style="border-left: 1pt solid rgb(1, 2, 3)"><p>Tail</p></td></tr></tbody></table>`;

const semanticTable = `<table style="width: 300pt; border-spacing: 0"><tbody><tr style="height: 24pt"><td colspan="2" rowspan="1" colwidth="100,200" align="right" style="padding: 4pt; text-align: right"><p data-indent="2" style="margin-inline-start: 48px; text-align: justify"><a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow" class="link"><span style="color: #123456">Inside</span></a> <mark data-color="#ffff00" style="background-color: #ffff00; color: inherit">Mark</mark> <mark data-color="#000000" style="background-color: #000000; color: inherit; color: #ffffff">Dark</mark></p></td><td><ol start="2"><li style="text-align: center">Two</li></ol></td></tr></tbody></table>`;

const unsupportedTable = `<table border="1" style="width: 300pt"><tbody><tr><td>Original</td></tr></tbody></table>`;

const unsupportedTables = [
	["legacy table attributes", unsupportedTable],
	["truncated table marker", "<table"],
	["truncated table opening tag", '<table style="width: 100pt"'],
	["truncated table closing tag", "</table"],
	["unclosed table", "<table><tbody><tr><td>Open"],
	["truncated table after a complete table", "<table><tbody><tr><td>Complete</td></tr></tbody></table><table"],
	[
		"unrepresented descendant elements and attributes",
		`<table><tbody><tr><td><section aria-label="keep">Inside</section></td></tr></tbody></table>`,
	],
	[
		"multiple table bodies",
		"<table><tbody><tr><td>First</td></tr></tbody><tbody><tr><td>Second</td></tr></tbody></table>",
	],
	["browser-repaired malformed markup", "<table><tbody><tr><td>Broken</tr></tbody></table>"],
	[
		"unrepresented attributes on supported descendants",
		`<table><tbody><tr><td><p data-keep="yes">Inside</p></td></tr></tbody></table>`,
	],
	["invalid table styles", '<table style="width: banana"><tbody><tr><td>Inside</td></tr></tbody></table>'],
	["invalid row styles", '<table><tbody><tr style="height: banana"><td>Inside</td></tr></tbody></table>'],
	["invalid cell alignment", '<table><tbody><tr><td align="justify">Inside</td></tr></tbody></table>'],
	[
		"invalid cell style alignment",
		'<table><tbody><tr><td style="text-align: justify">Inside</td></tr></tbody></table>',
	],
	["invalid column widths", '<table><tbody><tr><td colwidth="100,bogus">Inside</td></tr></tbody></table>'],
	["mismatched column widths", '<table><tbody><tr><td colspan="2" colwidth="100">Inside</td></tr></tbody></table>'],
	["invalid column span", '<table><tbody><tr><td colspan="0">Inside</td></tr></tbody></table>'],
	["invalid row span", '<table><tbody><tr><td rowspan="-1">Inside</td></tr></tbody></table>'],
	[
		"invalid paragraph alignment",
		'<table><tbody><tr><td><p style="text-align: sideways">Inside</p></td></tr></tbody></table>',
	],
	["invalid indent level", '<table><tbody><tr><td><p data-indent="9">Inside</p></td></tr></tbody></table>'],
	[
		"mismatched indent margin",
		'<table><tbody><tr><td><p data-indent="2" style="margin-inline-start: 12px">Inside</p></td></tr></tbody></table>',
	],
	[
		"physical indent margin",
		'<table><tbody><tr><td><p data-indent="2" style="margin-left: 48px">Inside</p></td></tr></tbody></table>',
	],
	[
		"invalid ordered-list start",
		'<table><tbody><tr><td><ol start="first"><li>Inside</li></ol></td></tr></tbody></table>',
	],
	[
		"unsafe link URI",
		'<table><tbody><tr><td><p><a href="javascript:alert(1)">Inside</a></p></td></tr></tbody></table>',
	],
	[
		"unsafe link URI with ignored whitespace",
		'<table><tbody><tr><td><p><a href="java\u200Bscript:alert(1)">Inside</a></p></td></tr></tbody></table>',
	],
	[
		"invalid text color",
		'<table><tbody><tr><td><p><span style="color: nope">Inside</span></p></td></tr></tbody></table>',
	],
	[
		"invalid highlight color",
		'<table><tbody><tr><td><p><mark data-color="nope" style="background-color: nope; color: inherit">Inside</mark></p></td></tr></tbody></table>',
	],
	[
		"mismatched highlight color",
		'<table><tbody><tr><td><p><mark data-color="#ffff00" style="background-color: #000000; color: inherit">Inside</mark></p></td></tr></tbody></table>',
	],
] as const;

type InputOptions = {
	className?: string;
	editable?: boolean;
};

async function input(value: string, options: InputOptions = {}) {
	let editor: Editor | undefined;
	const onChange = vi.fn();
	const renderInput = (nextValue: string, nextOptions: InputOptions = options) => (
		<I18nProvider i18n={i18n}>
			<PromptDialogProvider>
				<RichInput
					aria-label="Table editor"
					value={nextValue}
					onChange={onChange}
					className={nextOptions.className}
					editable={nextOptions.editable}
					onCreate={(event) => {
						editor = event.editor;
					}}
				/>
			</PromptDialogProvider>
		</I18nProvider>
	);
	const result = render(renderInput(value));
	await waitFor(() => expect(editor).toBeDefined());
	if (!editor) throw new Error("Editor did not initialize");
	return {
		editor,
		onChange,
		rerender: (nextValue: string, nextOptions?: InputOptions) => result.rerender(renderInput(nextValue, nextOptions)),
	};
}

async function controlledInput(initialValue: string) {
	let editor: Editor | undefined;
	const onChange = vi.fn();

	function Harness() {
		const [value, setValue] = useState(initialValue);
		const [editable, setEditable] = useState(true);
		const [className, setClassName] = useState("initial");

		return (
			<I18nProvider i18n={i18n}>
				<PromptDialogProvider>
					<button type="button" onClick={() => setEditable((current) => !current)}>
						Toggle lock
					</button>
					<button type="button" onClick={() => setClassName("updated")}>
						Update prop
					</button>
					<output data-testid="stored-value">{value}</output>
					<RichInput
						aria-label="Table editor"
						value={value}
						onChange={(nextValue) => {
							onChange(nextValue);
							setValue(nextValue);
						}}
						className={className}
						editable={editable}
						onCreate={(event) => {
							editor = event.editor;
						}}
					/>
				</PromptDialogProvider>
			</I18nProvider>
		);
	}

	render(<Harness />);
	await waitFor(() => expect(editor).toBeDefined());
	if (!editor) throw new Error("Editor did not initialize");
	return { editor, onChange };
}

const jsonText = (node: JSONContent): string => {
	if ("text" in node) return node.text ?? "";
	return node.content?.map(jsonText).join("") ?? "";
};

const tableMatrix = (editor: Editor): string[][] => {
	const table = editor.getJSON().content?.find((node) => node.type === "table");
	if (!table || !("content" in table)) return [];
	return table.content?.map((row) => ("content" in row ? (row.content?.map(jsonText) ?? []) : [])) ?? [];
};

const textPosition = (editor: Editor, text: string): number => {
	let position: number | undefined;
	editor.state.doc.descendants((node, nodePosition) => {
		const offset = node.text?.indexOf(text) ?? -1;
		if (position === undefined && offset >= 0) position = nodePosition + offset;
	});
	if (position === undefined) throw new Error(`Missing text: ${text}`);
	return position;
};

describe("RichInput imported tables (#3196)", () => {
	it("parses a supported 2x3 table as structured JSON without emitting on mount", async () => {
		const { editor, onChange } = await input(inlineTable);

		expect(editor.getJSON().content?.[0]?.type).toBe("table");
		expect(tableMatrix(editor)).toEqual([
			["Alpha", "Beta", "Gamma"],
			["Delta", "Epsilon", "Zeta"],
		]);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("edits one named cell and retains structure through undo, redo, and remount", async () => {
		const { editor, onChange } = await input(inlineTable);
		act(() => {
			editor.commands.setTextSelection(textPosition(editor, "Beta") + "Beta".length);
			editor.commands.insertContent("!");
		});
		expect(tableMatrix(editor)).toEqual([
			["Alpha", "Beta!", "Gamma"],
			["Delta", "Epsilon", "Zeta"],
		]);
		const edited = editor.getHTML();
		expect(onChange).toHaveBeenLastCalledWith(edited);

		act(() => {
			editor.commands.undo();
		});
		expect(tableMatrix(editor)[0]).toEqual(["Alpha", "Beta", "Gamma"]);
		act(() => {
			editor.commands.redo();
			editor.commands.setContent(edited, { emitUpdate: false });
		});
		expect(tableMatrix(editor)).toEqual([
			["Alpha", "Beta!", "Gamma"],
			["Delta", "Epsilon", "Zeta"],
		]);
		expect(editor.getHTML()).toBe(edited);
	});

	it("retains spans, multiple paragraphs, inline marks, styles, and unrelated prop updates", async () => {
		const { editor, onChange, rerender } = await input(complexTable);
		const table = editor.getJSON().content?.[0];
		const firstRow = table && "content" in table ? table.content?.[0] : undefined;
		const lead = firstRow && "content" in firstRow ? firstRow.content?.[0] : undefined;
		expect(lead).toMatchObject({
			type: "tableHeader",
			attrs: {
				colspan: 2,
				rowspan: 2,
				style: "width: 200pt; border: 2pt dashed #123456; padding: 3pt",
			},
		});
		expect(lead && "content" in lead ? lead.content : undefined).toHaveLength(2);
		if (!lead || !("content" in lead)) throw new Error("Missing lead table cell content");
		const firstParagraph = lead.content?.[0];
		const secondParagraph = lead.content?.[1];
		expect(
			firstParagraph && "content" in firstParagraph ? firstParagraph.content?.[0]?.marks?.[0]?.type : undefined,
		).toBe("bold");
		expect(
			secondParagraph && "content" in secondParagraph ? secondParagraph.content?.[0]?.marks?.[0]?.type : undefined,
		).toBe("italic");

		rerender(complexTable, { className: "unrelated", editable: true });
		await waitFor(() => expect(editor.getJSON().content?.[0]?.type).toBe("table"));
		expect(editor.getHTML()).toContain('colspan="2"');
		expect(editor.getHTML()).toContain('rowspan="2"');
		expect(editor.getHTML()).toContain("border: 2pt dashed #123456");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("parses pasted supported table HTML into editable table nodes", async () => {
		const { editor } = await input("<p>Before</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML(inlineTable);
		});
		expect(tableMatrix(editor)).toEqual([
			["Alpha", "Beta", "Gamma"],
			["Delta", "Epsilon", "Zeta"],
		]);
	});

	it("keeps every supported table semantic editable", async () => {
		const { editor, onChange } = await input(semanticTable);
		expect(editor.isEditable).toBe(true);
		expect(screen.queryByText(/Original table formatting is preserved/)).not.toBeInTheDocument();
		act(() => {
			editor.commands.setTextSelection(textPosition(editor, "Inside") + "Inside".length);
			editor.commands.insertContent("!");
		});
		expect(editor.getHTML()).toContain("Inside!");
		expect(onChange).toHaveBeenCalledOnce();
	});

	it.each(unsupportedTables)("preserves exact bytes for %s behind an accessible read-only notice", async (_, value) => {
		const user = userEvent.setup();
		const { editor, onChange } = await controlledInput(value);
		const notice = screen.getByText(/Original table formatting is preserved/).closest('[role="status"]');
		if (!notice) throw new Error("Missing unsupported-table status notice");
		expect(notice).toHaveTextContent("Original table formatting is preserved");
		expect(screen.queryByRole("button", { name: "Convert to editable text" })).not.toBeInTheDocument();
		expect(editor.isEditable).toBe(false);
		expect(screen.getByTestId("stored-value")).toHaveTextContent(value, { normalizeWhitespace: false });

		await user.click(editor.view.dom);
		await user.keyboard("Changed");
		await user.click(screen.getByRole("button", { name: "Update prop" }));
		await user.click(screen.getByRole("button", { name: "Toggle lock" }));
		await user.click(screen.getByRole("button", { name: "Toggle lock" }));
		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByTestId("stored-value")).toHaveTextContent(value, { normalizeWhitespace: false });
	});

	it("keeps unsupported content read-only without a conversion path when caller marks editor as locked", async () => {
		const { editor } = await input(unsupportedTable, { editable: false });
		expect(editor.isEditable).toBe(false);
		expect(screen.queryByRole("button", { name: "Convert to editable text" })).not.toBeInTheDocument();
	});
});
