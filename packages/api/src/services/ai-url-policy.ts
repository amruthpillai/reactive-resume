import type { AIProvider } from "@reactive-resume/ai/types";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";
import { env } from "@reactive-resume/env/server";
import { isPrivateOrLoopbackHost, parseUrl } from "@reactive-resume/utils/url-security.node";

type ResolveAiBaseUrlInput = {
	provider: AIProvider;
	baseURL?: string | null;
};

function assertSafeUrl(input: string, errorCode: string, options?: { allowUnsafe?: boolean }) {
	const parsed = parseUrl(input);
	if (!parsed) throw new Error(errorCode);
	if (parsed.username || parsed.password) throw new Error(errorCode);
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(errorCode);

	if (!options?.allowUnsafe) {
		if (parsed.protocol !== "https:") throw new Error(errorCode);
		if (isPrivateOrLoopbackHost(parsed.hostname)) throw new Error(errorCode);
	}

	parsed.hash = "";
	return parsed.toString();
}

export function resolveAiBaseUrl(input: ResolveAiBaseUrlInput) {
	const baseURL = input.baseURL?.trim() || AI_PROVIDER_DEFAULT_BASE_URLS[input.provider];
	if (!baseURL) throw new Error("INVALID_AI_BASE_URL");

	return assertSafeUrl(baseURL, "INVALID_AI_BASE_URL", { allowUnsafe: env.FLAG_ALLOW_UNSAFE_AI_BASE_URL });
}

export function assertFetchablePublicHttpsUrl(input: string) {
	return assertSafeUrl(input, "URL_NOT_FETCHABLE");
}
