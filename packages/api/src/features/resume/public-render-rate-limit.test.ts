import { describe, expect, it } from "vitest";
import { createPublicRenderRateLimiter } from "./public-render-rate-limit";

const requestHeaders = (ip: string) => new Headers({ "x-forwarded-for": ip });

describe("public render rate limit", () => {
	it("shares one IP-and-resume token bucket across projection and PDF consumers", () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 2, refillWindowMs: 60_000, now: () => 0 });
		const input = { requestHeaders: requestHeaders("203.0.113.7"), resumeId: "resume-1" };

		limiter.consume(input);
		limiter.consume(input);

		expect(() => limiter.consume(input)).toThrowError(
			expect.objectContaining({ code: "RATE_LIMIT_EXCEEDED", status: 429 }),
		);
	});

	it("keeps budgets separate by client IP and resume", () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 60_000, now: () => 0 });
		limiter.consume({ requestHeaders: requestHeaders("203.0.113.7"), resumeId: "resume-1" });

		expect(() =>
			limiter.consume({ requestHeaders: requestHeaders("203.0.113.8"), resumeId: "resume-1" }),
		).not.toThrow();
		expect(() =>
			limiter.consume({ requestHeaders: requestHeaders("203.0.113.7"), resumeId: "resume-2" }),
		).not.toThrow();
	});

	it("refills the bounded bucket over time", () => {
		let now = 0;
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 1_000, now: () => now });
		const input = { requestHeaders: requestHeaders("203.0.113.7"), resumeId: "resume-1" };
		limiter.consume(input);
		expect(() => limiter.consume(input)).toThrow();

		now = 1_000;

		expect(() => limiter.consume(input)).not.toThrow();
	});
});
