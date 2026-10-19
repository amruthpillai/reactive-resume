// @vitest-environment happy-dom
import { act, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEditorStore } from "../store";
import { ParserView } from "./parser-view";

type Span = { text: string; x: number; width: number; fontSize: number };
type Line = { text: string; spans: Span[] };

const mocks = vi.hoisted(() => ({
	resumeId: "A",
	extract: vi.fn(async (file: File) => file.text()),
	doc: { pages: [], lines: [] as Line[], charCount: 0 },
	semantics: {
		contact: { nameLine: "", locationLine: "", emails: [], phones: [], textUrls: [], annotationUrls: [] },
		dates: [],
		headings: [] as { lineIndex: number; text: string }[],
	},
}));
vi.mock("@/features/resume/builder/draft", () => ({
	useCurrentBuilderResumeSelector: (select: (resume: { id: string }) => unknown) => select({ id: mocks.resumeId }),
}));
vi.mock("./use-check", () => ({ useCheck: () => null }));
vi.mock("@/features/ats-checker/extract-client", () => ({ extractPdf: mocks.extract }));
vi.mock("@reactive-resume/resume/ats-pdf", () => ({
	buildExtractedDocument: (text: string) =>
		mocks.doc.lines.length > 0 ? mocks.doc : { pages: [], lines: [{ text }], charCount: text.length },
	buildResumeSemantics: () => mocks.semantics,
	// Same rule the real one uses: split the line's spans at a column-sized gap.
	columnSegments: (line: Line) => {
		const spans = line.spans ?? [];
		if (spans.length < 2) return [line];
		const groups: Span[][] = [[spans[0] as Span]];
		for (const span of spans.slice(1)) {
			const current = groups[groups.length - 1] as Span[];
			const previous = current[current.length - 1] as Span;
			const gap = span.x - (previous.x + previous.width);
			if (gap > Math.max(20, 2.5 * Math.max(previous.fontSize, span.fontSize, 1))) groups.push([span]);
			else current.push(span);
		}
		return groups.map((group) => ({ ...line, text: group.map((span) => span.text).join(" "), spans: group }));
	},
}));

it("extracts each document and each reopened render independently", async () => {
	i18n.load("en", {});
	i18n.activate("en");
	const client = new QueryClient();
	const open = (id: string, text: string) => {
		mocks.resumeId = id;
		useEditorStore.getState().reset();
		useEditorStore.getState().setRendered({ pageCount: 1, pageMap: undefined, file: new Blob([text]) });
	};
	const ui = (
		<QueryClientProvider client={client}>
			<I18nProvider i18n={i18n}>
				<ParserView />
			</I18nProvider>
		</QueryClientProvider>
	);
	open("A", "Resume Alpha");
	const view = render(ui);
	await screen.findByText("Resume Alpha");
	view.unmount();
	open("B", "Resume Beta");
	const second = render(ui);
	await screen.findByText("Resume Beta");
	expect(screen.queryByText("Resume Alpha")).toBeNull();
	second.unmount();
	open("A", "Changed Alpha");
	render(ui);
	await screen.findByText("Changed Alpha");
	expect(mocks.extract).toHaveBeenCalledTimes(3);
	await act(async () => {
		client.clear();
	});
});

/**
 * Regression for reactive-resume#3642: an extracted line can fuse several columns, and a parser can
 * recognise more than one piece of it as a heading. Showing one heading per line hid every other
 * column on the line, so only the rightmost column appeared to parse.
 */
it("shows every column of a line that holds headings", async () => {
	i18n.load("en", {});
	i18n.activate("en");
	mocks.doc = {
		pages: [],
		charCount: 1,
		lines: [
			{
				text: "Unity Engine Unreal Engine Programming Languages",
				spans: [
					{ text: "Unity Engine", x: 30, width: 60, fontSize: 10 },
					{ text: "Unreal Engine", x: 220, width: 60, fontSize: 10 },
					{ text: "Programming Languages", x: 410, width: 100, fontSize: 10 },
				],
			},
			{
				text: "Expert Advanced Expert",
				spans: [
					{ text: "Expert", x: 30, width: 30, fontSize: 10 },
					{ text: "Advanced", x: 220, width: 40, fontSize: 10 },
					{ text: "Expert", x: 410, width: 30, fontSize: 10 },
				],
			},
			{
				text: "Unity Certified Expert: Programmer March 2022",
				spans: [
					{ text: "Unity Certified Expert: Programmer", x: 16, width: 160, fontSize: 10 },
					{ text: "March 2022", x: 440, width: 50, fontSize: 10 },
				],
			},
		],
	};
	mocks.semantics.headings = [
		{ lineIndex: 0, text: "Unity Engine" },
		{ lineIndex: 0, text: "Unreal Engine" },
		{ lineIndex: 0, text: "Programming Languages" },
		{ lineIndex: 2, text: "Unity Certified Expert: Programmer" },
	];
	useEditorStore.getState().reset();
	useEditorStore.getState().setRendered({ pageCount: 1, pageMap: undefined, file: new Blob(["pdf"]) });
	const client = new QueryClient();
	render(
		<QueryClientProvider client={client}>
			<I18nProvider i18n={i18n}>
				<ParserView />
			</I18nProvider>
		</QueryClientProvider>,
	);

	// Every column piece of a flagged line is on the page — the earlier map kept only the last one.
	await screen.findByText("▸ UNITY ENGINE");
	expect(screen.getByText("▸ UNREAL ENGINE")).toBeTruthy();
	expect(screen.getByText("▸ PROGRAMMING LANGUAGES")).toBeTruthy();
	// A content piece beside a recognised heading still shows as a line, not swallowed by the group.
	expect(screen.getByText("March 2022")).toBeTruthy();
	expect(screen.getByText("Expert Advanced Expert")).toBeTruthy();
});
