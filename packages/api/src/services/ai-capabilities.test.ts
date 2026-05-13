import { describe, expect, it } from "vitest";
import { isDirectOpenAIProvider, supportsOpenAIWebSearch } from "./ai-capabilities";

describe("AI provider capabilities", () => {
	it("identifies direct OpenAI base URL configs", () => {
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "" })).toBe(true);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1/" })).toBe(true);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://example.com/v1" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1?proxy=1" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openai", baseURL: "https://api.openai.com/v1#fragment" })).toBe(false);
		expect(isDirectOpenAIProvider({ provider: "openrouter", baseURL: "https://api.openai.com/v1" })).toBe(false);
	});

	it("keeps the OpenAI web search model predicate conservative", () => {
		const allowedModels = [
			"gpt-5.5",
			"gpt-5.5-2026-04-23",
			"gpt-5.5-pro",
			"gpt-5.5-pro-2026-04-23",
			"gpt-5.4",
			"gpt-5.4-2026-03-05",
			"gpt-5.4-mini",
			"gpt-5.4-mini-2026-03-17",
			"gpt-5.4-nano",
			"gpt-5.4-nano-2026-03-17",
			"gpt-5.4-pro",
			"gpt-5.4-pro-2026-03-05",
			"gpt-5",
			"gpt-5-2025-08-07",
			"gpt-5-mini",
			"gpt-5-mini-2025-08-07",
			"gpt-5-nano",
			"gpt-5-nano-2025-08-07",
			"gpt-4.1",
			"gpt-4.1-2025-04-14",
			"gpt-4.1-mini",
			"gpt-4.1-mini-2025-04-14",
			"o4-mini",
			"o4-mini-2025-04-16",
		];
		const deniedModels = [
			"gpt-4.1-nano",
			"gpt-4.1-nano-2025-04-14",
			"gpt-4o",
			"gpt-4o-mini",
			"gpt-4o-search-preview",
			"o1",
			"o1-2024-12-17",
			"o3",
			"o3-mini",
			"gpt-3.5-turbo",
			"gpt-5-codex",
			"gpt-5.1-codex",
			"gpt-5.5-codex",
			"gpt-4x1-2025-04-14",
			"gpt-5x5-2026-04-23",
			"gpt-5x5-pro-2026-04-23",
			"custom-model",
		];

		for (const model of allowedModels) {
			expect(supportsOpenAIWebSearch(model), model).toBe(true);
		}

		for (const model of deniedModels) {
			expect(supportsOpenAIWebSearch(model), model).toBe(false);
		}
	});
});
