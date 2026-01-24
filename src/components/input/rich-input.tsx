import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	CodeBlockIcon,
	CodeSimpleIcon,
	ColumnsPlusLeftIcon,
	ColumnsPlusRightIcon,
	HighlighterCircleIcon,
	KeyReturnIcon,
	LinkBreakIcon,
	LinkIcon,
	ListBulletsIcon,
	ListNumbersIcon,
	MinusIcon,
	ParagraphIcon,
	PlusIcon,
	RowsPlusBottomIcon,
	RowsPlusTopIcon,
	TableIcon,
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
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import {
	type Editor,
	EditorContent,
	EditorContext,
	type UseEditorOptions,
	useEditor,
	useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useMemo } from "react";
import { toast } from "sonner";
import { match } from "ts-pattern";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePrompt } from "@/hooks/use-prompt";
import { isRTL } from "@/utils/locale";
import { sanitizeHtml } from "@/utils/sanitize";
import { cn } from "@/utils/style";
import { Toggle } from "../ui/toggle";
import styles from "./rich-input.module.css";

const extensions = [
	StarterKit.configure({
		heading: {
			levels: [1, 2, 3, 4, 5, 6],
		},
		codeBlock: {
			enableTabIndentation: true,
		},
		link: {
			openOnClick: false,
			enableClickSelection: true,
			defaultProtocol: "https",
			protocols: ["http", "https"],
		},
	}),
	Highlight.configure({
		HTMLAttributes: {
			class: "rounded-md px-0.5 py-px",
		},
	}),
	TextAlign.configure({ types: ["heading", "paragraph", "listItem"] }),
	TableKit.configure(),
];

type Props = UseEditorOptions & {
	value: string;
	onChange: (value: string) => void;
	style?: React.CSSProperties;
	className?: string;
	editorClassName?: string;
};

export function RichInput({ value, onChange, style, className, editorClassName, ...options }: Props) {
	const { i18n } = useLingui();
	const textDirection = isRTL(i18n.locale) ? "rtl" : undefined;

	const editor = useEditor({
		...options,
		extensions,
		textDirection,
		content: value,
		immediatelyRender: false,
		shouldRerenderOnTransaction: false,
		editorProps: {
			attributes: {
				spellcheck: "false",
				"data-editor": "true",
				class: cn(
					"group/editor",
					"max-h-[400px] min-h-[100px] overflow-y-auto p-3 pb-0",
					"rounded-md rounded-t-none border outline-none focus-visible:border-ring",
					"[td:has(.selectedCell)]:bg-primary",
					styles.tiptap_content,
					styles.editor_content,
					editorClassName,
				),
			},
		},
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
	});

	const providerValue = useMemo(() => ({ editor }), [editor]);

	if (!editor) return null;

	return (
		<EditorContext value={providerValue}>
			<div className={cn("rounded-md", className)} style={style}>
				<EditorToolbar editor={editor} />
				<EditorContent editor={editor} />
			</div>
		</EditorContext>
	);
}

