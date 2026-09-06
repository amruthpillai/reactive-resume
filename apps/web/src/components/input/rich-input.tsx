import type { Editor, UseEditorOptions } from "@tiptap/react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	ArrowsInSimpleIcon,
	ArrowsOutSimpleIcon,
	CodeSimpleIcon,
	HighlighterCircleIcon,
	KeyReturnIcon,
	LinkBreakIcon,
	LinkIcon,
	ListBulletsIcon,
	ListNumbersIcon,
	MinusIcon,
	ParagraphIcon,
	TextAlignCenterIcon,
	TextAlignJustifyIcon,
	TextAlignLeftIcon,
	TextAlignRightIcon,
	TextBolderIcon,
	TextHFiveIcon,
	TextHFourIcon,
	TextHOneIcon,
	TextHSixIcon,
	TextHThreeIcon,
	TextHTwoIcon,
	TextIndentIcon,
	TextItalicIcon,
	TextOutdentIcon,
	TextStrikethroughIcon,
	TextUnderlineIcon,
} from "@phosphor-icons/react";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, EditorContext, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useMemo, useState } from "react";
import { match } from "ts-pattern";
import z from "zod";
import { Button } from "@reactive-resume/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@reactive-resume/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@reactive-resume/ui/components/dropdown-menu";
import { PopoverHeader, PopoverTitle, PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { toast } from "@reactive-resume/ui/components/toast";
import { Toggle } from "@reactive-resume/ui/components/toggle";
import { isDarkColor } from "@reactive-resume/utils/color";
import { cn } from "@reactive-resume/utils/style";
import { usePrompt } from "@/hooks/use-prompt";
import { isRTL } from "@/libs/locale";
import { ColorPicker } from "./color-picker";
import { ParagraphIndent } from "./paragraph-indent";
import { defaultHighlightColor, resolveHighlightToolbarState } from "./rich-input.utils";
import {
	LiteralHeading,
	LiteralParagraph,
	LiteralWhitespaceInput,
	whitespaceAttribute,
	whitespacePreserveValue,
} from "./rich-input-whitespace";

const defaultTextColor = "rgba(0, 0, 0, 1)";

const borderStyleProperties = [
	"border",
	"border-top",
	"border-right",
	"border-bottom",
	"border-left",
	"border-width",
	"border-style",
	"border-color",
	"border-top-width",
	"border-top-style",
	"border-top-color",
	"border-right-width",
	"border-right-style",
	"border-right-color",
	"border-bottom-width",
	"border-bottom-style",
	"border-bottom-color",
	"border-left-width",
	"border-left-style",
	"border-left-color",
] as const;

const textBlockTags = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6"]);
const inlineTags = new Set(["br", "strong", "b", "em", "i", "u", "s", "strike", "code", "a", "span", "mark"]);
const cellBlockTags = new Set([...textBlockTags, "blockquote", "ul", "ol", "hr"]);

type ValueValidator = (value: string, element: Element) => boolean;

type ElementRule = {
	attributes?: ReadonlyMap<string, ValueValidator>;
	styles?: ReadonlyMap<string, ValueValidator>;
	validate?: (element: Element) => boolean;
};

type StyleDeclaration = {
	property: string;
	value: string;
};

const cssWideKeywords = new Set(["inherit", "initial", "revert", "revert-layer", "unset"]);
const textAlignments = new Set(["left", "center", "right", "justify"]);
const cellAlignments = new Set(["left", "center", "right"]);
const linkProtocols = new Set(["http", "https", "ftp", "ftps", "mailto", "tel", "callto", "sms", "cid", "xmpp"]);

const readStyleDeclarations = (element: Element): StyleDeclaration[] | null => {
	const style = element.getAttribute("style");
	if (style === null) return [];
	const declarations = style
		.split(";")
		.map((declaration) => declaration.trim())
		.filter(Boolean);
	if (declarations.length === 0) return null;
	const parsed = declarations.map((declaration) => {
		const separator = declaration.indexOf(":");
		if (separator <= 0) return null;
		const property = declaration.slice(0, separator).trim().toLowerCase();
		const value = declaration.slice(separator + 1).trim();
		return property && value ? { property, value } : null;
	});
	return parsed.every((declaration) => declaration !== null) ? parsed : null;
};

const supportsCssValue =
	(property: string): ValueValidator =>
	(value, element) => {
		if (/!important\s*$/i.test(value)) return false;
		const probe = element.ownerDocument.createElement("span").style;
		probe.setProperty(property, value);
		return probe.getPropertyValue(property) !== "";
	};

const supportsColor: ValueValidator = (value, element) => supportsCssValue("color")(value, element);
const supportsTextAlign =
	(allowed: ReadonlySet<string>): ValueValidator =>
	(value) =>
		allowed.has(value);
const supportsCanonicalInteger =
	(minimum: number, maximum = Number.MAX_SAFE_INTEGER): ValueValidator =>
	(value) => {
		if (!/^-?\d+$/.test(value)) return false;
		const parsed = Number(value);
		return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum && String(parsed) === value;
	};
const supportsBorderSpacing: ValueValidator = (value, element) => {
	if (cssWideKeywords.has(value)) return true;
	const parts = value.split(/\s+/);
	return parts.length <= 2 && parts.every((part) => supportsCssValue("width")(part, element));
};
const supportsVerticalAlign: ValueValidator = (value, element) => {
	const keywords = new Set(["baseline", "sub", "super", "text-top", "text-bottom", "middle", "top", "bottom"]);
	return cssWideKeywords.has(value) || keywords.has(value) || supportsCssValue("width")(value, element);
};
const supportsLinkHref: ValueValidator = (value) => {
	if (
		!value ||
		value.trim() !== value ||
		/[\s\u200B-\u200D\u2060\uFEFF]/u.test(value) ||
		Array.from(value).some((character) => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)
	)
		return false;
	const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
	return !scheme || linkProtocols.has(scheme);
};

const cssRules = (properties: readonly string[]) =>
	new Map<string, ValueValidator>(properties.map((property) => [property, supportsCssValue(property)]));

const styleValues = (element: Element, property: string) =>
	(readStyleDeclarations(element) ?? [])
		.filter((declaration) => declaration.property === property)
		.map(({ value }) => value);

const normalizedColor = (value: string, element: Element) => {
	const probe = element.ownerDocument.createElement("span").style;
	probe.color = value;
	return probe.color;
};

const validateCell = (element: Element) => {
	const colspan = element.getAttribute("colspan");
	const colwidth = element.getAttribute("colwidth");
	if (colwidth) {
		const widths = colwidth.split(",");
		const span = colspan ? Number(colspan) : 1;
		if (widths.length !== span || !widths.every((width) => supportsCanonicalInteger(1)(width, element))) return false;
	}
	const align = element.getAttribute("align")?.trim().toLowerCase();
	const styleAligns = styleValues(element, "text-align");
	return styleAligns.length <= 1 && (!align || styleAligns.length === 0 || align === styleAligns[0]);
};

const validateTextBlock = (element: Element) => {
	const indent = element.getAttribute("data-indent");
	const margins = styleValues(element, "margin-inline-start");
	const alignments = styleValues(element, "text-align");
	if (margins.length > 1 || alignments.length > 1) return false;
	if (!indent) return margins.length === 0;
	if (element.closest("li") || !supportsCanonicalInteger(1, 8)(indent, element)) return false;
	return margins.length === 0 || margins[0] === `${Number(indent) * 24}px`;
};

const validateMark = (element: Element) => {
	const dataColor = element.getAttribute("data-color");
	const backgrounds = styleValues(element, "background-color");
	const colors = styleValues(element, "color");
	if (backgrounds.length > 1 || colors.length > 2) return false;
	const semanticColor = dataColor ?? backgrounds[0];
	if (!semanticColor) return colors.length === 0;
	if (dataColor && backgrounds[0] && normalizedColor(dataColor, element) !== normalizedColor(backgrounds[0], element))
		return false;
	if (colors.length === 0) return true;
	return isDarkColor(semanticColor)
		? colors.length === 2 && colors[0] === "inherit" && normalizedColor(colors[1] ?? "", element) === "#ffffff"
		: colors.length === 1 && colors[0] === "inherit";
};

const tableStyles = new Map([
	...cssRules(["width", "min-width", "max-width", "border-collapse", ...borderStyleProperties]),
	["border-spacing", supportsBorderSpacing],
]);
const rowStyles = cssRules(["height", ...borderStyleProperties]);
const cellStyles = new Map([
	...cssRules([
		"width",
		"min-width",
		"max-width",
		"height",
		"padding",
		"padding-top",
		"padding-right",
		"padding-bottom",
		"padding-left",
		...borderStyleProperties,
	]),
	["vertical-align", supportsVerticalAlign],
	["text-align", supportsTextAlign(cellAlignments)],
	["background-color", supportsColor],
]);
const textBlockStyles = new Map([
	["text-align", supportsTextAlign(textAlignments)],
	["margin-inline-start", supportsCssValue("margin-inline-start")],
]);
const listItemStyles = new Map([["text-align", supportsTextAlign(textAlignments)]]);
const textStyles = new Map([["color", supportsColor]]);
const highlightStyles = new Map([
	["background-color", supportsColor],
	["color", supportsColor],
]);
const cellAttributes = new Map<string, ValueValidator>([
	["colspan", supportsCanonicalInteger(1, 1000)],
	["rowspan", supportsCanonicalInteger(1, 65_534)],
	["colwidth", (value, element) => value.split(",").every((width) => supportsCanonicalInteger(1)(width, element))],
	["align", (value) => cellAlignments.has(value.trim().toLowerCase())],
]);
const noValues: ElementRule = {};
const textBlockRule: ElementRule = {
	attributes: new Map([
		["data-indent", supportsCanonicalInteger(1, 8)],
		[whitespaceAttribute, (value) => value === whitespacePreserveValue],
	]),
	styles: textBlockStyles,
	validate: validateTextBlock,
};
const elementRules = new Map<string, ElementRule>([
	["table", { styles: tableStyles }],
	["tbody", noValues],
	["tr", { styles: rowStyles }],
	["td", { attributes: cellAttributes, styles: cellStyles, validate: validateCell }],
	["th", { attributes: cellAttributes, styles: cellStyles, validate: validateCell }],
	...[...textBlockTags].map((tag): [string, ElementRule] => [tag, textBlockRule]),
	["blockquote", noValues],
	["ul", noValues],
	["ol", { attributes: new Map([["start", supportsCanonicalInteger(Number.MIN_SAFE_INTEGER)]]) }],
	["li", { styles: listItemStyles, validate: (element) => styleValues(element, "text-align").length <= 1 }],
	["hr", noValues],
	["br", noValues],
	["strong", noValues],
	["b", noValues],
	["em", noValues],
	["i", noValues],
	["u", noValues],
	["s", noValues],
	["strike", noValues],
	["code", noValues],
	[
		"a",
		{
			attributes: new Map([
				["href", supportsLinkHref],
				["target", () => true],
				["rel", () => true],
				["class", () => true],
				["title", () => true],
			]),
			validate: (element) => element.hasAttribute("href"),
		},
	],
	["span", { styles: textStyles, validate: (element) => styleValues(element, "color").length === 1 }],
	["mark", { attributes: new Map([["data-color", supportsColor]]), styles: highlightStyles, validate: validateMark }],
]);

const hasOnlySupportedValues = (element: Element) => {
	const rule = elementRules.get(element.tagName.toLowerCase());
	if (!rule) return false;
	for (const attribute of element.attributes) {
		const name = attribute.name.toLowerCase();
		if (name === "style" && rule.styles) continue;
		const validate = rule.attributes?.get(name);
		if (!validate?.(attribute.value, element)) return false;
	}
	const declarations = readStyleDeclarations(element);
	if (!declarations) return false;
	if (declarations.length > 0 && !rule.styles) return false;
	for (const { property, value } of declarations) {
		if (!rule.styles?.get(property)?.(value, element)) return false;
	}
	return rule.validate?.(element) ?? true;
};

const hasUnsupportedChildNode = (node: Node) =>
	node.nodeType === Node.TEXT_NODE ? Boolean(node.textContent?.trim()) : node.nodeType !== Node.ELEMENT_NODE;

const hasOnlyInlineContent = (element: Element): boolean =>
	Array.from(element.childNodes).every((child) => {
		if (child.nodeType === Node.TEXT_NODE) return true;
		if (!(child instanceof Element) || !inlineTags.has(child.tagName.toLowerCase())) return false;
		return hasOnlyInlineContent(child);
	});

const hasOnlyCellBlockContent = (element: Element): boolean =>
	Array.from(element.childNodes).every((child) => {
		if (child.nodeType === Node.TEXT_NODE) return true;
		if (!(child instanceof Element)) return false;
		const tagName = child.tagName.toLowerCase();
		if (inlineTags.has(tagName)) return hasOnlyInlineContent(child);
		if (!cellBlockTags.has(tagName)) return false;
		if (textBlockTags.has(tagName)) return hasOnlyInlineContent(child);
		if (tagName === "hr") return child.childNodes.length === 0;
		if (tagName === "blockquote") {
			const hasContent = Array.from(child.childNodes).some(
				(blockChild) => blockChild.nodeType === Node.ELEMENT_NODE || Boolean(blockChild.textContent?.trim()),
			);
			return hasContent && hasOnlyCellBlockContent(child);
		}
		const listItems = Array.from(child.children);
		if (listItems.length === 0) return false;
		return Array.from(child.childNodes).every((listChild) => {
			if (listChild.nodeType === Node.TEXT_NODE) return !listChild.textContent?.trim();
			if (!(listChild instanceof Element) || listChild.tagName.toLowerCase() !== "li") return false;
			return hasOnlyCellBlockContent(listChild);
		});
	});

const hasRectangularTableGrid = (rows: readonly Element[]) => {
	let expectedWidth: number | undefined;
	const occupiedUntil: number[] = [];

	for (const [rowIndex, row] of rows.entries()) {
		const coverage = occupiedUntil.map((endRow) => endRow > rowIndex);
		let column = 0;

		for (const cell of Array.from(row.children)) {
			while (coverage[column]) column++;
			const colspan = Number(cell.getAttribute("colspan") ?? 1);
			const rowspan = Number(cell.getAttribute("rowspan") ?? 1);
			if (rowIndex + rowspan > rows.length) return false;
			for (let offset = 0; offset < colspan; offset++) {
				if (coverage[column + offset]) return false;
				coverage[column + offset] = true;
				occupiedUntil[column + offset] = rowIndex + rowspan;
			}
			column += colspan;
		}

		const rowWidth = coverage.lastIndexOf(true) + 1;
		if (rowWidth === 0 || coverage.slice(0, rowWidth).some((covered) => !covered)) return false;
		expectedWidth ??= rowWidth;
		if (rowWidth !== expectedWidth) return false;
	}

	return true;
};

const hasUnsupportedCellDescendant = (element: Element) => {
	const tagName = element.tagName.toLowerCase();
	return !inlineTags.has(tagName) && !cellBlockTags.has(tagName) && tagName !== "li"
		? true
		: !hasOnlySupportedValues(element);
};

const sourceTablesFrom = (html: string) =>
	Array.from(html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi), (match) => match[0]);

