import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dbResult = vi.hoisted(() => ({ count: 0 }));
const dbMock = vi.hoisted(() => {
	const select = vi.fn();
	select.mockReturnValue({ from: () => Promise.resolve([dbResult]) });
	return { select };
});

vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));
vi.mock("@reactive-resume/db/schema", () => ({ user: { __table: "user" }, resume: { __table: "resume" } }));
vi.mock("drizzle-orm", () => ({ count: () => "count(*)" }));

const fetchMock = vi.fn();
beforeEach(() => {
	vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	fetchMock.mockReset();
	dbMock.select.mockReset();
	// ponytail: clear in-memory cache so each test starts with a fresh fetch
	clearStatisticsCache();
});

const { statisticsService, clearStatisticsCache } = await import("./service");

it("reports the older cache time, retains it on reads, and omits it for fallback totals", async () => {
	vi.useFakeTimers();
	const start = Date.UTC(2026, 8, 8);
	const hour = 60 * 60 * 1000;
	vi.setSystemTime(start);
	dbResult.count = 42;
	dbMock.select.mockReturnValue({ from: () => Promise.resolve([dbResult]) });
	await statisticsService.user.getCount();

	vi.setSystemTime(start + hour);
	dbResult.count = 7;
	await expect(statisticsService.getTotals()).resolves.toEqual({ users: 42, resumes: 7, cachedAt: start });
	vi.setSystemTime(start + 2 * hour);
	await expect(statisticsService.getTotals()).resolves.toEqual({ users: 42, resumes: 7, cachedAt: start });
	expect(dbMock.select).toHaveBeenCalledTimes(2);

	vi.setSystemTime(start + 6 * hour);
	dbResult.count = 8;
	await expect(statisticsService.getTotals()).resolves.toEqual({ users: 8, resumes: 7, cachedAt: start + hour });

	vi.setSystemTime(start + 7 * hour);
	dbMock.select.mockImplementationOnce(() => {
		throw new Error("db down");
	});
	expect(await statisticsService.getTotals()).toMatchObject({ users: 8, cachedAt: null });
});

describe("statisticsService.user.getCount", () => {
	it("returns the DB count when the fetcher succeeds", async () => {
		dbResult.count = 42;
		dbMock.select.mockReturnValue({ from: () => Promise.resolve([dbResult]) });
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
		dbMock.select.mockReturnValue({ from: () => Promise.resolve([dbResult]) });
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
