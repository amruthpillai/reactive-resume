import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterClient } from "@orpc/server";

const mocks = vi.hoisted(() => ({ create: vi.fn(), generate: vi.fn(), application: vi.fn(), resume: vi.fn() }));
vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	return { protectedProcedure: os.$context<{ user: { id: string }; locale: "en-US" }>() };
});
vi.mock("../../middleware/rate-limit", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	return { aiRequestRateLimit: os.middleware(({ next }) => next()) };
});
vi.mock("ai", () => ({ generateText: mocks.generate }));
vi.mock("../ai/service", () => ({ getModel: vi.fn(() => ({})) }));
vi.mock("../ai-providers/service", () => ({
	aiProvidersService: {
		getDefaultRunnable: vi.fn(async () => ({ provider: "openai", model: "test", apiKey: "test" })),
	},
}));
vi.mock("../resume/service", () => ({ resumeService: { getById: mocks.resume } }));
vi.mock("../cover-letters/service", () => ({ coverLetterService: { create: mocks.create } }));
vi.mock("./service", () => ({ applicationService: { getById: mocks.application } }));

const { aiRouter } = await import("./ai");
const client = createRouterClient(aiRouter, { context: { user: { id: "owner" }, locale: "en-US" } as never });

describe("persistent generated cover letters", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.application.mockResolvedValue({ id: "application", company: "Acme", role: "Engineer", resumeId: null });
		mocks.generate.mockResolvedValue({ text: "Hello <team>" });
		mocks.create.mockResolvedValue({ id: "saved-letter" });
	});
	it("saves escaped cover letter before returning its identity", async () => {
		expect(await client.draftMessage({ id: "application", kind: "cover-letter" })).toEqual({
			text: "Hello <team>",
			coverLetterId: "saved-letter",
		});
		expect(mocks.create).toHaveBeenCalledWith(
			expect.objectContaining({ userId: "owner", applicationId: "application", content: "<p>Hello &lt;team&gt;</p>" }),
		);
	});
	it("does not report a saved letter when persistence fails", async () => {
		mocks.create.mockRejectedValueOnce(new Error("DB unavailable"));
		await expect(client.draftMessage({ id: "application", kind: "cover-letter" })).rejects.toThrow();
	});
	it("keeps follow-up messages transient", async () => {
		expect(await client.draftMessage({ id: "application", kind: "follow-up" })).toEqual({ text: "Hello <team>" });
		expect(mocks.create).not.toHaveBeenCalled();
	});
});
