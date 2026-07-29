import type { Extension } from "@codemirror/state";
import type { RrssDiagnostic } from "@reactive-resume/resume/stylesheet";
import type { RrssColorToken } from "./color-tokens";
import type { RrssEditorMetadata } from "./protocol";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Annotation, Compartment, EditorState, Prec, Transaction } from "@codemirror/state";
import {
	drawSelection,
	EditorView,
	highlightActiveLine,
	highlightSpecialChars,
	keymap,
	lineNumbers,
} from "@codemirror/view";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { PopoverTrigger } from "@reactive-resume/ui/components/popover";
import { Sheet, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { ColorPicker } from "@/components/input/color-picker";
import { useTheme } from "@/features/theme/provider";
import { useBuilderSidebarStore } from "@/routes/builder/$resumeId/-store/sidebar";
import { compositionAwareDocumentListener, createRrssEditorExtensions } from "./editor-extensions";
import { enterStylesheetFocusMode } from "./focus-mode";
import { formatEditorDocument } from "./formatter";
import { LegacyStylesheetBanner } from "./legacy-banner";
import { StylesheetStatus } from "./status";
import { useStylesheetStore } from "./store";
import { StylesheetToolbar } from "./toolbar";

const externalReplacement = Annotation.define<boolean>();
const emptyMetadata: RrssEditorMetadata = {
	semanticTree: { key: "resume", kind: "resume", attributes: {}, roles: [], children: [] },
	templateParts: [],
};

type EditorCompartments = {
	theme: Compartment;
	readOnly: Compartment;
	intelligence: Compartment;
};

const editorTheme = (dark: boolean): Extension =>
	EditorView.theme(
		{
			"&": {
				height: "100%",
				backgroundColor: "var(--background)",
				color: "var(--foreground)",
				direction: "ltr",
			},
			".cm-scroller": {
				overflow: "auto",
				fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
				lineHeight: "1.5",
			},
			".cm-content": { minHeight: "100%", padding: "0.75rem 0" },
			".cm-gutters": {
				backgroundColor: "var(--muted)",
				borderRight: "1px solid var(--border)",
			},
			".cm-activeLine, .cm-activeLineGutter": {
				backgroundColor: "var(--accent)",
			},
			"&.cm-focused": { outline: "none" },
		},
		{ dark },
	);

const readOnlyExtensions = (readOnly: boolean): Extension => [
	EditorState.readOnly.of(readOnly),
	EditorView.editable.of(!readOnly),
];

export type StylesheetCodeEditorProps = {
	value: string;
	diagnostics: readonly RrssDiagnostic[];
	colorTokens?: readonly RrssColorToken[];
	metadata?: RrssEditorMetadata;
	theme: "light" | "dark";
	readOnly?: boolean;
	label?: string;
	onChange(value: string): void;
	onFocusChange?(focused: boolean): void;
	onReady?(view: EditorView | null): void;
	onUndo(): void;
	onRedo(): void;
};

export function StylesheetCodeEditor({
	value,
	diagnostics,
	colorTokens = [],
	metadata = emptyMetadata,
	theme,
	readOnly = false,
	label = "Semantic CSS stylesheet",
	onChange,
	onFocusChange,
	onReady,
	onUndo,
	onRedo,
}: StylesheetCodeEditorProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const viewRef = useRef<EditorView | null>(null);
	const colorTriggerRef = useRef<HTMLButtonElement | null>(null);
	const openColorPickerRef = useRef(false);
	const compartmentsRef = useRef<EditorCompartments | null>(null);
	const initialPropsRef = useRef({ value, diagnostics, colorTokens, metadata, theme, readOnly, label });
	const onChangeRef = useRef(onChange);
	const onFocusChangeRef = useRef(onFocusChange);
	const onReadyRef = useRef(onReady);
	const onUndoRef = useRef(onUndo);
	const onRedoRef = useRef(onRedo);
	const [selectedColor, setSelectedColor] = useState<{
		token: RrssColorToken;
		left: number;
		top: number;
	} | null>(null);
	const selectColor = useCallback((token: RrssColorToken, rect: DOMRect) => {
		const hostRect = hostRef.current?.getBoundingClientRect();
		if (!hostRect) return;
		openColorPickerRef.current = true;
		setSelectedColor({ token, left: rect.left - hostRect.left, top: rect.top - hostRect.top });
	}, []);

	onChangeRef.current = onChange;
	onFocusChangeRef.current = onFocusChange;
	onReadyRef.current = onReady;
	onUndoRef.current = onUndo;
	onRedoRef.current = onRedo;

	useEffect(() => {
		const parent = hostRef.current;
		if (!parent) return;
		const initial = initialPropsRef.current;

		const compartments: EditorCompartments = {
			theme: new Compartment(),
			readOnly: new Compartment(),
			intelligence: new Compartment(),
		};
		compartmentsRef.current = compartments;
		const view = new EditorView({
			parent,
			doc: initial.value,
			extensions: [
				lineNumbers(),
				highlightSpecialChars(),
				drawSelection(),
				highlightActiveLine(),
				css(),
				syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
				EditorView.editorAttributes.of({ dir: "ltr" }),
				EditorView.contentAttributes.of({ "aria-label": initial.label, dir: "ltr", spellcheck: "false" }),
				Prec.high(
					keymap.of([
						{
							key: "Mod-z",
							run: () => {
								onUndoRef.current();
								return true;
							},
						},
						{
							key: "Mod-Shift-z",
							run: () => {
								onRedoRef.current();
								return true;
							},
						},
						{
							key: "Mod-y",
							run: () => {
								onRedoRef.current();
								return true;
							},
						},
					]),
				),
				keymap.of([indentWithTab, ...defaultKeymap]),
				EditorView.domEventHandlers({
					focus: () => {
						onFocusChangeRef.current?.(true);
					},
					blur: () => {
						onFocusChangeRef.current?.(false);
					},
				}),
				compositionAwareDocumentListener(
					(source) => onChangeRef.current(source),
					(update) => update.transactions.some((transaction) => transaction.annotation(externalReplacement)),
				),
				compartments.theme.of(editorTheme(initial.theme === "dark")),
				compartments.readOnly.of(readOnlyExtensions(initial.readOnly)),
				compartments.intelligence.of(
					createRrssEditorExtensions({
						metadata: initial.metadata,
						diagnostics: initial.diagnostics,
						colorTokens: initial.colorTokens,
						onColorSelect: selectColor,
					}),
				),
			],
		});
		viewRef.current = view;
		onReadyRef.current?.(view);

		return () => {
			onReadyRef.current?.(null);
			view.destroy();
			viewRef.current = null;
			compartmentsRef.current = null;
		};
	}, [selectColor]);

	useEffect(() => {
		const view = viewRef.current;
		const compartments = compartmentsRef.current;
		if (!view || !compartments) return;
		view.dispatch({ effects: compartments.theme.reconfigure(editorTheme(theme === "dark")) });
	}, [theme]);

	useEffect(() => {
		const view = viewRef.current;
		const compartments = compartmentsRef.current;
		if (!view || !compartments) return;
		view.dispatch({ effects: compartments.readOnly.reconfigure(readOnlyExtensions(readOnly)) });
	}, [readOnly]);

	useEffect(() => {
		const view = viewRef.current;
		const compartments = compartmentsRef.current;
		if (!view || !compartments) return;
		view.dispatch({
			effects: compartments.intelligence.reconfigure(
				createRrssEditorExtensions({
					metadata,
					diagnostics,
					colorTokens,
					onColorSelect: selectColor,
				}),
			),
		});
	}, [colorTokens, diagnostics, metadata, selectColor]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view || view.state.doc.toString() === value) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
			annotations: externalReplacement.of(true),
		});
	}, [value]);

	useEffect(() => {
		if (!selectedColor || !openColorPickerRef.current) return;
		openColorPickerRef.current = false;
		queueMicrotask(() => colorTriggerRef.current?.click());
	}, [selectedColor]);

	const updateColor = (value: string) => {
		const view = viewRef.current;
		if (!view || !selectedColor) return;
		const { from, to } = selectedColor.token;
		view.dispatch({
			changes: { from, to, insert: value },
			annotations: Transaction.userEvent.of("input"),
		});
		setSelectedColor((current) =>
			current
				? {
						...current,
						token: { from, to: from + value.length, value },
					}
				: null,
		);
	};

	return (
		<div ref={hostRef} className="relative h-full overflow-hidden rounded-md border text-xs" dir="ltr">
			{selectedColor && (
				<div className="pointer-events-none absolute z-20" style={{ left: selectedColor.left, top: selectedColor.top }}>
					<ColorPicker
						value={selectedColor.token.value}
						onChange={updateColor}
						trigger={
							<PopoverTrigger
								render={
									<button
										ref={colorTriggerRef}
										data-rrss-color-picker-trigger=""
										type="button"
										title={t`Edit color ${selectedColor.token.value}`}
										aria-label={t`Edit color ${selectedColor.token.value}`}
										className="pointer-events-auto size-3 rounded-full border border-foreground/40"
										style={{ backgroundColor: selectedColor.token.value }}
									/>
								}
							/>
						}
					/>
				</div>
			)}
		</div>
	);
}

