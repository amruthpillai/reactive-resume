import { ORPCError } from "@orpc/server";

type PublicRenderRateLimitInput = {
	/** Sanitized transport identity supplied by the server adapter, never by request headers. */
	trustedClient: string;
	resumeId: string;
};

export type PublicRenderRateLimiter = {
	consume(input: PublicRenderRateLimitInput): void;
};

type Bucket = {
	tokens: number;
	updatedAt: number;
};

const MAX_BUCKETS = 50_000;

export function createPublicRenderRateLimiter(
	options: { capacity?: number; refillWindowMs?: number; now?: () => number } = {},
): PublicRenderRateLimiter {
	const capacity = options.capacity ?? 6;
	const refillWindowMs = options.refillWindowMs ?? 60_000;
	const now = options.now ?? Date.now;
	if (!Number.isInteger(capacity) || capacity <= 0 || !Number.isFinite(refillWindowMs) || refillWindowMs <= 0) {
		throw new Error("Public render token bucket requires positive finite limits");
	}
	const buckets = new Map<string, Bucket>();

	return {
		consume(input) {
			const currentTime = now();
			const trustedClient = input.trustedClient.trim() || "unknown";
			const key = `${trustedClient}:${input.resumeId}`;
			const previous = buckets.get(key) ?? { tokens: capacity, updatedAt: currentTime };
			const elapsed = Math.max(0, currentTime - previous.updatedAt);
			const tokens = Math.min(capacity, previous.tokens + (elapsed * capacity) / refillWindowMs);

			if (tokens < 1) {
				throw new ORPCError("RATE_LIMIT_EXCEEDED", {
					status: 429,
					message: "Public resume rendering rate limit exceeded.",
				});
			}

			buckets.delete(key);
			buckets.set(key, { tokens: tokens - 1, updatedAt: currentTime });
			if (buckets.size <= MAX_BUCKETS) return;

			for (const [candidate, bucket] of buckets) {
				if (currentTime - bucket.updatedAt >= refillWindowMs) buckets.delete(candidate);
			}
			if (buckets.size > MAX_BUCKETS) buckets.delete(buckets.keys().next().value as string);
		},
	};
}

export const publicRenderRateLimiter = createPublicRenderRateLimiter();
