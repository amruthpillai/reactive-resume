import { describe, expect, it } from "vitest";
import { createPublicRenderRateLimiter } from "./public-render-rate-limit";

describe("public render rate limit", () => {
	it("cannot reset a transport client's budget by rotating forwarding headers", () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 60_000, now: () => 0 });
		const first = {
			trustedClient: "203.0.113.9",
			requestHeaders: new Headers({
				"cf-connecting-ip": "198.51.100.1",
				"x-forwarded-for": "198.51.100.2",
			}),
			resumeId: "resume-1",
		};
		const rotated = {
			...first,
			requestHeaders: new Headers({
				"cf-connecting-ip": "198.51.100.3",
				"x-forwarded-for": "198.51.100.4",
			}),
		};

		limiter.consume(first);

		expect(() => limiter.consume(rotated)).toThrowError(
			expect.objectContaining({ code: "RATE_LIMIT_EXCEEDED", status: 429 }),
		);
	});

	it("shares one IP-and-resume token bucket across projection and PDF consumers", () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 2, refillWindowMs: 60_000, now: () => 0 });
		const input = { trustedClient: "203.0.113.7", resumeId: "resume-1" };

		limiter.consume(input);
		limiter.consume(input);

		expect(() => limiter.consume(input)).toThrowError(
			expect.objectContaining({ code: "RATE_LIMIT_EXCEEDED", status: 429 }),
		);
	});

	it("keeps budgets separate by client IP and resume", () => {
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 60_000, now: () => 0 });
		limiter.consume({ trustedClient: "203.0.113.7", resumeId: "resume-1" });

		expect(() => limiter.consume({ trustedClient: "203.0.113.8", resumeId: "resume-1" })).not.toThrow();
		expect(() => limiter.consume({ trustedClient: "203.0.113.7", resumeId: "resume-2" })).not.toThrow();
	});

	it("refills the bounded bucket over time", () => {
		let now = 0;
		const limiter = createPublicRenderRateLimiter({ capacity: 1, refillWindowMs: 1_000, now: () => now });
		const input = { trustedClient: "203.0.113.7", resumeId: "resume-1" };
		limiter.consume(input);
		expect(() => limiter.consume(input)).toThrow();

		now = 1_000;

		expect(() => limiter.consume(input)).not.toThrow();
	});
});
