import { beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError, generateText, LoadAPIKeyError, RetryError } from "ai";
import { z } from "zod";

const protectedProcedureMock = vi.hoisted(() => {
	const chain = {
		route: vi.fn(() => chain),
		input: vi.fn(() => chain),
		use: vi.fn(() => chain),
		output: vi.fn(() => chain),
		errors: vi.fn(() => chain),
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

	it("translates APICallError provider failures to BAD_GATEWAY in generatePlainText", async () => {
		vi.mocked(generateText).mockRejectedValue(
			new APICallError({
				message: "Provider returned 401",
				url: "https://api.openai.com/v1/chat/completions",
				requestBodyValues: undefined,
				statusCode: 401,
			}),
		);

		await expect(generatePlainText({} as never, "prompt")).rejects.toMatchObject({ code: "BAD_GATEWAY" });
	});

	it("translates APICallError provider failures to BAD_GATEWAY in generateJson", async () => {
		vi.mocked(generateText).mockRejectedValue(
			new APICallError({
				message: "Model not found",
				url: "https://api.openai.com/v1/chat/completions",
				requestBodyValues: undefined,
				statusCode: 404,
			}),
		);

		await expect(generateJson({} as never, { prompt: "prompt" }, schema)).rejects.toMatchObject({
			code: "BAD_GATEWAY",
		});
	});

	it("translates RetryError with maxRetriesExceeded to BAD_GATEWAY", async () => {
		const providerError = new APICallError({
			message: "Provider returned 500",
			url: "https://api.openai.com/v1/chat/completions",
			requestBodyValues: undefined,
			statusCode: 500,
		});
		vi.mocked(generateText).mockRejectedValue(
			new RetryError({
				message: "Failed to generate text after 3 attempts",
				reason: "maxRetriesExceeded",
				errors: [providerError],
			}),
		);

		await expect(generatePlainText({} as never, "prompt")).rejects.toMatchObject({ code: "BAD_GATEWAY" });
	});

	it("preserves the provider error as the BAD_GATEWAY cause", async () => {
		const providerError = new APICallError({
			message: "quota exceeded",
			url: "https://api.openai.com/v1/chat/completions",
			requestBodyValues: undefined,
			statusCode: 429,
		});
		vi.mocked(generateText).mockRejectedValue(providerError);

		const error: { code?: string; cause?: unknown } = await generatePlainText({} as never, "prompt").catch(
			(thrown) => thrown,
		);
		expect(error.code).toBe("BAD_GATEWAY");
		expect(error.cause).toBe(providerError);
	});

	it("rethrows non-provider SDK errors unchanged", async () => {
		const credentialError = new LoadAPIKeyError({ message: "The OPENAI_API_KEY is not set" });
		vi.mocked(generateText).mockRejectedValue(credentialError);

		await expect(generatePlainText({} as never, "prompt")).rejects.toBe(credentialError);
		await expect(generateJson({} as never, { prompt: "prompt" }, schema)).rejects.toBe(credentialError);
	});

	it("rethrows non-AI errors unchanged", async () => {
		const unrelated = new Error("network dropped mid-call");
		vi.mocked(generateText).mockRejectedValue(unrelated);

		await expect(generatePlainText({} as never, "prompt")).rejects.toBe(unrelated);
		await expect(generateJson({} as never, { prompt: "prompt" }, schema)).rejects.toBe(unrelated);
	});

	it("still returns parsed JSON on success", async () => {
		vi.mocked(generateText).mockResolvedValue({ text: '```json\n{"summary":"<p>Hi</p>"}\n```' } as never);

		await expect(generateJson({} as never, { prompt: "prompt" }, schema)).resolves.toEqual({ summary: "<p>Hi</p>" });
	});
});
