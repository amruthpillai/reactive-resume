import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { renderPreflightPdf } from "./preflight-core";

const rendererMock = vi.hoisted(() => ({
	pdf: vi.fn(() => ({
		toBlob: vi.fn(async () => new Blob(["%PDF-1.7"], { type: "application/pdf" })),
	})),
}));

vi.mock("#react-pdf-renderer", async (importOriginal) => ({
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

const createRendererUnsafeResumeData = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.customSections = [
		{
			id: "custom-experience",
			type: "experience",
			title: "Experience",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "summary-shaped-item", hidden: false, content: "<p>Missing company</p>" }],
		} as never,
	];
	return data;
};

const createLegacyRendererSafeResumeData = (): ResumeData =>
	({
		...structuredClone(defaultResumeData),
		customSections: [
			{
				id: "custom-experience",
				type: "experience",
				title: "Experience",
				icon: "",
				columns: 1,
				hidden: false,
				keepTogether: false,
				startOnNewPage: false,
				items: [
					{
						id: "experience-item",
						hidden: false,
						company: "Analytical Engines",
						position: "Programmer",
						location: "London",
						period: "1842–1843",
						description: "<p>Wrote the first algorithm.</p>",
						content: "<p>Compatible overlap</p>",
					},
				],
			},
		],
	}) as unknown as ResumeData;

describe("renderPreflightPdf", () => {
	beforeEach(() => {
		rendererMock.pdf.mockReset();
		rendererMock.pdf.mockImplementation(() => ({
			toBlob: vi.fn(async () => new Blob(["%PDF-1.7"], { type: "application/pdf" })),
		}));
	});

	it("renders a valid semantic candidate to transferable PDF bytes", async () => {
		const result = await renderPreflightPdf(
			{
				data: createLegacyRendererSafeResumeData(),
				template: defaultResumeData.metadata.template,
				stylesheet: validStylesheet,
			},
			pageLimits,
		);

		expect(result).toMatchObject({ ok: true, diagnostics: [] });
		expect(result.ok && new TextDecoder().decode(result.bytes)).toBe("%PDF-1.7");
		expect(rendererMock.pdf).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					data: expect.objectContaining({
						customSections: [
							expect.objectContaining({
								items: [
									expect.objectContaining({
										content: "<p>Compatible overlap</p>",
										roles: [],
										website: { url: "", label: "", inlineLink: false },
									}),
								],
							}),
						],
					}),
				}),
			}),
		);
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

	it("rejects renderer-unsafe data before semantic inspection or React PDF dispatch", async () => {
		const result = renderPreflightPdf(
			{
				data: createRendererUnsafeResumeData(),
				template: defaultResumeData.metadata.template,
				stylesheet: validStylesheet,
			},
			pageLimits,
		);

		await expect(result).rejects.toMatchObject({
			name: "ZodError",
			issues: expect.arrayContaining([expect.objectContaining({ path: ["customSections", 0, "items", 0, "company"] })]),
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