const tableMarkersFrom = (html: string) => Array.from(html.matchAll(/<\/?table(?=\s|\/?>|$)/gi));

const openingTableMarkersFrom = (html: string) => Array.from(html.matchAll(/<table(?=\s|\/?>|$)/gi));

const parsedTablesMatchSource = (sourceTables: readonly string[], tables: readonly HTMLTableElement[]) => {
	return (
		sourceTables.length === tables.length && sourceTables.every((source, index) => source === tables[index]?.outerHTML)
	);
};

const hasUnsupportedTableMarkup = (html: string) => {
	if (typeof DOMParser === "undefined") return false;
	const tableMarkers = tableMarkersFrom(html);
	if (tableMarkers.length === 0) return false;
	const document = new DOMParser().parseFromString(html, "text/html");
	const tables = Array.from(document.querySelectorAll("table"));
	const sourceTables = sourceTablesFrom(html);
	const openingTableMarkers = openingTableMarkersFrom(html);
	if (
		tables.length === 0 ||
		sourceTables.length === 0 ||
		openingTableMarkers.length !== sourceTables.length ||
		tableMarkers.length !== sourceTables.length * 2 ||
		!parsedTablesMatchSource(sourceTables, tables)
	)
		return true;

	for (const table of tables) {
		if (!hasOnlySupportedValues(table)) return true;
		const bodies = Array.from(table.children);
		if (bodies.length !== 1 || bodies[0]?.tagName.toLowerCase() !== "tbody") return true;
		if (Array.from(table.childNodes).some(hasUnsupportedChildNode)) return true;

		const body = bodies[0];
		if (!body || !hasOnlySupportedValues(body)) return true;
		if (Array.from(body.childNodes).some(hasUnsupportedChildNode)) return true;
		const rows = Array.from(body.children);
		if (rows.length === 0 || rows.some((row) => row.tagName.toLowerCase() !== "tr")) return true;

		for (const row of rows) {
			if (!hasOnlySupportedValues(row)) return true;
			if (Array.from(row.childNodes).some(hasUnsupportedChildNode)) return true;
			if (Array.from(row.children).some((cell) => !["td", "th"].includes(cell.tagName.toLowerCase()))) return true;
		}
		for (const cell of table.querySelectorAll("td, th")) {
			if (!hasOnlySupportedValues(cell)) return true;
			if (!hasOnlyCellBlockContent(cell)) return true;
			if (Array.from(cell.querySelectorAll("*"), hasUnsupportedCellDescendant).some(Boolean)) return true;
		}
		if (!hasRectangularTableGrid(rows)) return true;
	}
	return false;
};

