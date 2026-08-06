import type { EditorView } from "@codemirror/view";
import { EditorSelection, Transaction } from "@codemirror/state";

export type FormattedSemanticCss = {
	formatted: string;
	cursorOffset: number;
};

export async function formatSemanticCss(source: string, cursorOffset: number): Promise<FormattedSemanticCss> {
	const [{ formatWithCursor }, { default: postcss }] = await Promise.all([
		import("prettier/standalone"),
		import("prettier/plugins/postcss"),
	]);
	return formatWithCursor(source, {
		parser: "css",
		plugins: [postcss],
		cursorOffset,
		useTabs: true,
		tabWidth: 4,
		printWidth: 120,
	});
}

export async function formatEditorDocument(view: EditorView): Promise<void> {
	const source = view.state.doc.toString();
	const result = await formatSemanticCss(source, view.state.selection.main.head);
	if (view.state.doc.toString() !== source) return;
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: result.formatted },
		selection: EditorSelection.cursor(Math.min(result.cursorOffset, result.formatted.length)),
		annotations: Transaction.userEvent.of("input.format"),
	});
}
