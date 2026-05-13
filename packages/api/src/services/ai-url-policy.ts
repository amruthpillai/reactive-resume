import type { AIProvider } from "@reactive-resume/ai/types";
import { AI_PROVIDER_DEFAULT_BASE_URLS } from "@reactive-resume/ai/types";
import { env } from "@reactive-resume/env/server";
import { isPrivateOrLoopbackHost, parseAllowedHostList, parseUrl } from "@reactive-resume/utils/url-security.node";

type ResolveAiBaseUrlInput = {
	provider: AIProvider;
	baseURL?: string | null;
};

function normalizeHost(hostname: string) {
	return hostname.trim().toLowerCase();
}

function providerHostAllowlist() {
	return parseAllowedHostList(env.AI_PROVIDER_HOST_ALLOWLIST);
}

function isAllowlistedProviderHost(parsed: URL) {
	const allowedHosts = providerHostAllowlist();
	const hostname = normalizeHost(parsed.hostname);
	const origin = parsed.origin.toLowerCase();

	return allowedHosts.has(hostname) || allowedHosts.has(origin);
}

function assertSafeUrl(input: string, errorCode: string, options?: { allowPrivateHosts?: boolean }) {
	const parsed = parseUrl(input);
	if (!parsed) throw new Error(errorCode);
	if (parsed.protocol !== "https:") throw new Error(errorCode);
	if (parsed.username || parsed.password) throw new Error(errorCode);

	if (isPrivateOrLoopbackHost(parsed.hostname) && !(options?.allowPrivateHosts && isAllowlistedProviderHost(parsed))) {
		throw new Error(errorCode);
	}

	parsed.hash = "";
	return parsed.toString();
}

export function resolveAiBaseUrl(input: ResolveAiBaseUrlInput) {
	const baseURL = input.baseURL?.trim() || AI_PROVIDER_DEFAULT_BASE_URLS[input.provider];
	if (!baseURL) throw new Error("INVALID_AI_BASE_URL");

	return assertSafeUrl(baseURL, "INVALID_AI_BASE_URL", { allowPrivateHosts: true });
}

export function assertFetchablePublicHttpsUrl(input: string) {
	return assertSafeUrl(input, "URL_NOT_FETCHABLE");
}
