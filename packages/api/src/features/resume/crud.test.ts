import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterClient } from "@orpc/server";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const mocks = vi.hoisted(() => ({
	create: vi.fn(),
	getById: vi.fn(),
}));

vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	return {
		protectedProcedure: os.$context<{
			locale: "en-US";
			reqHeaders: Headers;
			user: { id: string };
		}>(),
	};
});

vi.mock("./service", () => ({
	resumeService: {
		create: mocks.create,
		getById: mocks.getById,
	},
}));

const { crudRouter } = await import("./crud");

const rendererUnsafeData = (): ResumeData =>
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
				items: [{ id: "summary-item", hidden: false, content: "<p>Missing company</p>" }],
			},
		],
	}) as unknown as ResumeData;

describe("resume duplicate route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.create.mockResolvedValue("copy-id");
	});

	it("rejects invalid stored source data before calling the shared create service", async () => {
		mocks.getById.mockResolvedValue({
			id: "resume-id",
			name: "Resume",
			slug: "resume",
			tags: [],
			data: rendererUnsafeData(),
		});
		const client = createRouterClient(crudRouter, {
			context: { locale: "en-US", reqHeaders: new Headers(), user: { id: "user-id" } } as never,
		});

		const error = await client
			.duplicate({ id: "resume-id", name: "Copy", slug: "copy", tags: [] })
			.catch((caught: unknown) => caught);

		expect(error).toMatchObject({ code: "INTERNAL_SERVER_ERROR", status: 500 });
		expect(error).toHaveProperty("cause.issues.0.path", ["customSections", 0, "items", 0, "company"]);
		expect(mocks.create).not.toHaveBeenCalled();
	});
});