const preservedStyle = {
	default: null,
	parseHTML: (element: HTMLElement) => element.getAttribute("style"),
	renderHTML: (attributes: { style?: string | null }) => (attributes.style ? { style: attributes.style } : {}),
};

const StyledTable = Table.extend({
	addAttributes() {
		return { ...this.parent?.(), style: preservedStyle };
	},
	renderHTML({ HTMLAttributes }) {
		return ["table", HTMLAttributes, ["tbody", 0]];
	},
});

const StyledTableRow = TableRow.extend({
	addAttributes() {
		return { ...this.parent?.(), style: preservedStyle };
	},
});

const StyledTableHeader = TableHeader.extend({
	addAttributes() {
		return { ...this.parent?.(), style: preservedStyle };
	},
});

const StyledTableCell = TableCell.extend({
	addAttributes() {
		return { ...this.parent?.(), style: preservedStyle };
	},
});

const extensions = [
	StarterKit.configure({
		heading: false,
		paragraph: false,
		codeBlock: false,
		link: {
			openOnClick: false,
			enableClickSelection: true,
			defaultProtocol: "https",
			protocols: ["http", "https"],
		},
	}),
	LiteralParagraph,
	LiteralHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
	LiteralWhitespaceInput.configure({ hasUnsupportedTableMarkup }),
	TextStyle,
	Color,
	Highlight.configure({ multicolor: true }).extend({
		renderHTML({ HTMLAttributes }) {
			const color = HTMLAttributes["data-color"] as string | undefined;
			if (color && isDarkColor(color)) {
				HTMLAttributes.style = `${HTMLAttributes.style ?? ""}; color: #ffffff`;
			}
			return ["mark", HTMLAttributes, 0];
		},
	}),
	TextAlign.configure({ types: ["heading", "paragraph", "listItem"] }),
	ParagraphIndent,
	StyledTable,
	StyledTableRow,
	StyledTableHeader,
	StyledTableCell,
];

