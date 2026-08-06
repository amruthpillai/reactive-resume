// @vitest-environment happy-dom

import type { SemanticCssDiagnostic } from "@reactive-resume/resume/stylesheet";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EditorView } from "@codemirror/view";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { TooltipProvider } from "@reactive-resume/ui/components/tooltip";
import StylesheetEditorShell, { StylesheetCodeEditor } from "./editor";
import { LegacyStylesheetBanner } from "./legacy-banner";
import { StylesheetStatus } from "./status";
import { useStylesheetStore } from "./store";

const media = vi.hoisted(() => ({ mobile: false }));

vi.mock("usehooks-ts", async (importOriginal) => ({
	...(await importOriginal<typeof import("usehooks-ts")>()),
	useMediaQuery: () => media.mobile,
}));

vi.mock("@/features/theme/provider", () => ({
	useTheme: () => ({ theme: "light" }),
}));

const error: SemanticCssDiagnostic = {
	code: "SEMANTIC_CSS_UNKNOWN_PROPERTY",
	severity: "error",
	message: "Unknown property",
	range: {
		start: { line: 2, column: 3, offset: 17 },
		end: { line: 2, column: 9, offset: 23 },
	},
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

const renderWithI18n = (element: React.ReactNode) => render(<I18nProvider i18n={i18n}>{element}</I18nProvider>);

describe("stylesheet editor status", () => {
	it("shows that invalid source keeps the last valid preview", () => {
		renderWithI18n(<StylesheetStatus mode="semantic" status="error" diagnostics={[error]} />);

		expect(screen.getByText(/preview and export use the last valid version/i)).toBeInTheDocument();
		expect(screen.getByText("Unknown property")).toBeInTheDocument();
	});

	it("labels a valid legacy draft as ready to activate", () => {
		renderWithI18n(<StylesheetStatus mode="legacy" status="idle" diagnostics={[]} />);

		expect(screen.getByText("Ready to activate")).toBeInTheDocument();
		expect(screen.queryByText("Applied")).not.toBeInTheDocument();
	});

	it("labels legacy warnings without claiming they are applied", () => {
		renderWithI18n(<StylesheetStatus mode="legacy" status="idle" diagnostics={[{ ...error, severity: "warning" }]} />);

		expect(screen.getByText("Ready to activate with warnings")).toBeInTheDocument();
		expect(screen.queryByText("Applied with warnings")).not.toBeInTheDocument();
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
					diagnostics={[error]}
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

	it("makes the editor and mutation controls read-only while a restore is pending", () => {
		media.mobile = false;
		useStylesheetStore.setState({
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1;\n" },
			applied: { languageVersion: 1, text: "@version 1;\n" },
			diagnostics: [],
			status: "idle",
			canUndo: true,
			canRedo: true,
			restoreLocked: true,
		});

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
		expect(screen.getByRole("button", { name: "Reset to applied stylesheet" })).toBeDisabled();
	});

	it("moves the only visible editor into a titled mobile sheet", async () => {
		media.mobile = true;
		useStylesheetStore.setState({
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1;\n" },
			applied: { languageVersion: 1, text: "@version 1;\n" },
			diagnostics: [{ ...error, severity: "warning" }],
			status: "idle",
			restoreLocked: false,
		});

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
		expect(within(sheet).getByText("Ready to activate with warnings")).toBeInTheDocument();
		expect(within(sheet).getByText("Unknown property")).toBeInTheDocument();
		expectGuideLink(sheet);
		expect(document.querySelectorAll(".cm-editor")).toHaveLength(1);
		media.mobile = false;
	});
});
