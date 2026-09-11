// @vitest-environment happy-dom

import type { Editor } from "@tiptap/react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { RichInput } from "./rich-input";

const preserve = 'data-resume-whitespace="preserve"';

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

function richInput(value: string, onChange: (value: string) => void, onCreate: (editor: Editor) => void) {
	return (
		<I18nProvider i18n={i18n}>
			<PromptDialogProvider>
				<RichInput value={value} onChange={onChange} onCreate={({ editor }) => onCreate(editor)} />
			</PromptDialogProvider>
		</I18nProvider>
	);
}

async function input(value: string) {
	let editor: Editor | undefined;
	const onChange = vi.fn();
	const rendered = render(richInput(value, onChange, (created) => (editor = created)));
	await waitFor(() => expect(editor).toBeDefined());
	if (!editor) throw new Error("Editor did not initialize");
	return { editor, onChange, rendered };
}

describe("RichInput literal whitespace (#3397)", () => {
	it.each(["p", "h2"])("round-trips exact marked %s whitespace", async (tag) => {
		const html = `<${tag} ${preserve}>  Lead  middle\tend  </${tag}>`;
		const { editor, onChange } = await input(html);

		expect(editor.getHTML()).toBe(html);
		expect(editor.getText()).toBe("  Lead  middle\tend  ");
		expect(onChange).not.toHaveBeenCalled();

		act(() => editor.commands.setContent(html, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(tag === "p" ? html : `${html}<p></p>`);
		expect(onChange).not.toHaveBeenCalled();
	});

	it("keeps marked whitespace through marks, line breaks, undo, redo, and remount", async () => {
		const original = `<p ${preserve}><strong>  Bold</strong> tail<br>  Second\t </p>`;
		const { editor, onChange, rendered } = await input(original);
		expect(editor.getHTML()).toBe(original);

		act(() => editor.view.dispatch(editor.state.tr.insertText("X", 3)));
		const edited = editor.getHTML();
		expect(edited).toContain(preserve);
		expect(editor.getText({ blockSeparator: "\n" })).toBe("  XBold tail\n  Second\t ");
		expect(editor.getAttributes("textStyle")).toBeDefined();

		act(() => editor.commands.undo());
		expect(editor.getHTML()).toBe(original);
		act(() => editor.commands.redo());
		expect(editor.getHTML()).toBe(edited);
		expect(onChange).toHaveBeenLastCalledWith(edited);

		rendered.unmount();
		const remounted = await input(edited);
		expect(remounted.editor.getHTML()).toBe(edited);
		expect(remounted.onChange).not.toHaveBeenCalled();
	});

	it("marks unmarked blocks only after text input and preserves the marker in history", async () => {
		const { editor, onChange } = await input("<p>First</p>");

		act(() => editor.view.dispatch(editor.state.tr.insertText("  \t", 1)));
		const saved = `<p ${preserve}>  \tFirst</p>`;
		expect(editor.getHTML()).toBe(saved);
		expect(onChange).toHaveBeenLastCalledWith(saved);

		act(() => editor.commands.undo());
		expect(editor.getHTML()).toBe("<p>First</p>");
		act(() => editor.commands.redo());
		expect(editor.getHTML()).toBe(saved);
	});

	it("marks pasted text without changing paste block or line-break semantics", async () => {
		const { editor } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML("<p>  Pasted\ttext<br>  next  </p>");
		});

		expect(editor.getHTML()).toBe(`<p ${preserve}>  Pasted\ttext<br>  next  </p>`);
		expect(editor.getText({ blockSeparator: "\n" })).toBe("  Pasted\ttext\n  next  ");
	});

	it("preserves exact plain-text paste codepoints across authored blocks", async () => {
		const { editor } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteText("  Plain\ttext  \n\tSecond  ");
		});

		expect(editor.getHTML()).toBe(`<p ${preserve}>  Plain\ttext  </p><p ${preserve}>\tSecond  </p>`);
		expect(editor.getText({ blockSeparator: "\n" })).toBe("  Plain\ttext  \n\tSecond  ");
	});

	it("marks blocks authored by Enter and keeps Shift+Enter as a line break", async () => {
		const { editor } = await input("<p>First</p>");
		act(() => {
			editor.commands.setTextSelection(3);
			editor.commands.enter();
		});
		expect(editor.getHTML()).toBe(`<p ${preserve}>Fi</p><p ${preserve}>rst</p>`);

		act(() => {
			editor.commands.setTextSelection(3);
			editor.commands.setHardBreak();
		});
		expect(editor.getHTML()).toBe(`<p ${preserve}>Fi<br></p><p ${preserve}>rst</p>`);
	});

	it("preserves marked whitespace through paragraph, heading, and list transitions", async () => {
		const html = `<p ${preserve}>  First\t </p>`;
		const { editor } = await input(html);

		act(() => editor.commands.toggleHeading({ level: 2 }));
		expect(editor.getHTML()).toBe(`<h2 ${preserve}>  First\t </h2><p></p>`);
		act(() => editor.commands.setParagraph());
		expect(editor.getHTML()).toBe(`${html}<p></p>`);
		act(() => editor.commands.toggleBulletList());
		expect(editor.getHTML()).toBe(`<ul><li><p ${preserve}>  First\t </p></li></ul><p></p>`);
		act(() => editor.commands.toggleBulletList());
		expect(editor.getHTML()).toBe(`${html}<p></p>`);
	});

	it.each(["bullet", "ordered"])("keeps heading whitespace through %s list conversion and reload", async (list) => {
		const { editor } = await input(`<h2 ${preserve}>  Literal\t </h2>`);
		const toggle = () => (list === "bullet" ? editor.commands.toggleBulletList() : editor.commands.toggleOrderedList());
		act(toggle);
		const saved = editor.getHTML();
		expect(saved).toContain(`<p ${preserve}>  Literal\t </p>`);
		act(() => editor.commands.setContent(saved, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(saved);
		act(() => {
			editor.commands.setTextSelection(5);
			toggle();
			editor.commands.toggleHeading({ level: 2 });
		});
		expect(editor.getHTML()).toContain(`<h2 ${preserve}>  Literal\t </h2>`);
	});

	it("keeps structural markers local to previously marked blocks, including undo and redo", async () => {
		const html = `<p ${preserve}>  First\t </p><p>Legacy</p>`;
		const { editor } = await input(html);
		act(() => {
			editor.commands.selectAll();
			editor.commands.toggleHeading({ level: 2 });
		});
		const saved = `<h2 ${preserve}>  First\t </h2><h2>Legacy</h2><p></p>`;
		expect(editor.getHTML()).toBe(saved);
		act(() => editor.commands.undo());
		expect(editor.getHTML()).toBe(html);
		act(() => editor.commands.redo());
		expect(editor.getHTML()).toBe(saved);
		act(() => editor.commands.setContent(saved, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(saved);
	});

	it("preserves both blocks through multi-block paragraph and heading conversions", async () => {
		const { editor } = await input(`<p ${preserve}>  First\t </p><p ${preserve}>  Second\t </p>`);
		act(() => {
			editor.commands.selectAll();
			editor.commands.toggleHeading({ level: 2 });
		});
		const headings = `<h2 ${preserve}>  First\t </h2><h2 ${preserve}>  Second\t </h2><p></p>`;
		expect(editor.getHTML()).toBe(headings);
		act(() => editor.commands.setContent(headings, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(headings);
		act(() => {
			editor.commands.selectAll();
			editor.commands.setParagraph();
		});
		const saved = editor.getHTML();
		expect(saved).toContain(`<p ${preserve}>  First\t </p><p ${preserve}>  Second\t </p>`);
		act(() => editor.commands.setContent(saved, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(saved);
	});

	it.each([
		['<p title="a > b">  Text\tX  </p>', `<p ${preserve}>  Text\tX  </p>`],
		["<p title='a < b > c'>  Text\tX  </p>", `<p ${preserve}>  Text\tX  </p>`],
		["<div>  Text\tX  </div>", `<p ${preserve}>  Text\tX  </p>`],
		['<meta charset="utf-8"><div>  Text\tX  </div>', `<p ${preserve}>  Text\tX  </p>`],
		["<!--StartFragment--><div>  Text\tX  </div><!--EndFragment-->", `<p ${preserve}>  Text\tX  </p>`],
		[
			"<div><div>  First\t </div><div>  Second\t </div></div>",
			`<p ${preserve}>  First\t </p><p ${preserve}>  Second\t </p>`,
		],
		["<ul><li>  Text\tX  </li></ul>", `<ul><li><p ${preserve}>  Text\tX  </p></li></ul><p></p>`],
		["<ol><li>  Text\tX  </li></ol>", `<ol><li><p ${preserve}>  Text\tX  </p></li></ol><p></p>`],
		["<blockquote>  Text\tX  </blockquote>", `<blockquote><p ${preserve}>  Text\tX  </p></blockquote><p></p>`],
		["<div>  First<br>  Second\t </div>", `<p ${preserve}>  First<br>  Second\t </p>`],
	])("preserves supported clipboard text and baseline blocks: %s", async (html, expected) => {
		const { editor } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML(html);
		});
		expect(editor.getHTML()).toBe(expected);
		act(() => editor.commands.setContent(expected, { emitUpdate: false }));
		expect(editor.getHTML()).toBe(expected);
	});

	it("preserves whitespace in pasted supported table paragraphs", async () => {
		const { editor } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML("<table><tbody><tr><td><p>  Cell\ttext  </p></td></tr></tbody></table>");
		});
		expect(editor.getHTML()).toContain(`<p ${preserve}>  Cell\ttext  </p>`);
	});

	it.each(["td", "th"])("preserves whitespace in pasted bare %s table cells", async (cellTag) => {
		const { editor } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML(`<table><tbody><tr><${cellTag}>  Cell\ttext  </${cellTag}></tr></tbody></table>`);
		});

		expect(editor.getHTML()).toContain(`<p ${preserve}>  Cell\ttext  </p>`);
		expect(editor.getText()).toContain("  Cell\ttext  ");
	});

	it.each([
		"<table><tr><td><p>  Cell\t </p></td></tr></table>",
		'<table border="1"><tbody><tr><td><p>  Cell\t </p></td></tr></tbody></table>',
	])("rejects unsafe table paste before DOM normalization: %s", async (html) => {
		const { editor, onChange } = await input("<p>Start</p>");
		act(() => {
			editor.commands.selectAll();
			editor.view.pasteHTML(html);
		});
		expect(editor.getHTML()).toBe("<p>Start</p>");
		expect(onChange).not.toHaveBeenCalled();
	});

	it("keeps marked paragraphs editable inside supported table cells", async () => {
		const html = `<table><tbody><tr><td colspan="1" rowspan="1"><p ${preserve}>  Cell\ttext  </p></td></tr></tbody></table><p></p>`;
		const { editor, onChange } = await input(html);

		expect(editor.isEditable).toBe(true);
		expect(editor.getHTML()).toBe(html);
		let cellTextPosition: number | undefined;
		editor.state.doc.descendants((node, position) => {
			if (cellTextPosition === undefined && node.isText && node.text?.includes("Cell")) cellTextPosition = position;
		});
		const insertionPosition = cellTextPosition;
		if (insertionPosition === undefined) throw new Error("Expected table-cell text position");
		act(() => editor.view.dispatch(editor.state.tr.insertText("X", insertionPosition + 2)));
		expect(editor.view.dom.querySelector("td")?.textContent).toBe("  XCell\ttext  ");
		expect(editor.getHTML()).toContain(preserve);
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("does not mark or save mount, unmarked legacy import, or controlled prop updates", async () => {
		let editor: Editor | undefined;
		const onChange = vi.fn();
		const rendered = render(richInput("<p>   Legacy\ttext</p>", onChange, (created) => (editor = created)));
		await waitFor(() => expect(editor).toBeDefined());
		if (!editor) throw new Error("Editor did not initialize");
		expect(editor.getHTML()).toBe("<p>Legacy text</p>");
		expect(onChange).not.toHaveBeenCalled();

		rendered.rerender(richInput("\n  <p>   Updated\tlegacy</p>\n", onChange, () => {}));
		await waitFor(() => expect(editor?.getHTML()).toBe("<p>Updated legacy</p>"));
		expect(editor.getHTML()).not.toContain("data-resume-whitespace");
		expect(onChange).not.toHaveBeenCalled();
	});

	it.each(["en", "he", "ar"])("preserves Unicode and marked codepoints in %s editor direction", async (locale) => {
		act(() => i18n.loadAndActivate({ locale, messages: {} }));
		try {
			const html = `<p ${preserve}>\u3000中\u00a0文  \t </p>`;
			const { editor } = await input(html);
			expect(editor.getHTML()).toBe(
				locale === "en"
					? `<p ${preserve}>\u3000中&nbsp;文  \t </p>`
					: `<p dir="rtl" ${preserve}>\u3000中&nbsp;文  \t </p>`,
			);
			expect(editor.getText()).toBe("\u3000中\u00a0文  \t ");
		} finally {
			act(() => i18n.loadAndActivate({ locale: "en", messages: {} }));
		}
	});
});
