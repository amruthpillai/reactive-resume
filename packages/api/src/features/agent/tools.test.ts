import type { AIProvider } from "@reactive-resume/ai/types";
import { describe, expect, it } from "vitest";
import { buildAgentInstructions, buildAgentTools } from "./tools";

const handlers = {
	readResume: async () => ({
		id: "resume-1",
		name: "Resume",
		updatedAt: "2026-05-13T00:00:00.000Z",
		data: {},
	}),
	readAttachment: async () => ({
		id: "attachment-1",
		filename: "job.md",
		mediaType: "text/markdown",
		size: 128,
		content: "Job description",
	}),
	applyResumePatch: async () => ({
		actionId: "action-1",
		resumeId: "resume-1",
		title: "Update resume",
		summary: null,
		operations: [],
		appliedUpdatedAt: "2026-05-13T00:00:00.000Z",
	}),
};

function buildTools(provider: AIProvider, options?: { model?: string; baseURL?: string }) {
	return buildAgentTools({
		provider: { provider, model: options?.model ?? "gpt-5-mini", apiKey: "test-key", baseURL: options?.baseURL ?? "" },
		handlers,
	});
}

describe("agent tools", () => {
	it("adds provider-native web search for direct OpenAI providers", () => {
		const tools = buildTools("openai");

		expect(tools).toHaveProperty("web_search");
	});

	it("adds provider-native web search for OpenAI providers using the explicit default base URL", () => {
		const tools = buildTools("openai", { baseURL: "https://api.openai.com/v1" });

		expect(tools).toHaveProperty("web_search");
	});

	it("does not add provider-native web search for OpenAI providers with a custom base URL", () => {
		const tools = buildTools("openai", { baseURL: "https://openai-compatible.example.com/v1" });

		expect(tools).not.toHaveProperty("web_search");
	});

	it.each([
		"https://api.openai.com/v1?proxy=1",
		"https://api.openai.com/v1#fragment",
	])("does not add provider-native web search for OpenAI providers with non-exact base URL %s", (baseURL) => {
		const tools = buildTools("openai", { baseURL });

		expect(tools).not.toHaveProperty("web_search");
	});

	it("does not add provider-native web search for unsupported OpenAI models", () => {
		const tools = buildTools("openai", { model: "custom-model" });

		expect(tools).not.toHaveProperty("web_search");
	});

	it.each<AIProvider>([
		"anthropic",
		"gemini",
		"vercel-ai-gateway",
		"openrouter",
		"ollama",
		"lmstudio",
		"openai-compatible",
	])("does not add provider-native web search for %s", (provider) => {
		const tools = buildTools(provider);

		expect(tools).not.toHaveProperty("web_search");
	});

	it("keeps instructions explicit about native search availability", () => {
		expect(buildAgentInstructions({ hasProviderNativeSearch: true })).toContain("Use web_search");
		expect(buildAgentInstructions({ hasProviderNativeSearch: true })).toContain("user-provided public URLs");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).not.toContain("Use web_search");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain("Live web research is unavailable");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain(
			"paste or attach the relevant content",
		);
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain("Batch related JSON Patch operations");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain("/basics/name");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain("never /data/basics/name or /name");
		expect(buildAgentInstructions({ hasProviderNativeSearch: false })).toContain("clean Markdown");
	});
});
