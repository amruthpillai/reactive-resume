// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { useResumeExport } from "./use-resume-export";

const mocks = vi.hoisted(() => ({
	createResumePdfBlob: vi.fn(async () => new Blob(["local"], { type: "application/pdf" })),
	downloadWithAnchor: vi.fn(),
	fetch: vi.fn(async (_input: string | URL) => new Response(new Blob(["server"], { type: "application/pdf" }))),
	toastAdd: vi.fn(() => "toast"),
	recordDownload: vi.fn(async () => true),
}));

vi.mock("@/libs/orpc/client", () => ({
	client: { resume: { statistics: { recordDownload: mocks.recordDownload } } },
}));

vi.mock("@/features/resume/export/pdf-document", () => ({
	createResumePdfBlob: mocks.createResumePdfBlob,
}));
vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor: mocks.downloadWithAnchor,
	generateFilename: (name: string, extension: string) => `${name}.${extension}`,
}));
vi.mock("@reactive-resume/ui/components/toast", () => ({
	toast: {
		add: mocks.toastAdd,
		close: vi.fn(),
	},
}));

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

beforeEach(() => {
	mocks.createResumePdfBlob.mockClear();
	mocks.downloadWithAnchor.mockClear();
	mocks.fetch.mockClear();
	mocks.toastAdd.mockClear();
	mocks.recordDownload.mockClear();
	vi.stubGlobal("fetch", mocks.fetch);
});

describe("useResumeExport public PDF", () => {
	it("downloads the authorized server blob after public browser rendering rejects", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const source = { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source };
		mocks.createResumePdfBlob.mockRejectedValueOnce(new Error("browser renderer failed"));
		const { result } = renderHook(() =>
			useResumeExport(
				{ name: "Sample", slug: "sample", data: semanticData },
				{
					publicResumePdf: {
						publicResume: { username: "amruth", slug: "sample" },
					},
				},
			),
		);

		await act(() => result.current.onDownloadPDF());

		expect(mocks.createResumePdfBlob).toHaveBeenCalledWith(semanticData);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
		const blob = mocks.downloadWithAnchor.mock.calls[0]?.[0] as Blob;
		expect(await blob.text()).toBe("server");
		expect(mocks.recordDownload).toHaveBeenCalledExactlyOnceWith({ username: "amruth", slug: "sample" });
	});

	const publicResume = { username: "amruth", slug: "sample" };
	const resume = { name: "Sample", slug: "sample", data: sampleResumeData };

	it("records a public download only after handing the PDF to the browser", async () => {
		const { result } = renderHook(() => useResumeExport(resume, { publicResumePdf: { publicResume } }));
		expect(mocks.recordDownload).not.toHaveBeenCalled();

		await act(() => result.current.onDownloadPDF());

		expect(mocks.recordDownload).toHaveBeenCalledExactlyOnceWith(publicResume);
		expect(mocks.downloadWithAnchor.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.recordDownload.mock.invocationCallOrder[0] ?? 0,
		);
	});

	it("does not record exports from the builder", async () => {
		const { result } = renderHook(() => useResumeExport(resume));
		await act(() => result.current.onDownloadPDF());
		expect(mocks.downloadWithAnchor).toHaveBeenCalledOnce();
		expect(mocks.recordDownload).not.toHaveBeenCalled();
	});

	it("does not record a failed browser download", async () => {
		mocks.downloadWithAnchor.mockImplementationOnce(() => {
			throw new Error("download failed");
		});
		const { result } = renderHook(() => useResumeExport(resume, { publicResumePdf: { publicResume } }));
		await act(() => result.current.onDownloadPDF());
		expect(mocks.recordDownload).not.toHaveBeenCalled();
		expect(mocks.toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
	});

	it("keeps a successful download successful when recording statistics fails", async () => {
		mocks.recordDownload.mockRejectedValueOnce(new Error("statistics unavailable"));
		const { result } = renderHook(() => useResumeExport(resume, { publicResumePdf: { publicResume } }));
		await act(() => result.current.onDownloadPDF());
		expect(mocks.downloadWithAnchor).toHaveBeenCalledOnce();
		expect(mocks.recordDownload).toHaveBeenCalledOnce();
		expect(mocks.toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
		expect(result.current.isExporting).toBe(false);
	});

	it("keeps owner PDF exports available when public download buttons are hidden", async () => {
		const resume = { name: "Owner", slug: "owner", data: sampleResumeData, showDownloadButtons: false };
		const { result } = renderHook(() => useResumeExport(resume));
		await act(() => result.current.onDownloadPDF());
		expect(mocks.downloadWithAnchor).toHaveBeenCalledTimes(1);
		expect(mocks.fetch).not.toHaveBeenCalled();
	});

	it("does not download a PDF when the renderer rejects", async () => {
		mocks.createResumePdfBlob.mockRejectedValueOnce(new Error("PDF renderer failed"));
		const { result } = renderHook(() => useResumeExport({ name: "Sample", slug: "sample", data: sampleResumeData }));

		await act(() => result.current.onDownloadPDF());

		expect(mocks.downloadWithAnchor).not.toHaveBeenCalled();
		expect(mocks.toastAdd).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
	});
});
