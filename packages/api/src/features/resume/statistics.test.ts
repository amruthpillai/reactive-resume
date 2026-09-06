import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/client";
import { createRouterClient } from "@orpc/server";

const mocks = vi.hoisted(() => ({
	recordDownload: vi.fn(async () => true),
	getRetiredLinks: vi.fn(),
	user: null as { id: string } | null,
}));

vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	const procedure = os
		.$context<{ reqHeaders: Headers; locale: "en-US" }>()
		.use(({ context, next }) => next({ context: { ...context, user: mocks.user } }));
	return { publicProcedure: procedure, protectedProcedure: procedure };
});
vi.mock("./service", () => ({
	resumeService: {
		statistics: { recordDownload: mocks.recordDownload, getRetiredLinks: mocks.getRetiredLinks },
	},
}));

beforeAll(() => {
	vi.stubEnv("NODE_ENV", "production");
});
beforeEach(() => {
	mocks.recordDownload.mockClear();
	mocks.getRetiredLinks.mockReset();
});

describe("public download statistics procedure", () => {
	const makeClient = async (user: { id: string } | null = null, ip = "127.0.0.1") => {
		const { resumeStatisticsRouter } = await import("./statistics");
		mocks.user = user;
		const headers = new Headers({ "x-forwarded-for": ip });
		return {
			client: createRouterClient(resumeStatisticsRouter, { context: { reqHeaders: headers, locale: "en-US" } }),
			headers,
		};
	};

	it("passes anonymous access headers to the download service", async () => {
		const { client, headers } = await makeClient();
		await expect(client.recordDownload({ username: "owner", slug: "anonymous" })).resolves.toBe(true);
		expect(mocks.recordDownload).toHaveBeenCalledExactlyOnceWith({
			username: "owner",
			slug: "anonymous",
			requestHeaders: headers,
		});
	});

	it("passes authenticated identity for owner exclusion", async () => {
		const { client, headers } = await makeClient({ id: "owner-id" });
		await client.recordDownload({ username: "owner", slug: "authenticated" });
		expect(mocks.recordDownload).toHaveBeenCalledExactlyOnceWith({
			username: "owner",
			slug: "authenticated",
			requestHeaders: headers,
			currentUserId: "owner-id",
		});
	});

	it("rate limits repeated reports independently per resume and visitor", async () => {
		const { client } = await makeClient();
		const input = { username: "owner", slug: "rate-limit" };
		for (let count = 0; count < 5; count++) await client.recordDownload(input);
		await expect(client.recordDownload(input)).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
		expect(mocks.recordDownload).toHaveBeenCalledTimes(5);
		await expect(client.recordDownload({ ...input, slug: "different-resume" })).resolves.toBe(true);
		const anotherVisitor = await makeClient(null, "127.0.0.2");
		await expect(anotherVisitor.client.recordDownload(input)).resolves.toBe(true);
	});
});

describe("retired link statistics procedure", () => {
	it("returns sanitized retired-path aggregates for the authenticated owner", async () => {
		const lastAttemptAt = new Date("2026-09-06T12:00:00.000Z");
		mocks.user = { id: "owner-id" };
		mocks.getRetiredLinks.mockResolvedValueOnce([{ path: "/owner/first", attemptCount: 3, lastAttemptAt }]);
		const { resumeStatisticsRouter } = await import("./statistics");
		const client = createRouterClient(resumeStatisticsRouter, {
			context: { reqHeaders: new Headers(), locale: "en-US" },
		});

		await expect(client.getRetiredLinks({ id: "resume-1" })).resolves.toEqual([
			{ path: "/owner/first", attemptCount: 3, lastAttemptAt },
		]);
		expect(mocks.getRetiredLinks).toHaveBeenCalledExactlyOnceWith({ id: "resume-1", userId: "owner-id" });
	});

	it.each(["another owner", "missing resume"])("returns NOT_FOUND for %s", async () => {
		mocks.user = { id: "other-owner" };
		mocks.getRetiredLinks.mockRejectedValueOnce(new ORPCError("NOT_FOUND"));
		const { resumeStatisticsRouter } = await import("./statistics");
		const client = createRouterClient(resumeStatisticsRouter, {
			context: { reqHeaders: new Headers(), locale: "en-US" },
		});

		await expect(client.getRetiredLinks({ id: "resume-1" })).rejects.toMatchObject({ code: "NOT_FOUND" });
	});
});