type Props = UseEditorOptions & {
	"aria-label"?: string;
	value: string;
	onChange: (value: string) => void;
	style?: React.CSSProperties;
	className?: string;
	editorClassName?: string;
};

export function RichInput({
	value,
	onChange,
	style,
	className,
	editorClassName,
	"aria-label": ariaLabel,
	...options
}: Props) {
	const { i18n } = useLingui();
	const textDirection = isRTL(i18n.locale) ? "rtl" : undefined;
	const [isFullscreen, setIsFullscreen] = useState(false);
	const hasUnsupportedTable = useMemo(() => hasUnsupportedTableMarkup(value), [value]);
	const requestedEditable = options.editable ?? true;

	const editor = useEditor({
		...options,
		extensions,
		textDirection,
		content: value,
		editable: requestedEditable && !hasUnsupportedTable,
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
		editorProps: {
			attributes: {
				...(ariaLabel ? { "aria-label": ariaLabel } : {}),
				spellcheck: "false",
				"data-editor": "true",
				"data-fullscreen": isFullscreen ? "true" : "false",
				class: cn(
					"wysiwyg group/editor overflow-y-auto p-3 pb-4 [&_[data-resume-whitespace=preserve]]:whitespace-pre-wrap",
					"rounded-md rounded-t-none border outline-none focus-visible:border-ring",
					"[td:has(.selectedCell)]:bg-primary",
					"data-[fullscreen=false]:max-h-[400px] data-[fullscreen=false]:min-h-[100px]",
					"data-[fullscreen=true]:max-h-none data-[fullscreen=true]:min-h-full",
					editorClassName,
				),
			},
		},
		onUpdate: ({ editor }) => {
			if (hasUnsupportedTable) return;
			onChange(editor.getHTML());
		},
	});

	const providerValue = useMemo(() => ({ editor }), [editor]);

	useEffect(() => {
		if (!editor || editor.getHTML() === value) return;
		editor.commands.setContent(value, { emitUpdate: false });
	}, [editor, value]);

	useEffect(() => {
		if (!editor) return;
		editor.setEditable(requestedEditable && !hasUnsupportedTable, false);
	}, [editor, hasUnsupportedTable, requestedEditable]);

	if (!editor) return null;

	const editorElement = (
		<div className="relative">
			{hasUnsupportedTable ? (
				<div role="status" className="rounded-md rounded-b-none border border-b-0 bg-muted px-3 py-2 text-sm">
					<span>
						<Trans>
							Original table formatting is preserved. This content is read-only because it cannot be edited safely.
						</Trans>
					</span>
				</div>
			) : (
				<EditorToolbar editor={editor} isFullscreen={isFullscreen} />
			)}

			<EditorContent editor={editor} />

			<Button
				size="icon"
				variant="secondary"
				className="absolute right-2 bottom-2 size-7"
				title={isFullscreen ? t`Exit Fullscreen` : t`Fullscreen`}
				onClick={() => setIsFullscreen(!isFullscreen)}
			>
				{isFullscreen ? <ArrowsInSimpleIcon className="size-4" /> : <ArrowsOutSimpleIcon className="size-4" />}
			</Button>
		</div>
	);

	if (isFullscreen) {
		return (
			<EditorContext value={providerValue}>
				<div className={cn("rounded-md", className)} style={style}>
					{/* Placeholder to maintain layout */}
					<div className="h-[200px] rounded-md border border-dashed" />
				</div>

				<Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
					<DialogContent className="flex h-[95svh] max-h-none! w-[95svw] max-w-none! flex-col p-4 sm:max-w-none! 2xl:max-w-none!">
						<div className="sr-only">
							<DialogTitle>
								<Trans comment="Screen reader title for the fullscreen rich-text editor dialog">
									Fullscreen Editor
								</Trans>
							</DialogTitle>
							<DialogDescription>
								<Trans comment="Screen reader description for the fullscreen rich-text editor dialog">
									Edit content in fullscreen mode
								</Trans>
							</DialogDescription>
						</div>
						{editorElement}
					</DialogContent>
				</Dialog>
			</EditorContext>
		);
	}

	return (
		<EditorContext value={providerValue}>
			<div className={cn("rounded-md", className)} style={style}>
				{editorElement}
			</div>
		</EditorContext>
	);
}

