// @vitest-environment happy-dom

import type { Editor, JSONContent } from "@tiptap/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { RichInput } from "./rich-input";

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

const inlineTable = `<table style="width: 300pt; border-collapse: collapse"><tbody><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Alpha</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Beta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Gamma</td></tr><tr><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Delta</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Epsilon</td><td style="width: 100pt; padding: 4pt; border: 1pt solid #cc00cc">Zeta</td></tr></tbody></table>`;

const complexTable = `<table style="width: 300pt; border-collapse: collapse"><tbody><tr><th colspan="2" rowspan="2" style="width: 200pt; border: 2pt dashed #123456; padding: 3pt"><p><strong>Lead</strong> cell</p><p><em>Second</em> paragraph</p></th><th style="width: 100pt">Side</th></tr><tr><td style="border-left: 1pt solid rgb(1, 2, 3)"><p>Tail</p></td></tr></tbody></table>`;

const unsupportedTable = `<table border="1" style="width: 300pt"><tbody><tr><td>Original</td></tr></tbody></table>`;

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

	it("preserves unsupported table HTML behind an accessible read-only notice", async () => {
		const user = userEvent.setup();
		const { editor, onChange } = await input(unsupportedTable);
		const notice = screen.getByRole("status");
		expect(notice).toHaveTextContent("Original table formatting is preserved");
		expect(screen.getByRole("button", { name: "Convert to editable text" })).toBeVisible();
		expect(editor.isEditable).toBe(false);

		await user.click(editor.view.dom);
		await user.keyboard("Changed");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("cancels conversion without overwriting unsupported HTML and can reopen the decision", async () => {
		const { onChange } = await input(unsupportedTable);
		fireEvent.click(screen.getByRole("button", { name: "Convert to editable text" }));
		expect(screen.getByRole("alertdialog", { name: "Convert table to editable text?" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onChange).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Convert to editable text" }));
		expect(screen.getByRole("alertdialog", { name: "Convert table to editable text?" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onChange).not.toHaveBeenCalled();
	});

	it("keeps conversion disabled when caller marks editor as locked", async () => {
		const { editor } = await input(unsupportedTable, { editable: false });
		expect(editor.isEditable).toBe(false);
		expect(screen.getByRole("button", { name: "Convert to editable text" })).toBeDisabled();
	});
});
