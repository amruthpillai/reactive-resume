import type { Command } from "@tiptap/react";
import { Plugin } from "@tiptap/pm/state";
import { commands, Extension } from "@tiptap/react";

// Persist integer levels, not physical CSS margins. Export adapters share this HTML contract.
const readIndent = (value: unknown): number => {
	const level = Number(value);
	return Number.isInteger(level) && level >= 0 && level <= 8 ? level : 0;
};

const changeIndent =
	(step: -1 | 1): Command =>
	({ state, tr, dispatch, commands }) => {
		const { from, to, $from } = tr.selection;
		for (let depth = $from.depth; depth > 0; depth--) {
			if ($from.node(depth).type.name === "listItem") {
				return step === 1 ? commands.sinkListItem("listItem") : commands.liftListItem("listItem");
			}
		}

		let changed = false;
		state.doc.nodesBetween(from, to, (node, pos) => {
			if (node.type.name === "listItem") return false;
			if (node.type.name !== "paragraph" && node.type.name !== "heading") return;
			const indent = Math.max(0, Math.min(8, readIndent(node.attrs.indent) + step));
			if (indent === readIndent(node.attrs.indent)) return;
			changed = true;
			if (dispatch) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent });
		});
		return changed;
	};

declare module "@tiptap/react" {
	interface Commands<ReturnType> {
		paragraphIndent: {
			increaseIndent: () => ReturnType;
			decreaseIndent: () => ReturnType;
		};
	}
}

export const ParagraphIndent = Extension.create({
	name: "paragraphIndent",
	addGlobalAttributes() {
		return [
			{
				types: ["paragraph", "heading"],
				attributes: {
					indent: {
						default: 0,
						parseHTML: (element) => (element.closest("li") ? 0 : readIndent(element.getAttribute("data-indent"))),
						renderHTML: (attributes) => {
							const indent = readIndent(attributes.indent);
							return indent ? { "data-indent": indent, style: `margin-inline-start: ${indent * 24}px` } : {};
						},
					},
				},
			},
		];
	},
	addProseMirrorPlugins() {
		return [
			new Plugin({
				appendTransaction: (transactions, _oldState, state) => {
					if (!transactions.some((transaction) => transaction.docChanged)) return null;
					const tr = state.tr;
					// Lists own their indentation, including conversions triggered by input
					// rules. Appending keeps normalization in the same undoable change.
					state.doc.descendants((node, pos) => {
						if (node.type.name !== "listItem") return;
						node.descendants((child, offset) => {
							if ((child.type.name === "paragraph" || child.type.name === "heading") && child.attrs.indent) {
								tr.setNodeMarkup(pos + 1 + offset, undefined, { ...child.attrs, indent: 0 });
							}
						});
						return false;
					});
					return tr.docChanged ? tr : null;
				},
			}),
		];
	},
	addCommands() {
		return {
			increaseIndent: () => changeIndent(1),
			decreaseIndent: () => changeIndent(-1),
			// Tiptap only copies source attributes for selections inside one block.
			// Keep each block's level when a multi-block heading/paragraph conversion runs.
			setNode: (type, attributes) => (props) => {
				const name = typeof type === "string" ? type : type.name;
				if ((name !== "paragraph" && name !== "heading") || attributes?.indent !== undefined) {
					return commands.setNode(type, attributes)(props);
				}
				const { tr, dispatch } = props;
				const mapStart = tr.mapping.maps.length;
				const levels: { pos: number; indent: number }[] = [];
				tr.doc.nodesBetween(tr.selection.from, tr.selection.to, (node, pos) => {
					if (node.type.name === "paragraph" || node.type.name === "heading") {
						levels.push({ pos, indent: readIndent(node.attrs.indent) });
					}
				});
				const result = commands.setNode(type, attributes)(props);
				if (result && dispatch) {
					for (const { pos, indent } of levels) {
						const mapped = tr.mapping.slice(mapStart).map(pos);
						const node = tr.doc.nodeAt(mapped);
						if (node?.type.name === name && node.attrs.indent !== indent) {
							tr.setNodeMarkup(mapped, undefined, { ...node.attrs, indent });
						}
					}
				}
				return result;
			},
		};
	},
});