function EditorToolbar({ editor }: { editor: Editor }) {
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

				// Highlight
				isHighlight: ctx.editor.isActive("highlight") ?? false,
				canHighlight: ctx.editor.can().chain().toggleHighlight().run() ?? false,
				toggleHighlight: () => ctx.editor.chain().focus().toggleHighlight().run(),

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

				// Outdent List Item
				canLiftListItem: ctx.editor.can().chain().liftListItem("listItem").run() ?? false,
				liftListItem: () => ctx.editor.chain().focus().liftListItem("listItem").run(),

				// Indent List Item
				canSinkListItem: ctx.editor.can().chain().sinkListItem("listItem").run() ?? false,
				sinkListItem: () => ctx.editor.chain().focus().sinkListItem("listItem").run(),

				// Link
				isLink: ctx.editor.isActive("link") ?? false,
				setLink: async () => {
					const url = await prompt(t`Please enter the URL you want to link to:`, {
						defaultValue: "https://",
					});

					if (!url || url.trim() === "") {
						ctx.editor.chain().focus().unsetLink().run();
						return;
					}

					if (!z.url({ protocol: /^https?$/ }).safeParse(url).success) {
						toast.error(t`The URL you entered is not valid.`, {
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

				// Code Block
				isCodeBlock: ctx.editor.isActive("codeBlock") ?? false,
				canCodeBlock: ctx.editor.can().chain().toggleCodeBlock().run() ?? false,
				toggleCodeBlock: () => ctx.editor.chain().focus().toggleCodeBlock().run(),

				// Table
				insertTable: () => ctx.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
				canInsertTable: ctx.editor.can().chain().insertTable().run() ?? false,
				addColumnBefore: () => ctx.editor.chain().focus().addColumnBefore().run(),
				canAddColumnBefore: ctx.editor.can().chain().addColumnBefore().run() ?? false,
				addColumnAfter: () => ctx.editor.chain().focus().addColumnAfter().run(),
				canAddColumnAfter: ctx.editor.can().chain().addColumnAfter().run() ?? false,
				addRowBefore: () => ctx.editor.chain().focus().addRowBefore().run(),
				canAddRowBefore: ctx.editor.can().chain().addRowBefore().run() ?? false,
				addRowAfter: () => ctx.editor.chain().focus().addRowAfter().run(),
				canAddRowAfter: ctx.editor.can().chain().addRowAfter().run() ?? false,
				deleteColumn: () => ctx.editor.chain().focus().deleteColumn().run(),
				canDeleteColumn: ctx.editor.can().chain().deleteColumn().run() ?? false,
				deleteRow: () => ctx.editor.chain().focus().deleteRow().run(),
				canDeleteRow: ctx.editor.can().chain().deleteRow().run() ?? false,
				deleteTable: () => ctx.editor.chain().focus().deleteTable().run(),
				canDeleteTable: ctx.editor.can().chain().deleteTable().run() ?? false,

				// Hard Break
				setHardBreak: () => ctx.editor.chain().focus().setHardBreak().run(),

				// Horizontal Rule
				setHorizontalRule: () => ctx.editor.chain().focus().setHorizontalRule().run(),
			};
		},
	});

	return (
		<div className="flex flex-wrap items-center gap-y-0.5 rounded-md rounded-b-none border border-b-0">
			<Toggle
				size="sm"
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
				size="sm"
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
				size="sm"
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
				size="sm"
				tabIndex={-1}
				className="rounded-none"
				title={t`Strike`}
				pressed={state.isStrike}
				disabled={!state.canStrike}
				onPressedChange={state.toggleStrike}
			>
				<TextStrikethroughIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size="sm"
				tabIndex={-1}
				className="rounded-none"
				title={t`Highlight`}
				pressed={state.isHighlight}
				disabled={!state.canHighlight}
				onPressedChange={state.toggleHighlight}
			>
				<HighlighterCircleIcon className="size-3.5" />
			</Toggle>

			<div className="mx-1 h-5 w-px bg-border" />

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="sm" tabIndex={-1} variant="ghost" className="rounded-none">
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
				</DropdownMenuTrigger>
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
				<DropdownMenuTrigger asChild>
					<Button size="sm" tabIndex={-1} variant="ghost" className="rounded-none">
						{match(state)
							.with({ isLeftAlign: true }, () => <TextAlignLeftIcon className="size-3.5" />)
							.with({ isCenterAlign: true }, () => <TextAlignCenterIcon className="size-3.5" />)
							.with({ isRightAlign: true }, () => <TextAlignRightIcon className="size-3.5" />)
							.with({ isJustifyAlign: true }, () => <TextAlignJustifyIcon className="size-3.5" />)
							.otherwise(() => (
								<TextAlignLeftIcon className="size-3.5" />
							))}
					</Button>
				</DropdownMenuTrigger>
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
				size="sm"
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
				size="sm"
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
				size="sm"
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				disabled={!state.canLiftListItem}
				onClick={state.liftListItem}
			>
				<TextOutdentIcon className="size-3.5" />
			</Button>

			<Button
				size="sm"
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				disabled={!state.canSinkListItem}
				onClick={state.sinkListItem}
			>
				<TextIndentIcon className="size-3.5" />
			</Button>

			<div className="mx-1 h-5 w-px bg-border" />

			{state.isLink ? (
				<Button size="sm" tabIndex={-1} variant="ghost" className="rounded-none" onClick={state.unsetLink}>
					<LinkBreakIcon className="size-3.5" />
				</Button>
			) : (
				<Button size="sm" tabIndex={-1} variant="ghost" className="rounded-none" onClick={state.setLink}>
					<LinkIcon className="size-3.5" />
				</Button>
			)}

			<Toggle
				size="sm"
				tabIndex={-1}
				className="rounded-none"
				title={t`Inline Code`}
				pressed={state.isInlineCode}
				disabled={!state.canInlineCode}
				onPressedChange={state.toggleInlineCode}
			>
				<CodeSimpleIcon className="size-3.5" />
			</Toggle>

			<Toggle
				size="sm"
				tabIndex={-1}
				className="rounded-none"
				title={t`Code Block`}
				pressed={state.isCodeBlock}
				disabled={!state.canCodeBlock}
				onPressedChange={state.toggleCodeBlock}
			>
				<CodeBlockIcon className="size-3.5" />
			</Toggle>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="sm" tabIndex={-1} variant="ghost" className="rounded-none" title={t`Table`}>
						<TableIcon className="size-3.5" />
					</Button>
				</DropdownMenuTrigger>

				<DropdownMenuContent>
					<DropdownMenuItem disabled={!state.canInsertTable} onSelect={state.insertTable}>
						<PlusIcon />
						<Trans>Insert Table</Trans>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!state.canAddColumnBefore} onSelect={state.addColumnBefore}>
						<ColumnsPlusLeftIcon />
						<Trans>Add Column Before</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!state.canAddColumnAfter} onSelect={state.addColumnAfter}>
						<ColumnsPlusRightIcon />
						<Trans>Add Column After</Trans>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!state.canAddRowBefore} onSelect={state.addRowBefore}>
						<RowsPlusTopIcon />
						<Trans>Add Row Before</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!state.canAddRowAfter} onSelect={state.addRowAfter}>
						<RowsPlusBottomIcon />
						<Trans>Add Row After</Trans>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem disabled={!state.canDeleteColumn} onSelect={state.deleteColumn}>
						<TrashSimpleIcon />
						<Trans>Delete Column</Trans>
					</DropdownMenuItem>
					<DropdownMenuItem disabled={!state.canDeleteRow} onSelect={state.deleteRow}>
						<TrashSimpleIcon />
						<Trans>Delete Row</Trans>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem variant="destructive" disabled={!state.canDeleteTable} onSelect={state.deleteTable}>
						<TrashSimpleIcon />
						<Trans>Delete Table</Trans>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>

			<Button
				size="sm"
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`New Line`}
				onClick={state.setHardBreak}
			>
				<KeyReturnIcon className="size-3.5" />
			</Button>

			<Button
				size="sm"
				tabIndex={-1}
				variant="ghost"
				className="rounded-none"
				title={t`Separator`}
				onClick={state.setHorizontalRule}
			>
				<MinusIcon className="size-3.5" />
			</Button>
		</div>
	);
}

type TiptapContentProps = React.ComponentProps<"div"> & {
	content: string;
};

export function TiptapContent({ content, className, ...props }: TiptapContentProps) {
	const sanitizedContent = useMemo(() => sanitizeHtml(content), [content]);

	return (
		<div
			// biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized with DOMPurify
			dangerouslySetInnerHTML={{ __html: sanitizedContent }}
			className={cn(styles.tiptap_content, className)}
			{...props}
		/>
	);
}
