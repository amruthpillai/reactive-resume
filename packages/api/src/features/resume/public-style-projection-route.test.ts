import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouterClient } from "@orpc/server";

const mocks = vi.hoisted(() => ({
	getStyleProjection: vi.fn(),
}));

vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	const base = os.$context<{
		locale: "en-US";
		reqHeaders: Headers;
		resHeaders?: Headers;
		trustedClient?: string;
	}>();
	return { publicProcedure: base, protectedProcedure: base };
});

vi.mock("./public-style-projection", () => ({
	getStyleProjection: mocks.getStyleProjection,
}));

vi.mock("./service", () => ({ resumeService: {} }));

const { sharingRouter } = await import("./sharing");

describe("public style projection route", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getStyleProjection.mockResolvedValue({
			formatVersion: 1,
			languageVersion: 1,
			semanticTreeVersion: 1,
			registryFingerprint: "0".repeat(64),
			adapterFingerprint: "1".repeat(64),
			renderDataHash: "2".repeat(64),
			nodes: {},
		});
	});

	it("mounts a concrete public GET route beside the ordinary JSON read", () => {
		expect(sharingRouter.getStyleProjection["~orpc"].route).toMatchObject({
			method: "GET",
			path: "/resumes/{username}/{slug}/style-projection",
			operationId: "getResumeStyleProjection",
		});
		expect(sharingRouter.getBySlug["~orpc"].route.path).toBe("/resumes/{username}/{slug}");
	});

	it("marks the concrete projection response private and uses the server-derived client identity", async () => {
		const reqHeaders = new Headers({ "x-forwarded-for": "198.51.100.1" });
		const resHeaders = new Headers();
		const client = createRouterClient(sharingRouter, {
			context: {
				locale: "en-US",
				reqHeaders,
				resHeaders,
				trustedClient: "203.0.113.9",
			},
		});

		await client.getStyleProjection({ username: "jane", slug: "resume" });

		expect(resHeaders.get("Cache-Control")).toBe("private, no-store");
		expect(mocks.getStyleProjection).toHaveBeenCalledWith({
			username: "jane",
			slug: "resume",
			requestHeaders: reqHeaders,
			trustedClient: "203.0.113.9",
		});
	});
});
