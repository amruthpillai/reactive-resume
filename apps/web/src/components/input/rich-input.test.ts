// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { resolveHighlightToolbarState } from "./rich-input.utils";

describe("Tiptap editing", () => {
	it("creates a new paragraph when Enter is pressed", () => {
		const editor = new Editor({ extensions: [StarterKit], content: "<p>First</p>" });

		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		editor.commands.enter();

		expect(editor.getHTML()).toBe("<p>First</p><p></p>");
		editor.destroy();
	});

	it("creates and splits list items", () => {
		const editor = new Editor({ extensions: [StarterKit], content: "<p>First</p>" });

		editor.commands.setTextSelection(editor.state.doc.content.size - 1);
		editor.commands.toggleBulletList();
		editor.commands.enter();

		expect(editor.getHTML()).toBe("<ul><li><p>First</p></li><li><p></p></li></ul><p></p>");
		editor.destroy();
	});
});

describe("resolveHighlightToolbarState", () => {
	it("shows legacy colorless highlights as default yellow and clearable", () => {
		expect(resolveHighlightToolbarState(true, null)).toEqual({
			visibleHighlightColor: "rgba(255, 255, 0, 1)",
			canClearHighlight: true,
		});
	});

	it("does not show or clear a highlight when no highlight mark is active", () => {
		expect(resolveHighlightToolbarState(false, null)).toEqual({
			visibleHighlightColor: undefined,
			canClearHighlight: false,
		});
	});
});
