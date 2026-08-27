import { beforeEach, describe, expect, it, vi } from "vitest";
import { AISDKError, generateText } from "ai";
import { z } from "zod";

const protectedProcedureMock = vi.hoisted(() => {
	const chain = {
		route: vi.fn(() => chain),
		input: vi.fn(() => chain),
		.use: vi.fn(() => chain),
		.output: vi.fn(() => chain),
		.errors: vi.fn(() => chain),
		handler: vi.fn(() => chain),
	};
	return chain;
});

vi.mock("ai", async (importOriginal) => ({
	...(await importOriginal<typeof import("ai")>()),
	generateText: vi.fn(),
}));
vi.mock("../../context", () => ({ protectedProcedure: protectedProcedureMock }));
vi.mock("../../middleware/rate-limit", () => ({ aiRequestRateLimit: vi.fn() }));
vi.mock("../ai/service", () => ({ getModel: vi.fn() }));
vi.mock("../ai-providers/service", () => ({ aiProvidersService: { getDefaultRunnable: vi.fn() } }));
vi.mock("../resume/service", () => ({ resumeService: { getById: vi.fn(), create: vi.fn() } }));
vi.mock("./service", () => ({
	applicationService: { getById: vi.fn(), setAiResult: vi.fn(), update: vi.fn(), addNote: vi.fn() },
}));

const { autofillInputSchema, generateJson, generatePlainText } = await import("./ai");

describe("autofillInputSchema", () => {
	it("rejects oversized pasted job descriptions", () => {
		expect(() => autofillInputSchema.parse({ jobDescription: "x".repeat(20_001) })).toThrow();
	});

	it("rejects blank pasted job descriptions", () => {
		expect(() => autofillInputSchema.parse({ jobDescription: "   " })).toThrow();
		expect(() => autofillInputSchema.parse({})).toThrow();
	});

	it("accepts a pasted posting", () => {
		expect(autofillInputSchema.parse({ jobDescription: "  Senior Engineer at Acme  " }).jobDescription).toBe(
			"Senior Engineer at Acme",
		);
	});
});

describe("copilot provider-failure translation", () => {
	const schema = z.object({ summary: z.string() });

	beforeEach(() => {
		vi.mocked(generateText).mockReset();
	});

	it("translates AI SDK provider failures to BAD_GATEWAY in generatePlainText", async () => {
		vi.mocked(generateText).mockRejectedValue(new AISDKError({ name: "AISDKError", message: "Provider returned 401" }));

		await expect(generatePlainText({} as never, "prompt")).rejects.toMatchObject({ code: "BAD_GATEWAY" });
	});

	it("translates AI SDK provider failures to BAD_GATEWAY in generateJson", async () => {
		vi.mocked(generateText).mockRejectedValue(new AISDKError({ name: "AISDKError", message: "Model not found" }));

		await expect(generateJson({} as never, "prompt", schema)).rejects.toMatchObject({ code: "BAD_GATEWAY" });
	});

	it("preserves the provider error as the BAD_GATEWAY cause", async () => {
		const providerError = new AISDKError({ name: "AISDKError", message: "quota exceeded" });
		vi.mocked(generateText).mockRejectedValue(providerError);

		const error: { code?: string; cause?: unknown } = await generatePlainText({} as never, "prompt").catch(
			(thrown) => thrown,
		);
		expect(error.code).toBe("BAD_GATEWAY");
		expect(error.cause).toBe(providerError);
	});

	it("rethrows non-provider errors unchanged", async () => {
		const unrelated = new Error("network dropped mid-call");
		vi.mocked(generateText).mockRejectedValue(unrelated);

		await expect(generatePlainText({} as never, "prompt")).rejects.toBe(unrelated);
		await expect(generateJson({} as never, "prompt", schema)).rejects.toBe(unrelated);
	});

	it("still returns parsed JSON on success", async () => {
		vi.mocked(generateText).mockResolvedValue({ text: '```json\n{"summary":"<p>Hi</p>"}\n```' } as never);

		await expect(generateJson({} as never, "prompt", schema)).resolves.toEqual({ summary: "<p>Hi</p>" });
	});
});
