// @vitest-environment happy-dom

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const downloadWithAnchor = vi.hoisted(() => vi.fn());
const buildDocx = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["x"], { type: "application/x-docx" })));
const createResumePdfBlob = vi.hoisted(() => vi.fn().mockResolvedValue(new Blob(["x"], { type: "application/pdf" })));

vi.mock("../shared/section-base", () => ({
	SectionBase: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor,
	generateFilename: (name: string, ext: string) => `${name}.${ext}`,
}));
vi.mock("@reactive-resume/utils/resume/docx", () => ({ buildDocx }));
vi.mock("@/libs/resume/pdf-document", () => ({ createResumePdfBlob }));
vi.mock("@/components/resume/builder-resume-draft", () => ({
	useResume: () => ({ id: "r1", name: "My Resume", data: defaultResumeData }),
}));

const { ExportSectionBuilder } = await import("./export");

beforeAll(() => {
	i18n.loadAndActivate({ locale: "en", messages: {} });
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

describe("ExportSectionBuilder", () => {
	it("renders JSON, DOCX, and PDF action buttons", () => {
		renderExport();
		expect(screen.getByText("JSON")).toBeInTheDocument();
		expect(screen.getByText("DOCX")).toBeInTheDocument();
		expect(screen.getByText("PDF")).toBeInTheDocument();
	});

	it("downloads a JSON blob when the JSON button is clicked", () => {
		renderExport();
		const button = screen.getByText("JSON").closest("button") as HTMLButtonElement;
		fireEvent.click(button);

		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		// biome-ignore lint/style/noNonNullAssertion: The assertion above verifies the download call exists before destructuring it.
		const [blob, filename] = downloadWithAnchor.mock.calls[0]!;
		expect(blob).toBeInstanceOf(Blob);
		expect((blob as Blob).type).toBe("application/json");
		expect(filename).toBe("My Resume.json");
	});

	it("calls buildDocx and downloads the resulting blob when DOCX is clicked", async () => {
		renderExport();
		const button = screen.getByText("DOCX").closest("button") as HTMLButtonElement;

		fireEvent.click(button);
		// Wait for the async callback chain to settle.
		await Promise.resolve();
		await Promise.resolve();

		expect(buildDocx).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor.mock.calls[0]?.[1]).toBe("My Resume.docx");
	});

	it("calls createResumePdfBlob and downloads when PDF is clicked", async () => {
		renderExport();
		const button = screen.getByText("PDF").closest("button") as HTMLButtonElement;

		fireEvent.click(button);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(createResumePdfBlob).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor).toHaveBeenCalledTimes(1);
		expect(downloadWithAnchor.mock.calls[0]?.[1]).toBe("My Resume.pdf");
	});
});
