// @vitest-environment happy-dom

import type { SemanticCssDiagnostic, StyleProgram } from "@reactive-resume/resume/stylesheet";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { TooltipProvider } from "@reactive-resume/ui/components/tooltip";
import StylesheetEditorShell, { StylesheetCodeEditor } from "./editor";
import { LegacyStylesheetBanner } from "./legacy-banner";
import { StylesheetStatus } from "./status";

const media = vi.hoisted(() => ({ mobile: false }));
const compileWorker = vi.hoisted(() => ({
	program: { languageVersion: 1, rules: [] } as StyleProgram | null,
	diagnostics: [] as SemanticCssDiagnostic[],
}));
const builder = vi.hoisted(() => ({
	canUndo: false,
	canRedo: false,
	data: undefined as typeof defaultResumeData | undefined,
	isLocked: false,
	undo: vi.fn(),
	redo: vi.fn(),
}));

vi.mock("usehooks-ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("usehooks-ts")>()),
	useMediaQuery: () => media.mobile,
}));

vi.mock("@/features/theme/provider", () => ({
	useTheme: () => ({ theme: "light" }),
}));

vi.mock("@/features/resume/builder/draft", () => ({
	useResumeData: () => builder.data,
	useIsResumeLocked: () => builder.isLocked,
	useUpdateResumeData: () => (update: (draft: typeof defaultResumeData) => void) => {
		if (builder.data) update(builder.data);
	},
	useResumeStore: (selector: (state: object) => unknown) =>
		selector({ canUndo: builder.canUndo, canRedo: builder.canRedo, undo: builder.undo, redo: builder.redo }),
}));

vi.mock("./worker-client", () => ({
	createCompileWorkerClient: () => ({
		compile: vi.fn(async ({ editGeneration }: { editGeneration: number }) => ({
			type: "compile_result",
			requestId: editGeneration,
			editGeneration,
			program: compileWorker.program,
			diagnostics: compileWorker.diagnostics,
			colorTokens: [],
		})),
		destroy: vi.fn(),
	}),
}));

const recoverableError: SemanticCssDiagnostic = {
	code: "INVALID_VALUE",
	severity: "error",
	message: "Invalid value",
	range: {
		start: { line: 2, column: 3, offset: 17 },
		end: { line: 2, column: 9, offset: 23 },
	},
};

const fatalError: SemanticCssDiagnostic = {
	...recoverableError,
	code: "VERSION_MISMATCH",
	message: "Version mismatch",
};

const resolutionError: SemanticCssDiagnostic = {
	...recoverableError,
	code: "UNRESOLVED_VARIABLE",
	message: "Undefined variable --missing",
};

const guideName = /read the applying custom styles guide.*opens in new tab/i;

const expectGuideLink = (root: HTMLElement) => {
	const link = within(root).getByRole("link", { name: guideName });
	expect(link).toHaveAttribute("href", "https://docs.rxresu.me/applying-custom-styles");
	expect(link).toHaveAttribute("target", "_blank");
	expect(link).toHaveAttribute("rel", "noopener noreferrer");
};

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
	Object.defineProperty(Element.prototype, "getAnimations", { configurable: true, value: () => [] });
});

beforeEach(() => {
	media.mobile = false;
	builder.data = structuredClone(defaultResumeData);
	builder.isLocked = false;
	builder.canUndo = false;
	builder.canRedo = false;
	builder.undo.mockReset();
	builder.redo.mockReset();
	compileWorker.program = { languageVersion: 1, rules: [] };
	compileWorker.diagnostics = [];
});

const renderWithI18n = (element: React.ReactNode) => render(<I18nProvider i18n={i18n}>{element}</I18nProvider>);

