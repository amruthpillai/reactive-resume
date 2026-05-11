import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const envMock = vi.hoisted(() => ({
	// Filled in by beforeEach so caches do not bleed between tests.
	LOCAL_STORAGE_PATH: "" as string,
}));

const dbResult = vi.hoisted(() => ({ count: 0 }));
const dbMock = vi.hoisted(() => {
	const select = vi.fn();
	select.mockReturnValue({ from: () => Promise.resolve([dbResult]) });
	return { select };
});

vi.mock("@reactive-resume/env/server", () => ({ env: envMock }));
vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({ user: { __table: "user" }, resume: { __table: "resume" } }));
vi.mock("drizzle-orm", () => ({ count: () => "count(*)" }));

const fetchMock = vi.fn();
beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	dbMock.select.mockClear();
});

const { statisticsService } = await import("./statistics");

// Each test gets a unique LOCAL_STORAGE_PATH to avoid cross-test cache hits.
beforeEach(() => {
	envMock.LOCAL_STORAGE_PATH = mkdtempSync(join(tmpdir(), "rr-statistics-test-"));
});

describe("statisticsService.user.getCount", () => {
	it("returns the DB count when the fetcher succeeds", async () => {
		dbResult.count = 42;
		await expect(statisticsService.user.getCount()).resolves.toBe(42);
	});

	it("falls back to the last-known value when the DB throws", async () => {
		dbMock.select.mockImplementationOnce(() => {
			throw new Error("db down");
		});
		const value = await statisticsService.user.getCount();
		// Last known is 978_528; we just check it's > 0 (don't hard-code the magic number).
		expect(value).toBeGreaterThan(0);
	});
});

describe("statisticsService.resume.getCount", () => {
	it("returns the DB count for resume", async () => {
		dbResult.count = 7;
		await expect(statisticsService.resume.getCount()).resolves.toBe(7);
	});
});

describe("statisticsService.github.getStarCount", () => {
	it("returns the parsed stargazers_count when GitHub responds OK", async () => {
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ stargazers_count: 12345 }),
		});

		const stars = await statisticsService.github.getStarCount();
		expect(stars).toBe(12345);
	});

	it("falls back to last-known on non-OK responses (retries internally)", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			json: async () => ({}),
		});

		const stars = await statisticsService.github.getStarCount();
		expect(stars).toBeGreaterThan(0);
	});

	it("falls back to last-known when fetch throws", async () => {
		fetchMock.mockRejectedValue(new Error("network down"));

		const stars = await statisticsService.github.getStarCount();
		expect(stars).toBeGreaterThan(0);
	});

	it("rejects non-positive stargazers_count and falls back", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ stargazers_count: 0 }),
		});

		const stars = await statisticsService.github.getStarCount();
		expect(stars).toBeGreaterThan(0);
	});

	it("rejects non-numeric stargazers_count and falls back", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ stargazers_count: "not a number" }),
		});

		const stars = await statisticsService.github.getStarCount();
		expect(stars).toBeGreaterThan(0);
	});
});
