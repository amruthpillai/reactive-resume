import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const mocks = vi.hoisted(() => ({
	getById: vi.fn(),
	renderPdf: vi.fn(),
}));

vi.mock("./service", () => ({
	resumeService: {
		getById: mocks.getById,
	},
}));

vi.mock("@reactive-resume/pdf/server", () => ({
	createResumePdfFile: mocks.renderPdf,
}));

const { createResumePdfDownload } = await import("./export");

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

describe("createResumePdfDownload", () => {
	beforeEach(() => {
		mocks.getById.mockReset();
		mocks.renderPdf.mockReset();
	});

	it("rejects renderer-unsafe stored data before export projection or PDF dispatch", async () => {
		mocks.getById.mockResolvedValue({
			id: "resume-1",
			name: "Resume",
			data: createRendererUnsafeResumeData(),
		});

		await expect(createResumePdfDownload({ id: "resume-1", userId: "user-1" })).rejects.toMatchObject({
			code: "INTERNAL_SERVER_ERROR",
		});

		expect(mocks.renderPdf).not.toHaveBeenCalled();
	});

	it("still renders valid stored data", async () => {
		const body = new File(["%PDF"], "resume.pdf", { type: "application/pdf" });
		mocks.getById.mockResolvedValue({
			id: "resume-1",
			name: "Resume",
			data: structuredClone(defaultResumeData),
		});
		mocks.renderPdf.mockResolvedValue(body);

		await expect(createResumePdfDownload({ id: "resume-1", userId: "user-1" })).resolves.toMatchObject({ body });
		expect(mocks.renderPdf).toHaveBeenCalledTimes(1);
	});
});
