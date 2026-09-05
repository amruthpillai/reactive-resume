// @vitest-environment happy-dom

import type { Editor } from "@tiptap/react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { PromptDialogProvider } from "@/hooks/use-prompt";
import { RichInput } from "./rich-input";

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

async function input(value: string) {
	let editor: Editor | undefined;
	const onChange = vi.fn();
	render(
		<I18nProvider i18n={i18n}>
			<PromptDialogProvider>
				<RichInput
					value={value}
					onChange={onChange}
					onCreate={(event) => {
						editor = event.editor;
					}}
				/>
			</PromptDialogProvider>
		</I18nProvider>,
	);
	await waitFor(() => expect(editor).toBeDefined());
	if (!editor) throw new Error("Editor did not initialize");
	return { editor, onChange };
}

const increase = () => fireEvent.click(screen.getByTitle("Increase indent"));
const decrease = () => fireEvent.click(screen.getByTitle("Decrease indent"));
const levels = (editor: Editor) => editor.getJSON().content?.map((node) => node.attrs?.indent ?? 0);

describe("RichInput paragraph indentation (#3397)", () => {
	it("indents the entire paragraph and emits round-trippable HTML", async () => {
		const { editor, onChange } = await input("<p>First</p>");
		expect(screen.getByTitle("Decrease indent")).toBeDisabled();
		expect(screen.getByTitle("Increase indent")).toBeEnabled();
		increase();
		const html = '<p data-indent="1" style="margin-inline-start: 24px;">First</p>';
		expect(editor.getHTML()).toBe(html);
		expect(onChange).toHaveBeenLastCalledWith(html);
		act(() => {
			editor.commands.setContent(html, { emitUpdate: false });
		});
		expect(editor.getHTML()).toBe(html);
		decrease();
		expect(editor.getHTML()).toBe("<p>First</p>");
	});

	it.each(["p", "h1", "h2", "h3", "h4", "h5", "h6"])("restores saved %s indentation on initialization", async (tag) => {
		const html = `<${tag} data-indent="2" style="margin-inline-start: 48px;">First</${tag}><p>Last</p>`;
		const { editor } = await input(html);
		expect(editor.getHTML()).toBe(html);
	});

	it("updates mixed levels in one transaction and supports undo/redo", async () => {
		const { editor, onChange } = await input('<p>First</p><h2 data-indent="3">Second</h2><p data-indent="8">Third</p>');
		act(() => {
			editor.commands.selectAll();
		});
		increase();
		expect(levels(editor)).toEqual([1, 4, 8]);
		expect(onChange).toHaveBeenCalledTimes(1);
		act(() => {
			editor.commands.undo();
		});
		expect(levels(editor)).toEqual([0, 3, 8]);
		act(() => {
			editor.commands.redo();
		});
		expect(levels(editor)).toEqual([1, 4, 8]);
		decrease();
		expect(levels(editor)).toEqual([0, 3, 7]);
	});

	it("preserves each level through paragraph/heading conversions", async () => {
		const { editor } = await input('<p data-indent="1">First</p><p data-indent="3">Second</p>');
		act(() => {
			editor.commands.selectAll();
			editor.commands.toggleHeading({ level: 2 });
		});
		expect(levels(editor).slice(0, 2)).toEqual([1, 3]);
		act(() => {
			editor.commands.setParagraph();
		});
		expect(levels(editor).slice(0, 2)).toEqual([1, 3]);
	});

	it("disables indent at eight without an update", async () => {
		const { editor, onChange } = await input('<p data-indent="8">First</p>');
		expect(screen.getByTitle("Increase indent")).toBeDisabled();
		increase();
		expect(levels(editor)).toEqual([8]);
		expect(onChange).not.toHaveBeenCalled();
	});

	it.each(["ul", "ol"])("keeps %s controls as list nesting operations", async (tag) => {
		const { editor } = await input(`<${tag}><li><p>First</p></li><li><p>Second</p></li></${tag}><p>Last</p>`);
		act(() => {
			editor.commands.setTextSelection(12);
		});
		increase();
		expect(editor.getHTML()).toContain(`<${tag}><li><p>Second</p></li></${tag}>`);
		expect(editor.getHTML()).not.toContain("data-indent");
		decrease();
		expect(editor.getHTML()).toBe(`<${tag}><li><p>First</p></li><li><p>Second</p></li></${tag}><p>Last</p>`);
	});

	it.each(["toggleBulletList", "toggleOrderedList"] as const)(
		"normalizes indentation when converting to a list with %s",
		async (command) => {
			const { editor } = await input('<p data-indent="2">First</p>');
			act(() => {
				editor.commands[command]();
			});
			expect(editor.getHTML()).not.toContain("data-indent");
			act(() => {
				editor.commands.undo();
			});
			expect(levels(editor)[0]).toBe(2);
			act(() => {
				editor.commands.redo();
				editor.commands[command]();
			});
			expect(editor.getHTML()).not.toContain("data-indent");
			expect(editor.getHTML()).not.toContain("<li>");
		},
	);

	it("clears paragraph offsets when typing the bullet-list shortcut", async () => {
		const { editor } = await input('<p data-indent="2">First</p>');
		act(() => {
			editor.commands.setTextSelection(1);
			editor.view.someProp("handleTextInput", (handle) =>
				handle(editor.view, 1, 1, "- ", () => editor.state.tr.insertText("- ", 1)),
			);
		});
		expect(editor.getHTML()).toContain("<ul><li><p>First</p></li></ul>");
		expect(editor.getHTML()).not.toContain("data-indent");
	});

	it("clears imported paragraph offsets inside lists", async () => {
		const { editor } = await input('<ul><li><p data-indent="2" style="margin-inline-start: 48px">First</p></li></ul>');
		expect(editor.getHTML()).not.toContain("data-indent");
		expect(editor.getHTML()).not.toContain("margin-inline-start");
	});

	it("honors explicit indentation when changing a block type", async () => {
		const { editor } = await input('<p data-indent="2">First</p>');
		act(() => {
			editor.commands.setNode("heading", { level: 2, indent: 0 });
		});
		expect(editor.getHTML()).toContain("<h2>First</h2>");
	});

	it("characterizes literal leading spaces and tabs in saved HTML", async () => {
		const { editor } = await input("<p>   First</p><p>\tSecond</p>");
		expect(editor.getHTML()).toBe("<p>First</p><p>Second</p>");
	});

	it("does not mutate during capability checks or beyond either bound", async () => {
		const { editor, onChange } = await input("<p>First</p>");
		expect(editor.can().increaseIndent()).toBe(true);
		expect(editor.can().decreaseIndent()).toBe(false);
		act(() => {
			expect(editor.commands.decreaseIndent()).toBe(false);
		});
		expect(onChange).not.toHaveBeenCalled();
		act(() => {
			for (let step = 0; step < 8; step++) editor.commands.increaseIndent();
		});
		expect(levels(editor)).toEqual([8]);
		expect(editor.can().increaseIndent()).toBe(false);
		act(() => {
			expect(editor.commands.increaseIndent()).toBe(false);
		});
		expect(onChange).toHaveBeenCalledTimes(8);
	});

	it("skips list descendants when a selection starts outside the list", async () => {
		const { editor } = await input("<p>First</p><ul><li><p>Second</p></li></ul><p>Third</p>");
		act(() => {
			editor.commands.selectAll();
		});
		increase();
		expect(editor.getHTML()).toBe(
			'<p data-indent="1" style="margin-inline-start: 24px;">First</p><ul><li><p>Second</p></li></ul><p data-indent="1" style="margin-inline-start: 24px;">Third</p>',
		);
	});

	it("renders logical margins in RTL without physical left/right margins", async () => {
		i18n.loadAndActivate({ locale: "he", messages: {} });
		try {
			const { editor } = await input('<p data-indent="1">First</p>');
			const paragraph = editor.view.dom.querySelector("p");
			expect(paragraph?.style.marginInlineStart).toBe("24px");
			expect(paragraph?.style.marginLeft).toBe("");
			expect(paragraph?.style.marginRight).toBe("");
		} finally {
			act(() => {
				i18n.loadAndActivate({ locale: "en", messages: {} });
			});
		}
	});

	it("characterizes typed leading whitespace as lost on HTML re-import", async () => {
		const { editor, onChange } = await input("<p>First</p>");
		act(() => {
			editor.view.dispatch(editor.state.tr.insertText("   \t", 1));
		});
		const saved = editor.getHTML();
		expect(saved).toBe("<p>   \tFirst</p>");
		expect(onChange).toHaveBeenLastCalledWith(saved);
		act(() => {
			editor.commands.setContent(saved, { emitUpdate: false });
		});
		expect(editor.getHTML()).toBe("<p>First</p>");
	});
});
