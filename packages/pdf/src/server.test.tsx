import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { SectionTitleResolver } from "./section-title";
import { Buffer } from "node:buffer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";

const rendererMock = vi.hoisted(() => ({
	renderToBuffer: vi.fn(async () => Buffer.from("%PDF")),
}));

const createRendererUnsafeResumeData = (): ResumeData => {
	const data = structuredClone(sampleResumeData);
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

vi.mock("#react-pdf-renderer", async (importOriginal) => ({
	...(await importOriginal<typeof import("@react-pdf/renderer")>()),
	renderToBuffer: rendererMock.renderToBuffer,
}));

vi.mock("./document", () => ({
	ResumeDocument: () => null,
}));

describe("createResumePdfFile", () => {
	beforeEach(() => {
		rendererMock.renderToBuffer.mockClear();
	});

	it("renders ResumeDocument with data, filename, template, and section title resolver", async () => {
		const resolveSectionTitle: SectionTitleResolver = (input) => input.defaultEnglishTitle ?? input.sectionId;
		const { createResumePdfFile } = await import("./server");
		const data = createLegacyRendererSafeResumeData();

		const file = await createResumePdfFile({
			data,
			filename: "resume.pdf",
			template: "azurill",
			resolveSectionTitle,
		});

		expect(file.name).toBe("resume.pdf");
		expect(file.type).toBe("application/pdf");
		expect(await file.text()).toBe("%PDF");
		expect(rendererMock.renderToBuffer).toHaveBeenCalledTimes(1);
		expect(rendererMock.renderToBuffer).toHaveBeenCalledWith(
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

	it("renders with base styles when the source is fatal", async () => {
		const data = structuredClone(sampleResumeData);
		data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 2, text: "@version 2;" } };
		const { createResumePdfFile } = await import("./server");

		await expect(createResumePdfFile({ data, filename: "resume.pdf" })).resolves.toHaveProperty(
			"type",
			"application/pdf",
		);
		expect(rendererMock.renderToBuffer).toHaveBeenCalledTimes(1);
	});

	it("rejects renderer-unsafe data at the server boundary before React PDF dispatch", async () => {
		const { createResumePdfFile } = await import("./server");

		const error = await createResumePdfFile({
			data: createRendererUnsafeResumeData(),
			filename: "resume.pdf",
		}).catch((caught: unknown) => caught);

		expect(error).toHaveProperty("issues.0.path", ["customSections", 0, "items", 0, "company"]);
		expect(rendererMock.renderToBuffer).not.toHaveBeenCalled();
	});
});
