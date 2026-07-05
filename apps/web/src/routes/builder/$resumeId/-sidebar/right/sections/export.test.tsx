// @vitest-environment happy-dom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const downloadWithAnchor = vi.hoisted(() => vi.fn());
const buildDocx = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["x"], { type: "application/x-docx" })));
const createResumePdfBlob = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["x"], { type: "application/pdf" })));
const resumeMock = vi.hoisted(() => ({
	resume: undefined as
		| undefined
		| {
				id: string;
				name: string;
				slug: string;
				data: typeof defaultResumeData;
		  },
}));

type SectionBaseProps = {
	children: React.ReactNode;
};

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: SectionBaseProps) => <div>{children}</div>,
}));
vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor,
	generateFilename: (name: string, ext: string) => `${name}.${ext}`,
}));
vi.mock("@reactive-resume/docx", () => ({ buildDocx }));
vi.mock("@/features/resume/export/pdf-document", () => ({ createResumePdfBlob }));
// DOCX/Markdown resolve locale-aware section titles; stub the async locale resolver so exports
// fall back to the built-in English titles without loading real locale catalogs.
vi.mock("@/libs/resume/section-title-locale", () => ({
	createSectionTitleResolverForLocale: vi.fn().mockResolvedValue(() => undefined),
}));
vi.mock("@/features/resume/builder/draft", () => ({
	useResume: () => resumeMock.resume,
}));

const { ExportSectionBuilder } = await import("./export");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
});

beforeEach(() => {
	resumeMock.resume = { id: "r1", name: "My Resume", slug: "my-resume", data: defaultResumeData };
});

afterEach(() => {
	downloadWithAnchor.mockReset();
	buildDocx.mockClear();
	createResumePdfBlob.mockClear();
});

const renderExport = () =>
	render(
		<I18nProvider i18n={i18n}>
			<ExportSectionBuilder />
		</I18nProvider>,
	);

const openDialog = () => {
	const trigger = screen.getByText(
		"Choose PDF, DOCX, or JSON. Export your resume and cover letter separately when available.",
	);
	fireEvent.click(trigger.closest("button") as HTMLButtonElement);
};

describe("ExportSectionBuilder", () => {
	it("renders the PDF, DOCX, Markdown, and JSON format rows", () => {
		renderExport();
		openDialog();

		expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Download DOCX" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Download Markdown" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Download JSON" })).toBeInTheDocument();
	});

	it("downloads a Markdown blob when the Markdown button is clicked", async () => {
		renderExport();
		openDialog();
		fireEvent.click(screen.getByRole("button", { name: "Download Markdown" }));

		await waitFor(() => expect(downloadWithAnchor).toHaveBeenCalledTimes(1));
		// biome-ignore lint/style/noNonNullAssertion: The assertion above verifies the download call exists before destructuring it.
		const [blob, filename] = downloadWithAnchor.mock.calls[0]!;
		expect((blob as Blob).type).toBe("text/markdown");
		expect(filename).toBe("My Resume.md");
	});

	it("downloads a JSON blob when the JSON button is clicked", () => {
		renderExport();
		openDialog();
		fireEvent.click(screen.getByRole("button", { name: "Download JSON" }));

		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		// biome-ignore lint/style/noNonNullAssertion: The assertion above verifies the download call exists before destructuring it.
		const [blob, filename] = downloadWithAnchor.mock.calls[0]!;
		expect(blob).toBeInstanceOf(Blob);
		expect((blob as Blob).type).toBe("application/json");
		expect(filename).toBe("My Resume.json");
	});

	it("calls buildDocx and downloads the resulting blob when DOCX is clicked", async () => {
		renderExport();
		openDialog();
		fireEvent.click(screen.getByRole("button", { name: "Download DOCX" }));

		await waitFor(() => expect(buildDocx).toHaveBeenCalledTimes(1));
		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor.mock.calls[0]?.[1]).toBe("My Resume.docx");
	});

	it("calls createResumePdfBlob and downloads when PDF is clicked", async () => {
		renderExport();
		openDialog();
		fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(createResumePdfBlob).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor.mock.calls[0]?.[1]).toBe("My Resume.pdf");
	});

	it("exports the cover letter when the scope is switched and a cover letter exists", async () => {
		resumeMock.resume = { id: "r1", name: "My Resume", slug: "my-resume", data: sampleResumeData };
		renderExport();
		openDialog();

		fireEvent.click(screen.getByRole("tab", { name: "Cover letter" }));
		fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(createResumePdfBlob).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor.mock.calls[0]?.[1]).toBe("My Resume Cover Letter.pdf");
	});
});