export type StylesheetEditorShellProps = {
	readOnly?: boolean;
};

export function StylesheetEditorShell({ readOnly = false }: StylesheetEditorShellProps) {
	const { theme } = useTheme();
	const isMobile = useMediaQuery("(max-width: 767px)", { initializeWithValue: false });
	const [focusOpen, setFocusOpen] = useState(false);
	const restoreDesktopRef = useRef<(() => void) | null>(null);
	const mode = useStylesheetStore((state) => state.mode);
	const source = useStylesheetStore((state) => state.source.text);
	const applied = useStylesheetStore((state) => state.applied.text);
	const diagnostics = useStylesheetStore((state) => state.diagnostics);
	const colorTokens = useStylesheetStore((state) => state.colorTokens);
	const metadata = useStylesheetStore((state) => state.editorMetadata);
	const status = useStylesheetStore((state) => state.status);
	const restoreLocked = useStylesheetStore((state) => state.restoreLocked);
	const canUndo = useStylesheetStore((state) => state.canUndo);
	const canRedo = useStylesheetStore((state) => state.canRedo);
	const setSourceText = useStylesheetStore((state) => state.setSourceText);
	const setFocused = useStylesheetStore((state) => state.setFocused);
	const activate = useStylesheetStore((state) => state.activate);
	const undo = useStylesheetStore((state) => state.undo);
	const redo = useStylesheetStore((state) => state.redo);
	const refreshIntelligence = useStylesheetStore((state) => state.refreshIntelligence);
	const editorViewRef = useRef<EditorView | null>(null);
	const hasErrors = status === "error" || diagnostics.some(({ severity }) => severity === "error");
	const isChecking = status === "compiling" || status === "preflighting" || status === "saving";

	useEffect(
		() => () => {
			restoreDesktopRef.current?.();
		},
		[],
	);

	useEffect(() => {
		refreshIntelligence();
	}, [refreshIntelligence]);

	const toggleFocus = () => {
		if (isMobile) {
			setFocusOpen((open) => !open);
			return;
		}

		if (restoreDesktopRef.current) {
			restoreDesktopRef.current();
			restoreDesktopRef.current = null;
			setFocusOpen(false);
			return;
		}

		const { rightSidebar, layout, setLayout } = useBuilderSidebarStore.getState();
		restoreDesktopRef.current = enterStylesheetFocusMode({
			rightPanel: rightSidebar,
			currentLayout: layout,
			setLayout,
		});
		setFocusOpen(true);
	};

	const editor = (
		<StylesheetCodeEditor
			value={source}
			diagnostics={diagnostics}
			colorTokens={colorTokens}
			metadata={metadata}
			theme={theme}
			readOnly={readOnly || restoreLocked}
			label={t`Semantic CSS stylesheet`}
			onChange={setSourceText}
			onFocusChange={setFocused}
			onReady={(view) => {
				editorViewRef.current = view;
			}}
			onUndo={undo}
			onRedo={redo}
		/>
	);
	const editorChrome = (
		<div className="space-y-3">
			{mode === "legacy" && (
				<LegacyStylesheetBanner disabled={restoreLocked || hasErrors || isChecking} onActivate={activate} />
			)}

			<StylesheetToolbar
				source={source}
				canUndo={canUndo}
				canRedo={canRedo}
				focused={focusOpen}
				disabled={restoreLocked}
				onUndo={undo}
				onRedo={redo}
				onFormat={() => {
					const view = editorViewRef.current;
					if (view) void formatEditorDocument(view).catch(() => undefined);
				}}
				onReset={() => setSourceText(applied)}
				onFocusToggle={toggleFocus}
			/>

			<div className={focusOpen ? (isMobile ? "h-[55svh]" : "h-[calc(100svh-14rem)]") : "h-72"}>{editor}</div>

			<StylesheetStatus mode={mode} status={status} diagnostics={diagnostics} />
		</div>
	);

	return (
		<div>
			{!(isMobile && focusOpen) && editorChrome}
			<Sheet open={isMobile && focusOpen} onOpenChange={setFocusOpen}>
				<SheetContent side="right" className="w-full max-w-full gap-3 overflow-hidden p-4 sm:max-w-full">
					<SheetTitle>
						<Trans>Semantic CSS stylesheet</Trans>
					</SheetTitle>
					<div className="min-h-0 flex-1 overflow-y-auto">{isMobile && focusOpen ? editorChrome : null}</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

export default StylesheetEditorShell;
