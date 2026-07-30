// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n } from "@lingui/core";
import { createPublicStyleProjection } from "@reactive-resume/pdf/public-projection";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { useResumeExport } from "./use-resume-export";

const mocks = vi.hoisted(() => ({
	createResumePdfBlob: vi.fn(async () => new Blob(["local"], { type: "application/pdf" })),
	downloadWithAnchor: vi.fn(),
	fetch: vi.fn(async (_input: string | URL) => new Response(new Blob(["server"], { type: "application/pdf" }))),
	toastError: vi.fn(),
}));

vi.mock("./pdf-document", () => ({
	createResumePdfBlob: mocks.createResumePdfBlob,
}));
vi.mock("@reactive-resume/utils/file", () => ({
	downloadWithAnchor: mocks.downloadWithAnchor,
	generateFilename: (name: string, extension: string) => `${name}.${extension}`,
}));
vi.mock("@/features/resume/stylesheet/store", () => ({
	useStylesheetStore: (selector: (state: object) => unknown) =>
		selector({
			resumeId: undefined,
			mode: "legacy",
			source: { languageVersion: 1, text: "@version 1;\n" },
			applied: { languageVersion: 1, text: "@version 1;\n" },
		}),
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
	it("downloads the authorized server blob after one mismatched-projection refetch", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const source = { languageVersion: 1, text: "@version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source, applied: source };
		const projection = await createPublicStyleProjection({ data: semanticData });
		const mismatchedProjection = { ...projection, renderDataHash: "0".repeat(64) };
		const refetchStyleProjection = vi.fn(async () => mismatchedProjection);
		const { result } = renderHook(() =>
			useResumeExport(
				{ name: "Sample", slug: "sample", data: sampleResumeData },
				{
					publicResumePdf: {
						stylesheetMode: "semantic",
						styleProjection: mismatchedProjection,
						refetchStyleProjection,
						publicResume: { username: "amruth", slug: "sample" },
					},
				},
			),
		);

		await act(() => result.current.onDownloadPDF());

		expect(refetchStyleProjection).toHaveBeenCalledTimes(1);
		expect(mocks.fetch).toHaveBeenCalledTimes(1);
		expect(mocks.createResumePdfBlob).not.toHaveBeenCalled();
		const blob = mocks.downloadWithAnchor.mock.calls[0]?.[0] as Blob;
		expect(await blob.text()).toBe("server");
	});

	it("does not download an unstyled PDF when semantic rendering rejects", async () => {
		mocks.createResumePdfBlob.mockRejectedValueOnce(
			new Error("The semantic stylesheet could not be rendered.", {
				cause: [{ code: "RESOURCE_LIMIT", severity: "error" }],
			}),
		);
		const { result } = renderHook(() => useResumeExport({ name: "Sample", slug: "sample", data: sampleResumeData }));

		await act(() => result.current.onDownloadPDF());

		expect(mocks.downloadWithAnchor).not.toHaveBeenCalled();
		expect(mocks.toastError).toHaveBeenCalledTimes(1);
	});
});
