import type { RetiredLinkRepository } from "./retired-links";
import { describe, expect, it, vi } from "vitest";
import {
	createDrizzleRetiredLinkRepository,
	createRetiredLinksService,
	filterRetiredLinkIdsToKeep,
	isEligibleRetiredLink,
	RetiredLinkAttemptDedup,
} from "./retired-links";

describe("RetiredLinkAttemptDedup", () => {
	it("counts one recognized path attempt per visitor during the window", () => {
		const dedup = new RetiredLinkAttemptDedup({ windowMs: 60 * 60 * 1000, maxEntries: 50_000 });

		expect(dedup.shouldCount("link-1", "visitor-1", 1_000)).toBe(true);
		expect(dedup.shouldCount("link-1", "visitor-1", 2_000)).toBe(false);
		expect(dedup.shouldCount("link-1", "visitor-2", 2_000)).toBe(true);
		expect(dedup.shouldCount("link-1", "visitor-1", 3_601_000)).toBe(true);
	});

	it("evicts the oldest active entry before exceeding its hard cap", () => {
		const dedup = new RetiredLinkAttemptDedup({ windowMs: 10_000, maxEntries: 2 });

		expect(dedup.shouldCount("link-1", "oldest", 0)).toBe(true);
		expect(dedup.shouldCount("link-1", "newer", 1)).toBe(true);
		expect(dedup.shouldCount("link-2", "newest", 2)).toBe(true);
		expect(dedup.shouldCount("link-1", "oldest", 3)).toBe(true);
		expect(dedup.shouldCount("link-2", "newest", 4)).toBe(false);
	});
});

describe("Drizzle retired link repository", () => {
	it("upserts a re-retired path with fresh aggregate counters", async () => {
		const onConflictDoUpdate = vi.fn(async () => undefined);
		const values = vi.fn(() => ({ onConflictDoUpdate }));
		const client = { insert: vi.fn(() => ({ values })) };
		const repository = createDrizzleRetiredLinkRepository(client as never);
		const retiredAt = new Date("2026-09-06T12:00:00.000Z");

		await repository.upsert({
			resumeId: "resume-1",
			userId: "owner-1",
			username: "owner",
			slug: "first",
			retiredAt,
		});

		expect(values).toHaveBeenCalledWith({
			resumeId: "resume-1",
			userId: "owner-1",
			username: "owner",
			slug: "first",
			retiredAt,
		});
		expect(onConflictDoUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				set: expect.objectContaining({ attemptCount: 0, lastAttemptAt: null, retiredAt }),
			}),
		);
	});

	it("increments only aggregate count and last-attempt time", async () => {
		const where = vi.fn(async () => undefined);
		const set = vi.fn((_input: Record<string, unknown>) => ({ where }));
		const client = { update: vi.fn(() => ({ set })) };
		const repository = createDrizzleRetiredLinkRepository(client as never);
		const now = new Date("2026-09-06T12:00:00.000Z");

		await repository.increment("link-1", now);

		expect(set).toHaveBeenCalledWith(expect.objectContaining({ lastAttemptAt: now }));
		expect(Object.keys(set.mock.calls[0]?.[0] ?? {}).sort()).toEqual(["attemptCount", "lastAttemptAt"]);
		expect(where).toHaveBeenCalledOnce();
	});
});

const createRepository = (overrides: Partial<RetiredLinkRepository> = {}): RetiredLinkRepository => ({
	upsert: vi.fn(async () => undefined),
	removeLivePath: vi.fn(async () => undefined),
	pruneExpired: vi.fn(async () => undefined),
	listForPruning: vi.fn(async () => []),
	removeExcept: vi.fn(async () => undefined),
	findByPath: vi.fn(async () => null),
	increment: vi.fn(async () => undefined),
	hasOwnedResume: vi.fn(async () => true),
	listByResume: vi.fn(async () => []),
	...overrides,
});