function useEditorToolbarState(editor: Editor) {
	const prompt = usePrompt();

	const state = useEditorState({
		editor,
		selector: (ctx) => {
			return {
				// Bold
				isBold: ctx.editor.isActive("bold") ?? false,
				canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
				toggleBold: () => ctx.editor.chain().focus().toggleBold().run(),

				// Italic
				isItalic: ctx.editor.isActive("italic") ?? false,
				canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
				toggleItalic: () => ctx.editor.chain().focus().toggleItalic().run(),

				// Underline
				isUnderline: ctx.editor.isActive("underline") ?? false,
				canUnderline: ctx.editor.can().chain().toggleUnderline().run() ?? false,
				toggleUnderline: () => ctx.editor.chain().focus().toggleUnderline().run(),

				// Strike
				isStrike: ctx.editor.isActive("strike") ?? false,
				canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
				toggleStrike: () => ctx.editor.chain().focus().toggleStrike().run(),

				// Highlight Color
				isHighlight: ctx.editor.isActive("highlight") ?? false,
				highlightColor: (ctx.editor.getAttributes("highlight").color as string | undefined) ?? null,
				canHighlightColor: ctx.editor.can().chain().toggleHighlight().run() ?? false,
				setHighlightColor: (color: string) => ctx.editor.chain().focus().toggleHighlight({ color }).run(),
				unsetHighlightColor: () => ctx.editor.chain().focus().unsetHighlight().run(),

				// Text Color
				textColor: (ctx.editor.getAttributes("textStyle").color as string | undefined) ?? null,
				canTextColor: ctx.editor.can().chain().setColor(defaultTextColor).run() ?? false,
				setTextColor: (color: string) => ctx.editor.chain().focus().setColor(color).run(),
				unsetTextColor: () => ctx.editor.chain().focus().unsetColor().run(),

				// Heading 1
				isHeading1: ctx.editor.isActive("heading", { level: 1 }) ?? false,
				canHeading1: ctx.editor.can().chain().toggleHeading({ level: 1 }).run() ?? false,
				toggleHeading1: () => ctx.editor.chain().focus().toggleHeading({ level: 1 }).run(),

				// Heading 2
				isHeading2: ctx.editor.isActive("heading", { level: 2 }) ?? false,
				canHeading2: ctx.editor.can().chain().toggleHeading({ level: 2 }).run() ?? false,
				toggleHeading2: () => ctx.editor.chain().focus().toggleHeading({ level: 2 }).run(),

				// Heading 3
				isHeading3: ctx.editor.isActive("heading", { level: 3 }) ?? false,
				canHeading3: ctx.editor.can().chain().toggleHeading({ level: 3 }).run() ?? false,
				toggleHeading3: () => ctx.editor.chain().focus().toggleHeading({ level: 3 }).run(),

				// Heading 4
				isHeading4: ctx.editor.isActive("heading", { level: 4 }) ?? false,
				canHeading4: ctx.editor.can().chain().toggleHeading({ level: 4 }).run() ?? false,
				toggleHeading4: () => ctx.editor.chain().focus().toggleHeading({ level: 4 }).run(),

				// Heading 5
				isHeading5: ctx.editor.isActive("heading", { level: 5 }) ?? false,
				canHeading5: ctx.editor.can().chain().toggleHeading({ level: 5 }).run() ?? false,
				toggleHeading5: () => ctx.editor.chain().focus().toggleHeading({ level: 5 }).run(),

				// Heading 6
				isHeading6: ctx.editor.isActive("heading", { level: 6 }) ?? false,
				canHeading6: ctx.editor.can().chain().toggleHeading({ level: 6 }).run() ?? false,
				toggleHeading6: () => ctx.editor.chain().focus().toggleHeading({ level: 6 }).run(),

				// Paragraph
				isParagraph: ctx.editor.isActive("paragraph") ?? false,
				canParagraph: ctx.editor.can().chain().setParagraph().run() ?? false,
				setParagraph: () => ctx.editor.chain().focus().setParagraph().run(),

				// Left Align
				isLeftAlign: ctx.editor.isActive({ textAlign: "left" }) ?? false,
				canLeftAlign: ctx.editor.can().chain().toggleTextAlign("left").run() ?? false,
				toggleLeftAlign: () => ctx.editor.chain().focus().toggleTextAlign("left").run(),

				// Center Align
				isCenterAlign: ctx.editor.isActive({ textAlign: "center" }) ?? false,
				canCenterAlign: ctx.editor.can().chain().toggleTextAlign("center").run() ?? false,
				toggleCenterAlign: () => ctx.editor.chain().focus().toggleTextAlign("center").run(),

				// Right Align
				isRightAlign: ctx.editor.isActive({ textAlign: "right" }) ?? false,
				canRightAlign: ctx.editor.can().chain().toggleTextAlign("right").run() ?? false,
				toggleRightAlign: () => ctx.editor.chain().focus().toggleTextAlign("right").run(),

				// Justify Align
				isJustifyAlign: ctx.editor.isActive({ textAlign: "justify" }) ?? false,
				canJustifyAlign: ctx.editor.can().chain().toggleTextAlign("justify").run() ?? false,
				toggleJustifyAlign: () => ctx.editor.chain().focus().toggleTextAlign("justify").run(),

				// Bullet List
				isBulletList: ctx.editor.isActive("bulletList") ?? false,
				canBulletList: ctx.editor.can().chain().toggleBulletList().run() ?? false,
				toggleBulletList: () => ctx.editor.chain().focus().toggleBulletList().run(),

				// Ordered List
				isOrderedList: ctx.editor.isActive("orderedList") ?? false,
				canOrderedList: ctx.editor.can().chain().toggleOrderedList().run() ?? false,
				toggleOrderedList: () => ctx.editor.chain().focus().toggleOrderedList().run(),

				// Outdent block or list item
				canDecreaseIndent: ctx.editor.can().chain().decreaseIndent().run() ?? false,
				decreaseIndent: () => ctx.editor.chain().focus().decreaseIndent().run(),

				// Indent block or list item
				canIncreaseIndent: ctx.editor.can().chain().increaseIndent().run() ?? false,
				increaseIndent: () => ctx.editor.chain().focus().increaseIndent().run(),

				// Link
				isLink: ctx.editor.isActive("link") ?? false,
				setLink: async () => {
					const url = await prompt(t`Enter the URL you want to link to:`, {
						defaultValue: "https://",
					});

					if (!url || url.trim() === "") {
						ctx.editor.chain().focus().unsetLink().run();
						return;
					}

					if (!z.url({ protocol: /^https?$/ }).safeParse(url).success) {
						toast.add({
							type: "error",
							title: t`The URL you entered is not valid.`,
							description: t`Valid URLs must start with http:// or https://.`,
						});
						return;
					}

					ctx.editor.chain().focus().setLink({ href: url, target: "_blank", rel: "noopener nofollow" }).run();
				},
				unsetLink: () => ctx.editor.chain().focus().unsetLink().run(),

				// Inline Code
				isInlineCode: ctx.editor.isActive("code") ?? false,
				canInlineCode: ctx.editor.can().chain().toggleCode().run() ?? false,
				toggleInlineCode: () => ctx.editor.chain().focus().toggleCode().run(),

				// Character Count
				characterCount: ctx.editor.getText().length,

				// Hard Break
				setHardBreak: () => ctx.editor.chain().focus().setHardBreak().run(),

				// Horizontal Rule
				setHorizontalRule: () => ctx.editor.chain().focus().setHorizontalRule().run(),
			};
		},
	});

	return state;
}

