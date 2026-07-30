// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { formatEditorDocument, formatSemanticCss } from "./formatter";

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
});

describe("Semantic CSS formatter", () => {
	it("preserves comments and translates the cursor", async () => {
		const result = await formatSemanticCss("/* keep */ section{color:red}", 18);

		expect(result.formatted).toContain("/* keep */");
		expect(result.formatted).toContain("section {");
		expect(result.cursorOffset).toBeGreaterThan(0);
	});

	it("applies an explicit format as one editor transaction", async () => {
		const transactions = vi.fn();
		const view = new EditorView({
			state: EditorState.create({
				doc: "/* keep */ section{color:red}",
				selection: { anchor: 18 },
				extensions: EditorView.updateListener.of((update) => {
					if (update.docChanged) transactions(update.transactions);
				}),
			}),
		});
		views.push(view);

		await formatEditorDocument(view);

		expect(view.state.doc.toString()).toContain("section {");
		expect(transactions).toHaveBeenCalledOnce();
		expect(transactions.mock.calls[0]?.[0]).toHaveLength(1);
		expect(view.state.selection.main.head).toBeGreaterThan(0);
	});

	it("leaves malformed source untouched when formatting fails", async () => {
		const dispatch = vi.spyOn(EditorView.prototype, "dispatch");
		const view = new EditorView({ doc: "section {" });
		views.push(view);

		await expect(formatEditorDocument(view)).rejects.toThrow(/css|syntax|unexpected/i);
		expect(view.state.doc.toString()).toBe("section {");
		expect(dispatch).not.toHaveBeenCalled();
		dispatch.mockRestore();
	});
});