describe("stylesheet editor status", () => {
	it("explains that fatal source falls back to base styles", () => {
		renderWithI18n(<StylesheetStatus mode="semantic" status="idle" diagnostics={[fatalError]} />);

		expect(screen.getByText(/preview and export fall back to base styles/i)).toBeInTheDocument();
		expect(screen.getByText("Version mismatch")).toBeInTheDocument();
	});

	it("explains that recoverable errors preserve valid styles", () => {
		renderWithI18n(<StylesheetStatus mode="semantic" status="idle" diagnostics={[recoverableError]} />);

		expect(screen.getByText("Valid with errors")).toBeInTheDocument();
		expect(screen.getByText(/preview and export keep valid styles/i)).toBeInTheDocument();
		expect(screen.queryByText(/fall back to base styles/i)).not.toBeInTheDocument();
	});

	it("labels a valid legacy draft as ready to activate", () => {
		renderWithI18n(<StylesheetStatus mode="legacy" status="idle" diagnostics={[]} />);

		expect(screen.getByText("Ready to activate")).toBeInTheDocument();
	});

	it("labels a legacy draft with warnings as ready to activate", () => {
		renderWithI18n(
			<StylesheetStatus mode="legacy" status="idle" diagnostics={[{ ...recoverableError, severity: "warning" }]} />,
		);

		expect(screen.getByText("Ready to activate with warnings")).toBeInTheDocument();
	});

	it("disables activation while the converted draft has errors", () => {
		renderWithI18n(<LegacyStylesheetBanner disabled onActivate={vi.fn()} />);

		expect(screen.getByRole("button", { name: /activate semantic css/i })).toBeDisabled();
	});
});