type EditorToolbarState = ReturnType<typeof useEditorToolbarState>;

type EditorToolbarProps = {
	editor: Editor;
	isFullscreen: boolean;
};

function EditorToolbar({ editor, isFullscreen }: EditorToolbarProps) {
	const state = useEditorToolbarState(editor);

	return renderEditorToolbar(state, isFullscreen);
}

function renderEditorToolbar(state: EditorToolbarState, isFullscreen: boolean) {
	const { visibleHighlightColor, canClearHighlight } = resolveHighlightToolbarState(
		state.isHighlight,
		state.highlightColor,
	);

	return (
		<div className="flex flex-wrap items-center gap-y-0.5 rounded-md rounded-b-none border border-b-0">
			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Bold`}
				pressed={state.isBold}
				disabled={!state.canBold}
				onPressedChange={state.toggleBold}
			>
				<TextBolderIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Italic`}
				pressed={state.isItalic}
				disabled={!state.canItalic}
				onPressedChange={state.toggleItalic}
			>
				<TextItalicIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Underline`}
				pressed={state.isUnderline}
				disabled={!state.canUnderline}
				onPressedChange={state.toggleUnderline}
			>
				<TextUnderlineIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Strike`}
				pressed={state.isStrike}
				disabled={!state.canStrike}
				onPressedChange={state.toggleStrike}
			>
				<TextStrikethroughIcon className="size-3.5" />
			</Toggle>

			<ColorPicker
				defaultValue={defaultHighlightColor}
				value={visibleHighlightColor}
				onChange={state.setHighlightColor}
				trigger={
					<PopoverTrigger
						render={
							<Button
								size={isFullscreen ? "lg" : "sm"}
								tabIndex={-1}
								variant="ghost"
								className={cn("rounded-none px-2", state.isHighlight && "bg-muted text-foreground")}
								title={t`Highlight`}
								disabled={!state.canHighlightColor}
							>
								<span className="flex flex-col items-center leading-none">
									<HighlighterCircleIcon className="size-3.5" />
									<span
										className="mt-0.5 h-0.5 w-3 rounded-full"
										style={{ backgroundColor: visibleHighlightColor ?? "currentColor" }}
									/>
								</span>
							</Button>
						}
					/>
				}
			>
				<PopoverHeader className="flex-row items-start justify-between gap-2">
					<div className="flex items-center gap-2.5">
						<span
							className="grid size-9 place-items-center rounded-lg border border-border bg-muted/60 text-sm shadow-xs"
							style={{ backgroundColor: visibleHighlightColor ?? defaultHighlightColor }}
						>
							<HighlighterCircleIcon className="size-4" />
						</span>

						<div className="flex flex-col gap-0.5">
							<PopoverTitle>
								<Trans>Highlight Color</Trans>
							</PopoverTitle>
							<span className="text-muted-foreground text-xs">
								<Trans comment="Preset or custom shade refer to the color picker">
									Choose a preset or custom shade.
								</Trans>
							</span>
						</div>
					</div>

					<Button
						size="xs"
						variant="ghost"
						className="shrink-0"
						onClick={state.unsetHighlightColor}
						disabled={!canClearHighlight}
					>
						<Trans comment="Clear the highlight color">Clear</Trans>
					</Button>
				</PopoverHeader>
			</ColorPicker>

			<ColorPicker
				defaultValue={defaultTextColor}
				value={state.textColor ?? undefined}
				onChange={state.setTextColor}
				trigger={
					<PopoverTrigger
						render={
							<Button
								size={isFullscreen ? "lg" : "sm"}
								tabIndex={-1}
								variant="ghost"
								className={cn("rounded-none px-2", state.textColor && "bg-muted text-foreground")}
								title={t`Text Color`}
								disabled={!state.canTextColor}
							>
								<span className="flex flex-col items-center leading-none">
									<span className="font-semibold text-xs">A</span>
									<span
										className="mt-0.5 h-0.5 w-3 rounded-full"
										style={{ backgroundColor: state.textColor ?? "currentColor" }}
									/>
								</span>
							</Button>
						}
					/>
				}
			>
				<PopoverHeader className="flex-row items-start justify-between gap-2">
					<div className="flex items-center gap-2.5">
						<span
							className="grid size-9 place-items-center rounded-lg border border-border bg-muted/60 font-semibold text-sm shadow-xs"
							style={{ color: state.textColor ?? "currentColor" }}
						>
							A
						</span>

						<div className="flex flex-col gap-0.5">
							<PopoverTitle>
								<Trans>Text Color</Trans>
							</PopoverTitle>
							<span className="text-muted-foreground text-xs">
								<Trans comment="Preset or custom shade refer to the color picker">
									Choose a preset or custom shade.
								</Trans>
							</span>
						</div>
					</div>

					<Button
						size="xs"
						variant="ghost"
						className="shrink-0"
						onClick={state.unsetTextColor}
						disabled={!state.textColor}
					>
						<Trans comment="Clear the text color">Clear</Trans>
					</Button>
				</PopoverHeader>
			</ColorPicker>

			<div className="mx-1 h-5 w-px bg-border" />

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							size={isFullscreen ? "lg" : "sm"}
							tabIndex={-1}
							variant="ghost"
							aria-label={t`Paragraph and heading style`}
							className="rounded-none"
						>
							{match(state)
								.with({ isParagraph: true }, () => <ParagraphIcon className="size-3.5" />)
								.with({ isHeading1: true }, () => <TextHOneIcon className="size-3.5" />)
								.with({ isHeading2: true }, () => <TextHTwoIcon className="size-3.5" />)
								.with({ isHeading3: true }, () => <TextHThreeIcon className="size-3.5" />)
								.with({ isHeading4: true }, () => <TextHFourIcon className="size-3.5" />)
								.with({ isHeading5: true }, () => <TextHFiveIcon className="size-3.5" />)
								.with({ isHeading6: true }, () => <TextHSixIcon className="size-3.5" />)
								.otherwise(() => (
									<ParagraphIcon className="size-3.5" />
								))}
						</Button>
					}
				/>

				<DropdownMenuContent>
					<DropdownMenuCheckboxItem
						disabled={!state.canParagraph}
						checked={state.isParagraph}
						onCheckedChange={state.setParagraph}
					>
						<Trans>Paragraph</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuSeparator />
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading1}
						checked={state.isHeading1}
						onCheckedChange={state.toggleHeading1}
					>
						<Trans>Heading 1</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading2}
						checked={state.isHeading2}
						onCheckedChange={state.toggleHeading2}
					>
						<Trans>Heading 2</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading3}
						checked={state.isHeading3}
						onCheckedChange={state.toggleHeading3}
					>
						<Trans>Heading 3</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading4}
						checked={state.isHeading4}
						onCheckedChange={state.toggleHeading4}
					>
						<Trans>Heading 4</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading5}
						checked={state.isHeading5}
						onCheckedChange={state.toggleHeading5}
					>
						<Trans>Heading 5</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canHeading6}
						checked={state.isHeading6}
						onCheckedChange={state.toggleHeading6}
					>
						<Trans>Heading 6</Trans>
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							size={isFullscreen ? "lg" : "sm"}
							tabIndex={-1}
							variant="ghost"
							aria-label={t`Text alignment`}
							className="rounded-none"
						>
							{match(state)
								.with({ isLeftAlign: true }, () => <TextAlignLeftIcon className="size-3.5" />)
								.with({ isCenterAlign: true }, () => <TextAlignCenterIcon className="size-3.5" />)
								.with({ isRightAlign: true }, () => <TextAlignRightIcon className="size-3.5" />)
								.with({ isJustifyAlign: true }, () => <TextAlignJustifyIcon className="size-3.5" />)
								.otherwise(() => (
									<TextAlignLeftIcon className="size-3.5" />
								))}
						</Button>
					}
				/>

				<DropdownMenuContent>
					<DropdownMenuCheckboxItem
						disabled={!state.canLeftAlign}
						checked={state.isLeftAlign}
						onCheckedChange={state.toggleLeftAlign}
					>
						<Trans>Left Align</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canCenterAlign}
						checked={state.isCenterAlign}
						onCheckedChange={state.toggleCenterAlign}
					>
						<Trans>Center Align</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canRightAlign}
						checked={state.isRightAlign}
						onCheckedChange={state.toggleRightAlign}
					>
						<Trans>Right Align</Trans>
					</DropdownMenuCheckboxItem>
					<DropdownMenuCheckboxItem
						disabled={!state.canJustifyAlign}
						checked={state.isJustifyAlign}
						onCheckedChange={state.toggleJustifyAlign}
					>
						<Trans>Justify Align</Trans>
					</DropdownMenuCheckboxItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="mx-1 h-5 w-px bg-border" />

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Bullet List`}
				pressed={state.isBulletList}
				disabled={!state.canBulletList}
				onPressedChange={state.toggleBulletList}
			>
				<ListBulletsIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Ordered List`}
				pressed={state.isOrderedList}
				disabled={!state.canOrderedList}
				onPressedChange={state.toggleOrderedList}
			>
				<ListNumbersIcon className="size-3.5" />
			</Toggle>

			<Button
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`Decrease indent`}
				disabled={!state.canDecreaseIndent}
				onClick={state.decreaseIndent}
			>
				<TextOutdentIcon className="size-3.5" />
			</Button>

			<Button
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`Increase indent`}
				disabled={!state.canIncreaseIndent}
				onClick={state.increaseIndent}
			>
				<TextIndentIcon className="size-3.5" />
			</Button>

			<div className="mx-1 h-5 w-px bg-border" />

			{state.isLink ? (
				<Button
					size={isFullscreen ? "lg" : "sm"}
					tabIndex={-1}
					variant="ghost"
					className="rounded-none"
					title={t`Remove link`}
					onClick={state.unsetLink}
				>
					<LinkBreakIcon className="size-3.5" />
				</Button>
			) : (
				<Button
					size={isFullscreen ? "lg" : "sm"}
					tabIndex={-1}
					variant="ghost"
					className="rounded-none"
					title={t`Add link`}
					onClick={state.setLink}
				>
					<LinkIcon className="size-3.5" />
				</Button>
			)}

			<Toggle
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				className="rounded-none"
				title={t`Inline Code`}
				pressed={state.isInlineCode}
				disabled={!state.canInlineCode}
				onPressedChange={state.toggleInlineCode}
			>
				<CodeSimpleIcon className="size-3.5" />
			</Toggle>

			<Button
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`New Line`}
				onClick={state.setHardBreak}
			>
				<KeyReturnIcon className="size-3.5" />
			</Button>

			<Button
				size={isFullscreen ? "lg" : "sm"}
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`Separator`}
				onClick={state.setHorizontalRule}
			>
				<MinusIcon className="size-3.5" />
			</Button>

			<span className="ml-auto px-2 text-muted-foreground text-xs tabular-nums" aria-live="polite">
				<Trans comment="Character count readout for the rich-text editor">{state.characterCount} characters</Trans>
			</span>
		</div>
	);
}