describe("retired links service", () => {
	it("captures a changed path, removes live reuse, and prunes to newest 50", async () => {
		const now = new Date("2026-09-06T12:00:00.000Z");
		const rows = Array.from({ length: 51 }, (_, index) => ({
			id: `link-${index}`,
			retiredAt: new Date(now.getTime() - index * 1_000),
		}));
		const repository = createRepository({ listForPruning: vi.fn(async () => rows) });
		const service = createRetiredLinksService(repository);

		await service.capture({
			resumeId: "resume-1",
			userId: "owner-1",
			username: "owner",
			retiredSlug: "first",
			liveSlug: "second",
			now,
		});

		expect(repository.removeLivePath).toHaveBeenCalledExactlyOnceWith({ userId: "owner-1", slug: "second" });
		expect(repository.upsert).toHaveBeenCalledExactlyOnceWith({
			resumeId: "resume-1",
			userId: "owner-1",
			username: "owner",
			slug: "first",
			retiredAt: now,
		});
		expect(repository.pruneExpired).toHaveBeenCalledOnce();
		expect(repository.removeExcept).toHaveBeenCalledWith(
			"resume-1",
			rows.slice(0, 50).map((row) => row.id),
		);
	});

	it("recognizes only an eligible retired path", async () => {
		const now = new Date("2026-09-06T12:00:00.000Z");
		const candidate = {
			id: "link-1",
			userId: "owner-1",
			targetUserId: "owner-1",
			currentUsername: "owner",
			isPublic: true,
			retiredAt: new Date("2026-09-01T00:00:00.000Z"),
		};
		const repository = createRepository({ findByPath: vi.fn(async () => candidate) });
		const service = createRetiredLinksService(repository);

		await expect(service.recognize({ username: "owner", slug: "first", now })).resolves.toEqual({
			id: "link-1",
			userId: "owner-1",
		});
	});

	it("denies listing when the resume is missing or belongs to another owner", async () => {
		const repository = createRepository({ hasOwnedResume: vi.fn(async () => false) });
		const service = createRetiredLinksService(repository);

		await expect(service.list({ resumeId: "resume-1", userId: "other-owner", now: new Date() })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		expect(repository.listByResume).not.toHaveBeenCalled();
	});

	it("returns at most 50 sanitized records in repository order after lazy expiry pruning", async () => {
		const now = new Date("2026-09-06T12:00:00.000Z");
		const rows = Array.from({ length: 51 }, (_, index) => ({
			username: "owner",
			slug: `path-${index}`,
			attemptCount: index,
			lastAttemptAt: index === 0 ? null : new Date(now.getTime() - index * 1_000),
		}));
		const repository = createRepository({ listByResume: vi.fn(async () => rows) });
		const service = createRetiredLinksService(repository);

		const result = await service.list({ resumeId: "resume-1", userId: "owner-1", now });

		expect(repository.pruneExpired).toHaveBeenCalledOnce();
		expect(result).toHaveLength(50);
		expect(result[0]).toEqual({ path: "/owner/path-0", attemptCount: 0, lastAttemptAt: null });
		expect(result[0]).not.toHaveProperty("userId");
	});
});

describe("retired link policy", () => {
	const now = new Date("2026-09-06T12:00:00.000Z");
	const eligible = {
		id: "link-1",
		userId: "owner-1",
		targetUserId: "owner-1",
		currentUsername: "current-owner",
		isPublic: true,
		retiredAt: new Date("2026-09-01T12:00:00.000Z"),
	};

	it("accepts only public, unexpired links whose owner still has the retired username", () => {
		expect(isEligibleRetiredLink(eligible, { username: "current-owner", now })).toBe(true);
	});

	it.each([
		["renamed username", { currentUsername: "renamed-owner" }],
		["different target owner", { targetUserId: "owner-2" }],
		["private target", { isPublic: false }],
		["expired path", { retiredAt: new Date("2026-06-01T00:00:00.000Z") }],
		["deleted target", null],
	] as const)("denies a %s without disclosing the retirement", (_label, override) => {
		const candidate = override === null ? null : { ...eligible, ...override };
		expect(isEligibleRetiredLink(candidate, { username: "current-owner", now })).toBe(false);
	});

	it("keeps only the newest 50 unexpired records", () => {
		const rows = Array.from({ length: 52 }, (_, index) => ({
			id: `link-${index}`,
			retiredAt: new Date(now.getTime() - index * 1_000),
		}));
		rows[1] = { id: "expired", retiredAt: new Date("2026-01-01T00:00:00.000Z") };

		const kept = filterRetiredLinkIdsToKeep(rows, { now, maxEntries: 50 });

		expect(kept).toHaveLength(50);
		expect(kept).not.toContain("expired");
		expect(kept).not.toContain("link-51");
		expect(kept[0]).toBe("link-0");
	});
});
