import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { renderPreflightPdf } from "./preflight-core";

const rendererMock = vi.hoisted(() => ({
	pdf: vi.fn(() => ({
		toBlob: vi.fn(async () => new Blob(["%PDF-1.7"], { type: "application/pdf" })),
	})),
}));

vi.mock("@react-pdf/renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	pdf: rendererMock.pdf,
}));

const validStylesheet = {
	languageVersion: 1,
	text: "@rr-version 1;",
} as const;

const pageLimits = {
	maxPageWidthPt: 2_000,
	maxPageHeightPt: 20_000,
	maxPageAreaPt2: 20_000_000,
} as const;

describe("renderPreflightPdf", () => {
	beforeEach(() => {
		rendererMock.pdf.mockClear();
	});

	it("renders a valid semantic candidate to transferable PDF bytes", async () => {
		const result = await renderPreflightPdf(
			{
				data: defaultResumeData,
				template: defaultResumeData.metadata.template,
				stylesheet: validStylesheet,
			},
			pageLimits,
		);

		expect(result).toMatchObject({ ok: true, diagnostics: [] });
		expect(result.ok && new TextDecoder().decode(result.bytes)).toBe("%PDF-1.7");
		expect(rendererMock.pdf).toHaveBeenCalledTimes(1);
	});

	it("returns compiler diagnostics without starting the renderer", async () => {
		const result = await renderPreflightPdf(
			{
				data: defaultResumeData,
				template: defaultResumeData.metadata.template,
				stylesheet: { languageVersion: 1, text: "@rr-version 1; page { color: ; }" },
			},
			pageLimits,
		);

		expect(result).toMatchObject({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_INVALID",
			diagnostics: [expect.objectContaining({ severity: "error" })],
		});
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});

	it("returns a stable public failure when React PDF throws", async () => {
		rendererMock.pdf.mockReturnValueOnce({
			toBlob: vi.fn(() => Promise.reject(new Error("sensitive renderer details"))),
		});

		const result = await renderPreflightPdf(
			{
				data: defaultResumeData,
				template: defaultResumeData.metadata.template,
				stylesheet: validStylesheet,
			},
			pageLimits,
		);

		expect(result).toMatchObject({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_RENDER_FAILED",
			message: "PDF rendering failed.",
			diagnostics: [],
		});
	});

	it.each([
		["width", "2001pt 1000pt"],
		["height", "1000pt 20001pt"],
		["area", "1500pt 15000pt"],
	])("rejects authored page %s limits before starting the renderer", async (_limit, size) => {
		const result = await renderPreflightPdf(
			{
				data: defaultResumeData,
				template: defaultResumeData.metadata.template,
				stylesheet: { languageVersion: 1, text: `@rr-version 1; page { size: ${size}; }` },
			},
			pageLimits,
		);

		expect(result).toMatchObject({
			ok: false,
			code: "STYLESHEET_PREFLIGHT_PAGE_SIZE_LIMIT",
		});
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});
});
