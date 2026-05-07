import { createRatelimitMiddleware } from "@orpc/experimental-ratelimit";
import { MemoryRatelimiter } from "@orpc/experimental-ratelimit/memory";
import { rateLimitConfig, TRUSTED_IP_HEADERS } from "@reactive-resume/utils/rate-limit";

const isRateLimitEnabled = process.env.NODE_ENV === "production";

type ContextWithHeaders = {
	reqHeaders?: Headers;
	user?: { id: string } | null;
};

function getTrustedIp(headers?: Headers): string | null {
	if (!headers) return null;

	for (const headerName of TRUSTED_IP_HEADERS) {
		const raw = headers.get(headerName)?.trim();
		if (!raw) continue;

		// Some proxies provide a comma-delimited chain; first item is the original client.
		const ip = raw.split(",")[0]?.trim();
		if (!ip) continue;

		return ip;
	}

	return null;
}

function getClientKey(headers?: Headers): string {
	const trustedIp = getTrustedIp(headers);
	if (trustedIp) return `ip:${trustedIp}`;

	const userAgent = headers?.get("user-agent")?.trim() ?? "unknown";
	const language = headers?.get("accept-language")?.split(",")[0]?.trim() ?? "none";

	return `fp:${userAgent.slice(0, 64)}:${language.slice(0, 16)}`;
}

function getUserKey(context: ContextWithHeaders): string {
	return context.user?.id ?? "anon";
}

function getInputKeyPart(input: unknown): string {
	if (!input || typeof input !== "object") return "no-input";

	const inputRecord = input as Record<string, unknown>;
	const id = inputRecord.id;

	if (typeof id === "string" && id.trim()) return id;

	const username = inputRecord.username;
	const slug = inputRecord.slug;

	if (typeof username === "string" && typeof slug === "string") return `${username}:${slug}`;

	return "no-id";
}

const resumePasswordLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.resumePassword);
const pdfLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.pdfExport);
const aiLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.aiRequest);
const jobsSearchLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.jobsSearch);
const jobsTestConnectionLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.jobsTestConnection);
const storageUploadLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.storageUpload);
const storageDeleteLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.storageDelete);
const resumeMutationLimiter = new MemoryRatelimiter(rateLimitConfig.orpc.resumeMutations);
const disabledLimiter = {
	limit: async () => ({
		success: true,
		remaining: Number.POSITIVE_INFINITY,
		reset: Date.now(),
	}),
};

const productionLimiter = (limiter: MemoryRatelimiter) => (isRateLimitEnabled ? limiter : disabledLimiter);

export const resumePasswordRateLimit = createRatelimitMiddleware<
	ContextWithHeaders,
	{ username: string; slug: string }
>({
	limiter: productionLimiter(resumePasswordLimiter),
	key: ({ context }, input) => `resume-password:${input.username}:${input.slug}:${getClientKey(context.reqHeaders)}`,
});

export const pdfExportRateLimit = createRatelimitMiddleware<ContextWithHeaders, { id: string }>({
	limiter: productionLimiter(pdfLimiter),
	key: ({ context }, input) => `pdf-export:${getUserKey(context)}:${input.id}`,
});

export const aiRequestRateLimit = createRatelimitMiddleware<ContextWithHeaders, { provider: string }>({
	limiter: productionLimiter(aiLimiter),
	key: ({ context }, input) => `ai-request:${getUserKey(context)}:${input.provider}`,
});

export const jobsSearchRateLimit = createRatelimitMiddleware<ContextWithHeaders, { params: { query: string } }>({
	limiter: productionLimiter(jobsSearchLimiter),
	key: ({ context }, input) => `jobs-search:${getUserKey(context)}:${input.params.query.trim().toLowerCase()}`,
});

export const jobsTestConnectionRateLimit = createRatelimitMiddleware<ContextWithHeaders, { apiKey: string }>({
	limiter: productionLimiter(jobsTestConnectionLimiter),
	key: ({ context }) => `jobs-test-connection:${getUserKey(context)}`,
});

export const storageUploadRateLimit = createRatelimitMiddleware<ContextWithHeaders, unknown>({
	limiter: productionLimiter(storageUploadLimiter),
	key: ({ context }) => `storage-upload:${getUserKey(context)}`,
});

export const storageDeleteRateLimit = createRatelimitMiddleware<ContextWithHeaders, { filename: string }>({
	limiter: productionLimiter(storageDeleteLimiter),
	key: ({ context }, input) => `storage-delete:${getUserKey(context)}:${input.filename}`,
});

export const resumeMutationRateLimit = createRatelimitMiddleware<ContextWithHeaders, unknown>({
	limiter: productionLimiter(resumeMutationLimiter),
	key: ({ context }, input) => `resume-mutation:${getUserKey(context)}:${getInputKeyPart(input)}`,
});
