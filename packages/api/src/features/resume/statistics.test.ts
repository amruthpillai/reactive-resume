import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterClient } from "@orpc/server";

const mocks = vi.hoisted(() => ({ recordDownload: vi.fn(async () => true), user: null as { id: string } | null }));

vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	const procedure = os
		.$context<{ reqHeaders: Headers; locale: "en-US" }>()
		.use(({ context, next }) => next({ context: { ...context, user: mocks.user } }));
	return { publicProcedure: procedure, protectedProcedure: procedure };
});
vi.mock("./service", () => ({ resumeService: { statistics: { recordDownload: mocks.recordDownload } } }));

beforeAll(() => {
	vi.stubEnv("NODE_ENV", "production");
});
beforeEach(() => {
	mocks.recordDownload.mockClear();
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
