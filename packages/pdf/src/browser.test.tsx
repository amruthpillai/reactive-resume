import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SectionTitleResolver } from "./section-title";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { createPublicStyleProjection } from "./semantic/public-projection";

const rendererMock = vi.hoisted(() => ({
	pdf: vi.fn(() => ({
		toBlob: vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })),
	})),
}));

vi.mock("#react-pdf-renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	pdf: rendererMock.pdf,
}));

vi.mock("./document", () => ({
	ResumeDocument: () => null,
}));

const createLegacyRendererSafeResumeData = (): ResumeData =>
	({
		...structuredClone(sampleResumeData),
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

const createRendererUnsafeResumeData = (): ResumeData => {
	const data = createLegacyRendererSafeResumeData();
	const section = data.customSections[0];
	if (!section) throw new Error("Expected a custom section fixture.");
	section.items = [{ id: "summary-item", hidden: false, content: "<p>Missing company</p>" }] as never;
	return data;
};

describe("createResumePdfBlob", () => {
	beforeEach(() => {
		rendererMock.pdf.mockClear();
	});

	it("renders ResumeDocument with data, template, and section title resolver", async () => {
		const resolveSectionTitle: SectionTitleResolver = (input) => input.defaultEnglishTitle ?? input.sectionId;
		const { createResumePdfBlob } = await import("./browser");
		const data = createLegacyRendererSafeResumeData();

		const blob = await createResumePdfBlob({
			data,
			template: "azurill",
			resolveSectionTitle,
		});

		expect(blob.type).toBe("application/pdf");
		expect(rendererMock.pdf).toHaveBeenCalledTimes(1);
		expect(rendererMock.pdf).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					template: "azurill",
					resolveSectionTitle,
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

	it("rejects renderer-unsafe data before browser PDF dispatch", async () => {
		const { createResumePdfBlob } = await import("./browser");

		const error = await createResumePdfBlob({ data: createRendererUnsafeResumeData() }).catch(
			(caught: unknown) => caught,
		);

		expect(error).toHaveProperty("issues.0.path", ["customSections", 0, "items", 0, "company"]);
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});

	it("returns a rejected Promise when the renderer fails synchronously", async () => {
		rendererMock.pdf.mockImplementationOnce(() => {
			throw new Error("renderer failed");
		});
		const { createResumePdfBlob } = await import("./browser");

		const promise = createResumePdfBlob({ data: sampleResumeData });

		expect(promise).toBeInstanceOf(Promise);
		await expect(promise).rejects.toThrow("renderer failed");
	});

	it("renders a source-free public projection through the semantic runtime", async () => {
		const semanticData = structuredClone(sampleResumeData);
		const applied = { languageVersion: 1, text: "@rr-version 1;\nname { color: #123456; }\n" };
		semanticData.metadata.stylesheet = { mode: "semantic", source: applied, applied };
		const projection = await createPublicStyleProjection({ data: semanticData });
		const publicData = structuredClone(semanticData);
		delete publicData.metadata.stylesheet;
		const { createResumePdfBlob } = await import("./browser");

		await createResumePdfBlob({ data: publicData, publicStyleProjection: projection });

		expect(rendererMock.pdf).toHaveBeenCalledWith(
			expect.objectContaining({
				props: expect.objectContaining({
					data: publicData,
					semanticRuntime: expect.objectContaining({
						presentation: expect.objectContaining({
							"page-1/region-header/header/name": { style: { color: "#123456" } },
						}),
					}),
				}),
			}),
		);
	});

	it("returns semantic diagnostics without rendering an invalid applied source", async () => {
		const data = structuredClone(sampleResumeData);
		const invalid = { languageVersion: 1, text: "@rr-version 1; section { color: ; }" };
		data.metadata.stylesheet = { mode: "semantic", source: invalid, applied: invalid };
		const { createResumePdfBlobResult } = await import("./browser");

		const result = await createResumePdfBlobResult({ data });

		expect(result).toMatchObject({
			ok: false,
			diagnostics: [expect.objectContaining({ severity: "error" })],
		});
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});

	it("rejects unchecked rendering instead of producing an unstyled PDF for semantic errors", async () => {
		const data = structuredClone(sampleResumeData);
		const invalid = { languageVersion: 1, text: "@rr-version 1; section { color: ; }" };
		data.metadata.stylesheet = { mode: "semantic", source: invalid, applied: invalid };
		const { createResumePdfBlob } = await import("./browser");

		await expect(createResumePdfBlob({ data })).rejects.toMatchObject({
			cause: [expect.objectContaining({ severity: "error" })],
		});
		expect(rendererMock.pdf).not.toHaveBeenCalled();
	});

	it("accepts an optional prior semantic inspection on the result path", async () => {
		const { createResumePdfBlobResult } = await import("./browser");
		const inspection = {
			presentation: {},
			sourceTree: { key: "resume", kind: "resume", attributes: {}, roles: [], children: [] },
			renderTree: { key: "resume", kind: "resume", attributes: {}, roles: [], children: [] },
			diagnostics: [],
		} as const;

		const result = await createResumePdfBlobResult({ data: sampleResumeData, inspection });

		expect(result).toMatchObject({ ok: true, diagnostics: [] });
		expect(rendererMock.pdf).toHaveBeenCalledTimes(1);
	});
});