describe("StylesheetCodeEditor", () => {
	it("owns one LTR EditorView and ignores externally replaced documents", () => {
		const onChange = vi.fn();
		const destroy = vi.spyOn(EditorView.prototype, "destroy");
		const props = {
			diagnostics: [] as const,
			theme: "light" as const,
			onChange,
			onUndo: vi.fn(),
			onRedo: vi.fn(),
		};
		const { container, rerender, unmount } = render(
			<div style={{ height: 200 }}>
				<StylesheetCodeEditor value="@version 1;\n" {...props} />
			</div>,
		);

		expect(container.querySelectorAll(".cm-editor")).toHaveLength(1);
		expect(container.querySelector(".cm-editor")).toHaveAttribute("dir", "ltr");
		expect(screen.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toHaveAttribute("dir", "ltr");

		rerender(
			<div style={{ height: 200 }}>
				<StylesheetCodeEditor value={"@version 1;\nsection { color: red; }\n"} {...props} />
			</div>,
		);

		expect(onChange).not.toHaveBeenCalled();
		expect(screen.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toHaveTextContent("color: red");

		rerender(
			<div style={{ height: 200 }}>
				<StylesheetCodeEditor
					value={"@version 1;\nsection { color: red; }\n"}
					{...props}
					diagnostics={[recoverableError]}
					theme="dark"
					readOnly
				/>
			</div>,
		);

		expect(screen.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toHaveAttribute(
			"contenteditable",
			"false",
		);
		expect(container.querySelector(".cm-gutter-lint")).toBeInTheDocument();

		unmount();
		expect(destroy).toHaveBeenCalledOnce();
		destroy.mockRestore();
	});

	it("reuses one React color picker for compiler-confirmed swatches", async () => {
		const source = "section { color: #f00; background-color: #fff; }";
		const first = source.indexOf("#f00");
		const second = source.indexOf("#fff");
		const { container } = render(
			<StylesheetCodeEditor
				value={source}
				diagnostics={[]}
				colorTokens={[
					{ from: first, to: first + 4, value: "#f00" },
					{ from: second, to: second + 4, value: "#fff" },
				]}
				theme="light"
				onChange={vi.fn()}
				onUndo={vi.fn()}
				onRedo={vi.fn()}
			/>,
		);
		const swatches = container.querySelectorAll<HTMLButtonElement>(".semantic-css-color-swatch");
		expect(swatches).toHaveLength(2);

		swatches[0]?.click();
		await waitFor(() => expect(container.querySelectorAll("[data-semantic-css-color-picker-trigger]")).toHaveLength(1));
		swatches[1]?.click();
		await waitFor(() => expect(container.querySelectorAll("[data-semantic-css-color-picker-trigger]")).toHaveLength(1));
	});
});

describe("StylesheetEditorShell", () => {
	it("links desktop editor help to the Semantic CSS language reference", () => {
		media.mobile = false;
		const { container } = render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		expectGuideLink(container);
	});

	it("has no apply or save action for an already-semantic stylesheet", async () => {
		if (!builder.data) throw new Error("Missing resume fixture");
		builder.data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\n" },
		};

		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		await screen.findByText("Valid");
		expect(screen.queryByRole("button", { name: /activate semantic css/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /save|apply/i })).not.toBeInTheDocument();
	});

	it("writes semantic edits into the ordinary resume draft immediately", () => {
		if (!builder.data) throw new Error("Missing resume fixture");
		builder.data.metadata.stylesheet = {
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\n" },
		};

		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);
		const textbox = screen.getByRole("textbox", { name: "Semantic CSS stylesheet" });
		const view = EditorView.findFromDOM(textbox);
		if (!view) throw new Error("Missing editor view");

		act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: "name { color: blue; }\n" } }));

		expect(builder.data.metadata.stylesheet.source.text).toBe("@version 1;\nname { color: blue; }\n");
	});

	it("switches a converted legacy draft through the ordinary resume update", async () => {
		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		const activate = await screen.findByRole("button", { name: "Activate Semantic CSS" });
		await waitFor(() => expect(activate).toBeEnabled());
		fireEvent.click(activate);

		expect(builder.data?.metadata.stylesheet).toEqual({
			mode: "semantic",
			source: { languageVersion: 1, text: "@version 1;\n" },
		});
	});

	it("allows a converted legacy draft with recoverable errors to activate", async () => {
		compileWorker.diagnostics = [resolutionError];

		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		const activate = await screen.findByRole("button", { name: "Activate Semantic CSS" });
		await waitFor(() => expect(activate).toBeEnabled());
		fireEvent.click(activate);

		expect(builder.data?.metadata.stylesheet?.mode).toBe("semantic");
	});

	it("keeps legacy activation disabled for fatal diagnostics", async () => {
		compileWorker.diagnostics = [fatalError];

		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		await screen.findByText("Fatal error");
		expect(screen.getByRole("button", { name: "Activate Semantic CSS" })).toBeDisabled();
	});

	it("makes editor mutation controls read-only while the resume is locked", () => {
		builder.isLocked = true;
		builder.canUndo = true;
		builder.canRedo = true;

		render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		expect(screen.getByRole("textbox", { name: "Semantic CSS stylesheet" })).toHaveAttribute(
			"contenteditable",
			"false",
		);
		expect(screen.getByRole("button", { name: "Activate Semantic CSS" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Undo stylesheet edit" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Redo stylesheet edit" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "Format stylesheet" })).toBeDisabled();
	});

	it("moves the only visible editor into a titled mobile sheet", async () => {
		media.mobile = true;

		const { container } = render(
			<I18nProvider i18n={i18n}>
				<TooltipProvider>
					<StylesheetEditorShell />
				</TooltipProvider>
			</I18nProvider>,
		);

		expect(container.querySelectorAll(".cm-editor")).toHaveLength(1);
		fireEvent.click(screen.getByRole("button", { name: "Open focus mode" }));

		const sheet = await screen.findByRole("dialog");
		expect(within(sheet).getByRole("heading", { name: "Semantic CSS stylesheet" })).toBeInTheDocument();
		expect(within(sheet).getByRole("button", { name: "Activate Semantic CSS" })).toBeInTheDocument();
		expect(within(sheet).getByRole("toolbar", { name: "Stylesheet editor" })).toBeInTheDocument();
		await within(sheet).findByText("Ready to activate");
		expectGuideLink(sheet);
		expect(document.querySelectorAll(".cm-editor")).toHaveLength(1);
		media.mobile = false;
	});
});
