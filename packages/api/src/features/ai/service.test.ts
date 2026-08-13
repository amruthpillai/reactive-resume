import type { UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { convertToModelMessages, modelMessageSchema } from "ai";

const envMock = vi.hoisted(() => ({
	FLAG_ALLOW_UNSAFE_AI_BASE_URL: false,
}));

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));

afterEach(() => {
	vi.unstubAllGlobals();
});

function stubOpenAICompatibleResponse(response?: { content?: string; finishReason?: string }) {
	let requestBody: unknown;

	const fetchMock = vi.fn((_input: unknown, init?: { body?: unknown }) => {
		const body = JSON.parse(String(init?.body ?? "{}")) as { max_tokens?: number };
		requestBody = body;
		const hasEnoughOutputTokens = (body.max_tokens ?? 0) >= 128;

		return new Response(
			JSON.stringify({
				id: "chatcmpl-test",
				object: "chat.completion",
				created: 1,
				model: "test-model",
				choices: [
					{
						index: 0,
						message: { role: "assistant", content: response?.content ?? (hasEnoughOutputTokens ? "1" : "") },
						finish_reason: response?.finishReason ?? (hasEnoughOutputTokens ? "stop" : "length"),
					},
				],
				usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
			}),
			{ headers: { "Content-Type": "application/json" } },
		);
	});

	vi.stubGlobal("fetch", fetchMock);

	return { fetchMock, getRequestBody: () => requestBody };
}

const { testConnection } = await import("./service");

describe("AI chat service", () => {
	it("tests OpenAI-compatible providers without requiring structured output", async () => {
		const openAiCompatible = stubOpenAICompatibleResponse();

		await expect(
			testConnection({
				provider: "openai-compatible",
				model: "test-model",
				apiKey: "test-key",
				baseURL: "https://example.test/v1",
			}),
		).resolves.toBe(true);

		expect(openAiCompatible.fetchMock).toHaveBeenCalledTimes(1);
		expect(openAiCompatible.getRequestBody()).not.toHaveProperty("response_format");
		expect(openAiCompatible.getRequestBody()).toMatchObject({ max_tokens: 128, temperature: 0 });
	});

	it("explains when the provider test hits the output limit", async () => {
		stubOpenAICompatibleResponse({ content: "1. The connection works.", finishReason: "length" });

		await expect(
			testConnection({
				provider: "openai-compatible",
				model: "test-model",
				apiKey: "test-key",
				baseURL: "https://example.test/v1",
			}),
		).rejects.toThrow("The model returned too much text during the provider test.");
	});

	it("keeps proposal tool history valid for follow-up chat messages", async () => {
		const messages: UIMessage[] = [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "Add draft references." }],
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [
					{
						type: "tool-propose_resume_patches",
						toolCallId: "call-1",
						state: "output-available",
						input: {
							proposals: [
								{
									title: "Add draft references",
									operations: [
										{
											op: "replace",
											path: "/sections/references/items",
											value: [
												{ id: "reference-1", name: "Jane Mitchell" },
												{ id: "reference-2", name: "Marcus Chen" },
												{ id: "reference-3", name: "Olivia Ramirez" },
											],
										},
									],
								},
							],
						},
						output: {
							proposals: [
								{
									id: "proposal-1",
									title: "Add draft references",
									baseUpdatedAt: "2026-05-10T06:38:27.093Z",
									operations: [
										{
											op: "replace",
											path: "/sections/references/items",
											value: [
												{ id: "reference-1", name: "Jane Mitchell" },
												{ id: "reference-2", name: "Marcus Chen" },
												{ id: "reference-3", name: "Olivia Ramirez" },
											],
										},
									],
								},
							],
						},
					},
				],
			},
			{
				id: "assistant-2",
				role: "assistant",
				parts: [{ type: "text", text: "I prepared draft reference changes for review." }],
			},
			{
				id: "user-2",
				role: "user",
				parts: [{ type: "text", text: "Reduce it down to the first two." }],
			},
		];

		const modelMessages = await convertToModelMessages(messages);

		expect(modelMessages.map((message) => message.role)).toEqual(["user", "assistant", "tool", "assistant", "user"]);
		expect(JSON.stringify(modelMessages)).toContain("proposal-1");
		expect(JSON.stringify(modelMessages)).toContain("/sections/references/items");
		expect(JSON.stringify(modelMessages)).toContain("tool-result");

		for (const message of modelMessages) {
			expect(modelMessageSchema.safeParse(message).success).toBe(true);
		}
	});
});
