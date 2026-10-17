import type { RouterOutput } from "@/api/client";
import { fetch } from "expo/fetch";

export type SavedProvider = RouterOutput["aiProviders"]["list"][number];
export type AIProvider = SavedProvider["provider"];

const AI_PROVIDER_DEFAULT_BASE_URLS: Record<AIProvider, string> = {
	openai: "https://api.openai.com/v1",
	anthropic: "https://api.anthropic.com/v1",
	gemini: "https://generativelanguage.googleapis.com/v1beta",
	"vercel-ai-gateway": "https://ai-gateway.vercel.sh/v3/ai",
	openrouter: "https://openrouter.ai/api/v1",
	mistral: "https://api.mistral.ai/v1",
	cohere: "https://api.cohere.com/v2",
	xai: "https://api.x.ai/v1",
	groq: "https://api.groq.com/openai/v1",
	deepseek: "https://api.deepseek.com/v1",
	togetherai: "https://api.together.xyz/v1",
	fireworks: "https://api.fireworks.ai/inference/v1",
	cerebras: "https://api.cerebras.ai/v1",
	perplexity: "https://api.perplexity.ai",
	ollama: "https://ollama.com/api",
	"openai-compatible": "",
};

export const modelsDevProviderIds: Record<AIProvider, string | null> = {
	openai: "openai",
	anthropic: "anthropic",
	gemini: "google",
	"vercel-ai-gateway": "vercel",
	openrouter: "openrouter",
	mistral: "mistral",
	cohere: "cohere",
	xai: "xai",
	groq: "groq",
	deepseek: "deepseek",
	togetherai: "togetherai",
	fireworks: "fireworks-ai",
	cerebras: "cerebras",
	perplexity: "perplexity",
	ollama: "ollama-cloud",
	"openai-compatible": null,
};

// Provider labels are brand names and stay untranslated on purpose, so every locale shows the
// vendor's own spelling instead of a literal translation (e.g. "Google Gemini", not "谷歌双子座").
export const providerOptions: {
	value: AIProvider;
	label: string;
	keywords: string[];
	defaultBaseURL: string;
	defaultModel: string;
}[] = [
	{
		value: "openai",
		label: "OpenAI",
		keywords: ["openai", "gpt", "chatgpt"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openai,
		defaultModel: "gpt-4.1",
	},
	{
		value: "anthropic",
		label: "Anthropic Claude",
		keywords: ["anthropic", "claude", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.anthropic,
		defaultModel: "claude-3-5-sonnet-latest",
	},
	{
		value: "gemini",
		label: "Google Gemini",
		keywords: ["gemini", "google"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.gemini,
		defaultModel: "gemini-2.0-flash",
	},
	{
		value: "vercel-ai-gateway",
		label: "Vercel AI Gateway",
		keywords: ["vercel", "gateway", "ai"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS["vercel-ai-gateway"],
		defaultModel: "openai/gpt-4.1",
	},
	{
		value: "openrouter",
		label: "OpenRouter",
		keywords: ["openrouter", "router"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.openrouter,
		defaultModel: "openai/gpt-4.1",
	},
	{
		value: "mistral",
		label: "Mistral AI",
		keywords: ["mistral", "magistral"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.mistral,
		defaultModel: "mistral-large-latest",
	},
	{
		value: "cohere",
		label: "Cohere",
		keywords: ["cohere", "command"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.cohere,
		defaultModel: "command-a-03-2025",
	},
	{
		value: "xai",
		label: "xAI Grok",
		keywords: ["xai", "grok"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.xai,
		defaultModel: "grok-4",
	},
	{
		value: "groq",
		label: "Groq",
		keywords: ["groq", "llama"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.groq,
		defaultModel: "llama-3.3-70b-versatile",
	},
	{
		value: "deepseek",
		label: "DeepSeek",
		keywords: ["deepseek"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.deepseek,
		defaultModel: "deepseek-chat",
	},
	{
		value: "togetherai",
		label: "Together.ai",
		keywords: ["together", "togetherai", "llama"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.togetherai,
		defaultModel: "meta-llama/Meta-Llama-3.3-70B-Instruct-Turbo",
	},
	{
		value: "fireworks",
		label: "Fireworks",
		keywords: ["fireworks", "llama", "deepseek"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.fireworks,
		defaultModel: "accounts/fireworks/models/llama-v3p3-70b-instruct",
	},
	{
		value: "cerebras",
		label: "Cerebras",
		keywords: ["cerebras", "llama"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.cerebras,
		defaultModel: "llama3.3-70b",
	},
	{
		value: "perplexity",
		label: "Perplexity",
		keywords: ["perplexity", "sonar"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.perplexity,
		defaultModel: "sonar-pro",
	},
	{
		value: "ollama",
		label: "Ollama",
		keywords: ["ollama", "cloud"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS.ollama,
		defaultModel: "llama3.1",
	},
	{
		value: "openai-compatible",
		label: "OpenAI-compatible",
		keywords: ["compatible", "custom", "gateway"],
		defaultBaseURL: AI_PROVIDER_DEFAULT_BASE_URLS["openai-compatible"],
		defaultModel: "",
	},
];

// Prefill Base URL + Model from the provider's known defaults when the provider changes.
export function providerDefaults(provider: AIProvider) {
	const option = providerOptions.find((entry) => entry.value === provider);
	return {
		baseURL: option?.defaultBaseURL ?? AI_PROVIDER_DEFAULT_BASE_URLS[provider] ?? "",
		model: option?.defaultModel ?? "",
	};
}

export function providerLabel(provider: AIProvider) {
	return String(providerOptions.find((option) => option.value === provider)?.label ?? provider);
}

/** "…9f2a" from the stored preview ("sk-a...9f2a"); short keys only ever show dots. */
export function keyEnding(preview: string) {
	const [, end] = preview.split("...");
	return end ? `…${end}` : preview;
}

type SuggestedModel = { id: string; name: string; release_date: string };

const record = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** Optional public suggestions; failure never blocks a manually entered model ID. */
export async function loadModelSuggestions(signal: AbortSignal): Promise<Record<string, SuggestedModel[]>> {
	const response = await fetch("https://models.dev/api.json", {
		signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
		credentials: "omit",
	});
	if (!response.ok) throw new Error("Model catalog unavailable");
	const catalog: unknown = await response.json();
	if (!record(catalog)) throw new Error("Invalid model catalog");
	return Object.fromEntries(
		Object.values(modelsDevProviderIds).flatMap((id) => {
			if (!id) return [];
			const provider = catalog[id];
			if (!record(provider) || !record(provider.models)) return [[id, []]];
			const models = Object.values(provider.models).flatMap((model): SuggestedModel[] => {
				if (
					!record(model) ||
					typeof model.id !== "string" ||
					!model.id ||
					typeof model.name !== "string" ||
					model.status === "deprecated" ||
					!record(model.modalities) ||
					!Array.isArray(model.modalities.input) ||
					!model.modalities.input.includes("text") ||
					!Array.isArray(model.modalities.output) ||
					!model.modalities.output.includes("text")
				)
					return [];
				return [
					{
						id: model.id,
						name: model.name,
						release_date: typeof model.release_date === "string" ? model.release_date : "",
					},
				];
			});
			models.sort((a, b) => b.release_date.localeCompare(a.release_date) || a.name.localeCompare(b.name));
			return [[id, models]];
		}),
	);
}
