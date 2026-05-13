import type { AIProvider } from "@reactive-resume/ai/types";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";

type AiProviderCapabilityInput = {
	provider: AIProvider;
	model: string;
	baseURL?: string | null;
};

function normalizeDirectOpenAIBaseUrl(baseURL: string) {
	try {
		const parsed = new URL(baseURL);
		if (parsed.search || parsed.hash) return null;
		return parsed.toString().replace(/\/+$/, "");
	} catch {
		return baseURL.trim().replace(/\/+$/, "");
	}
}

export function isDirectOpenAIProvider(input: Pick<AiProviderCapabilityInput, "provider" | "baseURL">) {
	if (input.provider !== "openai") return false;
	if (!input.baseURL?.trim()) return true;

	const baseURL = normalizeDirectOpenAIBaseUrl(input.baseURL);
	if (!baseURL) return false;

	return baseURL === normalizeDirectOpenAIBaseUrl(AI_PROVIDER_DEFAULT_BASE_URLS.openai);
}

const OPENAI_WEB_SEARCH_RESPONSES_MODEL_IDS = new Set([
	// Snapshot from official OpenAI model docs on 2026-05-13. These model pages list Responses
	// API support and Responses web search support. Most are also explicit in installed
	// @ai-sdk/openai OpenAIResponsesModelId; gpt-5.5-pro is accepted through the SDK's string
	// model ID fallback and openai.responses("gpt-5.5-pro") runtime construction.
	// https://developers.openai.com/api/docs/models/gpt-5.5-pro
	"gpt-5.5-pro",
	// https://developers.openai.com/api/docs/models/gpt-5.5
	"gpt-5.5",
	// https://developers.openai.com/api/docs/models/gpt-5.4
	"gpt-5.4",
	// https://developers.openai.com/api/docs/models/gpt-5.4-mini
	"gpt-5.4-mini",
	// https://developers.openai.com/api/docs/models/gpt-5.4-nano
	"gpt-5.4-nano",
	// https://developers.openai.com/api/docs/models/gpt-5.4-pro
	"gpt-5.4-pro",
	// https://developers.openai.com/api/docs/models/gpt-5
	"gpt-5",
	// https://developers.openai.com/api/docs/models/gpt-5-mini
	"gpt-5-mini",
	// https://developers.openai.com/api/docs/models/gpt-5-nano
	"gpt-5-nano",
	// https://developers.openai.com/api/docs/models/gpt-4.1
	"gpt-4.1",
	// https://developers.openai.com/api/docs/models/gpt-4.1-mini
	"gpt-4.1-mini",
	// https://developers.openai.com/api/docs/guides/tools-web-search?api-mode=responses
	"o4-mini",
]);

function isDateSnapshotForModel(model: string, modelId: string) {
	const snapshotPrefix = `${modelId}-`;
	if (!model.startsWith(snapshotPrefix)) return false;

	const suffix = model.slice(snapshotPrefix.length);
	const [year, month, day] = suffix.split("-");

	return (
		suffix.length === "YYYY-MM-DD".length &&
		year?.length === 4 &&
		month?.length === 2 &&
		day?.length === 2 &&
		[year, month, day].every((part) => /^\d+$/.test(part))
	);
}

export function supportsOpenAIWebSearch(model: string) {
	const normalized = model.trim().toLowerCase();
	if (!normalized || normalized.includes("codex")) return false;

	if (OPENAI_WEB_SEARCH_RESPONSES_MODEL_IDS.has(normalized)) return true;

	return Array.from(OPENAI_WEB_SEARCH_RESPONSES_MODEL_IDS).some((modelId) =>
		isDateSnapshotForModel(normalized, modelId),
	);
}

export function supportsProviderNativeWebSearch(provider: AiProviderCapabilityInput) {
	return isDirectOpenAIProvider(provider) && supportsOpenAIWebSearch(provider.model);
}
