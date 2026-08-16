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
	toastError: vi.fn(),
}));

vi.mock("@/features/resume/export/pdf-document", () => ({
	createResumePdfBlob: mocks.createResumePdfBlob,
}));
vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor: mocks.downloadWithAnchor,
	generateFilename: (name: string, extension: string) => `${name}.${extension}`,
}));
vi.mock("sonner", () => ({
	toast: {
		loading: vi.fn(() => "toast"),
		error: mocks.toastError,
		dismiss: vi.fn(),
	},
}));

beforeAll(() => i18n.loadAndActivate({ locale: "en", messages: {} }));

beforeEach(() => {
	mocks.createResumePdfBlob.mockClear();
	mocks.downloadWithAnchor.mockClear();
	mocks.fetch.mockClear();
	mocks.toastError.mockClear();
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
	});

	it("does not download a PDF when the renderer rejects", async () => {
		mocks.createResumePdfBlob.mockRejectedValueOnce(new Error("PDF renderer failed"));
		const { result } = renderHook(() => useResumeExport({ name: "Sample", slug: "sample", data: sampleResumeData }));

		await act(() => result.current.onDownloadPDF());

		expect(mocks.downloadWithAnchor).not.toHaveBeenCalled();
		expect(mocks.toastError).toHaveBeenCalledTimes(1);
	});
});
