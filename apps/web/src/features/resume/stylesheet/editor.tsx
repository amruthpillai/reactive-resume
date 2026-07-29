import type { Extension } from "@codemirror/state";
import type { RrssDiagnostic } from "@reactive-resume/resume/stylesheet";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { css } from "@codemirror/lang-css";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { lintGutter } from "@codemirror/lint";
import { Annotation, Compartment, EditorState, Prec } from "@codemirror/state";
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
import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "usehooks-ts";
import { Sheet, SheetContent, SheetTitle } from "@reactive-resume/ui/components/sheet";
import { useTheme } from "@/features/theme/provider";
import { useBuilderSidebarStore } from "@/routes/builder/$resumeId/-store/sidebar";
import { enterStylesheetFocusMode } from "./focus-mode";
import { LegacyStylesheetBanner } from "./legacy-banner";
import { StylesheetStatus } from "./status";
import { useStylesheetStore } from "./store";
import { StylesheetToolbar } from "./toolbar";

const externalReplacement = Annotation.define<boolean>();

type EditorCompartments = {
	theme: Compartment;
	readOnly: Compartment;
	diagnostics: Compartment;
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

const diagnosticExtensions = (diagnostics: readonly RrssDiagnostic[]): Extension =>
	diagnostics.length > 0 ? lintGutter() : [];

export type StylesheetCodeEditorProps = {
	value: string;
	diagnostics: readonly RrssDiagnostic[];
	theme: "light" | "dark";
	readOnly?: boolean;
	label?: string;
	onChange(value: string): void;
	onFocusChange?(focused: boolean): void;
	onUndo(): void;
	onRedo(): void;
};

export function StylesheetCodeEditor({
	value,
	diagnostics,
	theme,
	readOnly = false,
	label = "Semantic CSS stylesheet",
	onChange,
	onFocusChange,
	onUndo,
	onRedo,
}: StylesheetCodeEditorProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);
	const viewRef = useRef<EditorView | null>(null);
	const compartmentsRef = useRef<EditorCompartments | null>(null);
	const initialPropsRef = useRef({ value, diagnostics, theme, readOnly, label });
	const onChangeRef = useRef(onChange);
	const onFocusChangeRef = useRef(onFocusChange);
	const onUndoRef = useRef(onUndo);
	const onRedoRef = useRef(onRedo);

	onChangeRef.current = onChange;
	onFocusChangeRef.current = onFocusChange;
	onUndoRef.current = onUndo;
	onRedoRef.current = onRedo;

	useEffect(() => {
		const parent = hostRef.current;
		if (!parent) return;
		const initial = initialPropsRef.current;

		const compartments: EditorCompartments = {
			theme: new Compartment(),
			readOnly: new Compartment(),
			diagnostics: new Compartment(),
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
				EditorView.updateListener.of((update) => {
					if (!update.docChanged) return;
					if (update.transactions.some((transaction) => transaction.annotation(externalReplacement))) return;
					onChangeRef.current(update.state.doc.toString());
				}),
				compartments.theme.of(editorTheme(initial.theme === "dark")),
				compartments.readOnly.of(readOnlyExtensions(initial.readOnly)),
				compartments.diagnostics.of(diagnosticExtensions(initial.diagnostics)),
			],
		});
		viewRef.current = view;

		return () => {
			view.destroy();
			viewRef.current = null;
			compartmentsRef.current = null;
		};
	}, []);

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
		view.dispatch({ effects: compartments.diagnostics.reconfigure(diagnosticExtensions(diagnostics)) });
	}, [diagnostics]);

	useEffect(() => {
		const view = viewRef.current;
		if (!view || view.state.doc.toString() === value) return;
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: value },
			annotations: externalReplacement.of(true),
		});
	}, [value]);

	return <div ref={hostRef} className="h-full overflow-hidden rounded-md border text-xs" dir="ltr" />;
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
	const status = useStylesheetStore((state) => state.status);
	const canUndo = useStylesheetStore((state) => state.canUndo);
	const canRedo = useStylesheetStore((state) => state.canRedo);
	const setSourceText = useStylesheetStore((state) => state.setSourceText);
	const setFocused = useStylesheetStore((state) => state.setFocused);
	const activate = useStylesheetStore((state) => state.activate);
	const undo = useStylesheetStore((state) => state.undo);
	const redo = useStylesheetStore((state) => state.redo);
	const hasErrors = status === "error" || diagnostics.some(({ severity }) => severity === "error");
	const isChecking = status === "compiling" || status === "preflighting" || status === "saving";

	useEffect(
		() => () => {
			restoreDesktopRef.current?.();
		},
		[],
	);

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
			theme={theme}
			readOnly={readOnly}
			label={t`Semantic CSS stylesheet`}
			onChange={setSourceText}
			onFocusChange={setFocused}
			onUndo={undo}
			onRedo={redo}
		/>
	);

	return (
		<div className="space-y-3">
			{mode === "legacy" && <LegacyStylesheetBanner disabled={hasErrors || isChecking} onActivate={activate} />}

			<StylesheetToolbar
				source={source}
				canUndo={canUndo}
				canRedo={canRedo}
				focused={focusOpen}
				onUndo={undo}
				onRedo={redo}
				onReset={() => setSourceText(applied)}
				onFocusToggle={toggleFocus}
			/>

			{!(isMobile && focusOpen) && <div className={focusOpen ? "h-[calc(100svh-14rem)]" : "h-72"}>{editor}</div>}

			<StylesheetStatus status={status} diagnostics={diagnostics} />

			<Sheet open={isMobile && focusOpen} onOpenChange={setFocusOpen}>
				<SheetContent side="right" className="w-full max-w-full gap-3 p-4 sm:max-w-full">
					<SheetTitle>
						<Trans>Semantic CSS stylesheet</Trans>
					</SheetTitle>
					<div className="min-h-0 flex-1">{isMobile && focusOpen ? editor : null}</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}

export default StylesheetEditorShell;
