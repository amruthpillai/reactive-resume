import { ORPCError } from "@orpc/client";
import { and, desc, eq, lt, notInArray, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";

type RetiredLinkAttemptDedupOptions = {
	windowMs: number;
	maxEntries: number;
};

export const RETIRED_LINK_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const MAX_RETIRED_LINKS_PER_RESUME = 50;

type RetiredLinkCandidate = {
	id: string;
	userId: string;
	targetUserId: string;
	currentUsername: string;
	isPublic: boolean;
	retiredAt: Date;
};

export function isEligibleRetiredLink(
	candidate: RetiredLinkCandidate | null | undefined,
	input: { username: string; now: Date },
): candidate is RetiredLinkCandidate {
	if (!candidate) return false;
	return (
		candidate.userId === candidate.targetUserId &&
		candidate.currentUsername === input.username &&
		candidate.isPublic &&
		candidate.retiredAt.getTime() >= input.now.getTime() - RETIRED_LINK_RETENTION_MS
	);
}

export function filterRetiredLinkIdsToKeep(
	rows: { id: string; retiredAt: Date }[],
	input: { now: Date; maxEntries?: number },
): string[] {
	const cutoff = input.now.getTime() - RETIRED_LINK_RETENTION_MS;
	return rows
		.filter((row) => row.retiredAt.getTime() >= cutoff)
		.sort((a, b) => b.retiredAt.getTime() - a.retiredAt.getTime() || b.id.localeCompare(a.id))
		.slice(0, input.maxEntries ?? MAX_RETIRED_LINKS_PER_RESUME)
		.map((row) => row.id);
}

type CaptureRetiredLinkInput = {
	resumeId: string;
	userId: string;
	username: string;
	retiredSlug: string;
	liveSlug: string;
	now: Date;
};

type RetiredLinkListRow = {
	username: string;
	slug: string;
	attemptCount: number;
	lastAttemptAt: Date | null;
};

export type RetiredLinkRepository = {
	upsert: (input: {
		resumeId: string;
		userId: string;
		username: string;
		slug: string;
		retiredAt: Date;
	}) => Promise<void>;
	removeLivePath: (input: { userId: string; slug: string }) => Promise<void>;
	pruneExpired: (resumeId: string, cutoff: Date) => Promise<void>;
	listForPruning: (resumeId: string) => Promise<{ id: string; retiredAt: Date }[]>;
	removeExcept: (resumeId: string, keepIds: string[]) => Promise<void>;
	findByPath: (input: { username: string; slug: string }) => Promise<RetiredLinkCandidate | null>;
	increment: (id: string, now: Date) => Promise<void>;
	hasOwnedResume: (resumeId: string, userId: string) => Promise<boolean>;
	listByResume: (resumeId: string) => Promise<RetiredLinkListRow[]>;
};

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export function createDrizzleRetiredLinkRepository(client: DbOrTx): RetiredLinkRepository {
	return {
		upsert: async (input) => {
			await client
				.insert(schema.resumeRetiredLink)
				.values(input)
				.onConflictDoUpdate({
					target: [schema.resumeRetiredLink.username, schema.resumeRetiredLink.slug],
					set: {
						resumeId: input.resumeId,
						userId: input.userId,
						retiredAt: input.retiredAt,
						attemptCount: 0,
						lastAttemptAt: null,
					},
				});
		},

		removeLivePath: async (input) => {
			await client
				.delete(schema.resumeRetiredLink)
				.where(and(eq(schema.resumeRetiredLink.userId, input.userId), eq(schema.resumeRetiredLink.slug, input.slug)));
		},

		pruneExpired: async (resumeId, cutoff) => {
			await client
				.delete(schema.resumeRetiredLink)
				.where(and(eq(schema.resumeRetiredLink.resumeId, resumeId), lt(schema.resumeRetiredLink.retiredAt, cutoff)));
		},

		listForPruning: (resumeId) =>
			client
				.select({ id: schema.resumeRetiredLink.id, retiredAt: schema.resumeRetiredLink.retiredAt })
				.from(schema.resumeRetiredLink)
				.where(eq(schema.resumeRetiredLink.resumeId, resumeId))
				.orderBy(desc(schema.resumeRetiredLink.retiredAt), desc(schema.resumeRetiredLink.id)),

		removeExcept: async (resumeId, keepIds) => {
			await client
				.delete(schema.resumeRetiredLink)
				.where(
					keepIds.length === 0
						? eq(schema.resumeRetiredLink.resumeId, resumeId)
						: and(eq(schema.resumeRetiredLink.resumeId, resumeId), notInArray(schema.resumeRetiredLink.id, keepIds)),
				);
		},

		findByPath: async (input) => {
			const [candidate] = await client
				.select({
					id: schema.resumeRetiredLink.id,
					userId: schema.resumeRetiredLink.userId,
					targetUserId: schema.resume.userId,
					currentUsername: schema.user.username,
					isPublic: schema.resume.isPublic,
					retiredAt: schema.resumeRetiredLink.retiredAt,
				})
				.from(schema.resumeRetiredLink)
				.innerJoin(schema.resume, eq(schema.resumeRetiredLink.resumeId, schema.resume.id))
				.innerJoin(schema.user, eq(schema.resumeRetiredLink.userId, schema.user.id))
				.where(
					and(eq(schema.resumeRetiredLink.username, input.username), eq(schema.resumeRetiredLink.slug, input.slug)),
				);
			return candidate ?? null;
		},

		increment: async (id, now) => {
			await client
				.update(schema.resumeRetiredLink)
				.set({
					attemptCount: sql`${schema.resumeRetiredLink.attemptCount} + 1`,
					lastAttemptAt: now,
				})
				.where(eq(schema.resumeRetiredLink.id, id));
		},

		hasOwnedResume: async (resumeId, userId) => {
			const [resume] = await client
				.select({ id: schema.resume.id })
				.from(schema.resume)
				.where(and(eq(schema.resume.id, resumeId), eq(schema.resume.userId, userId)));
			return Boolean(resume);
		},

		listByResume: (resumeId) =>
			client
				.select({
					username: schema.resumeRetiredLink.username,
					slug: schema.resumeRetiredLink.slug,
					attemptCount: schema.resumeRetiredLink.attemptCount,
					lastAttemptAt: schema.resumeRetiredLink.lastAttemptAt,
				})
				.from(schema.resumeRetiredLink)
				.where(eq(schema.resumeRetiredLink.resumeId, resumeId))
				.orderBy(desc(schema.resumeRetiredLink.retiredAt), desc(schema.resumeRetiredLink.id))
				.limit(MAX_RETIRED_LINKS_PER_RESUME),
	};
}

export function createRetiredLinksService(repository: RetiredLinkRepository) {
	return {
		capture: async (input: CaptureRetiredLinkInput) => {
			await repository.removeLivePath({ userId: input.userId, slug: input.liveSlug });
			await repository.upsert({
				resumeId: input.resumeId,
				userId: input.userId,
				username: input.username,
				slug: input.retiredSlug,
				retiredAt: input.now,
			});

			const cutoff = new Date(input.now.getTime() - RETIRED_LINK_RETENTION_MS);
			await repository.pruneExpired(input.resumeId, cutoff);
			const rows = await repository.listForPruning(input.resumeId);
			const keepIds = filterRetiredLinkIdsToKeep(rows, { now: input.now });
			await repository.removeExcept(input.resumeId, keepIds);
		},

		removeLivePath: (input: { userId: string; slug: string }) => repository.removeLivePath(input),

		recognize: async (input: { username: string; slug: string; now: Date }) => {
			const candidate = await repository.findByPath(input);
			if (!isEligibleRetiredLink(candidate, input)) return null;
			return { id: candidate.id, userId: candidate.userId };
		},

		increment: (id: string, now: Date) => repository.increment(id, now),

		list: async (input: { resumeId: string; userId: string; now: Date }) => {
			if (!(await repository.hasOwnedResume(input.resumeId, input.userId))) throw new ORPCError("NOT_FOUND");

			await repository.pruneExpired(input.resumeId, new Date(input.now.getTime() - RETIRED_LINK_RETENTION_MS));
			const rows = await repository.listByResume(input.resumeId);
			return rows.slice(0, MAX_RETIRED_LINKS_PER_RESUME).map((row) => ({
				path: `/${row.username}/${row.slug}`,
				attemptCount: row.attemptCount,
				lastAttemptAt: row.lastAttemptAt,
			}));
		},
	};
}

export class RetiredLinkAttemptDedup {
	readonly #seen = new Map<string, number>();

	constructor(private readonly options: RetiredLinkAttemptDedupOptions) {}

	shouldCount(recordId: string, clientKey: string, now: number): boolean {
		const key = `retired:${recordId}:${clientKey}`;
		const expiry = this.#seen.get(key);
		if (expiry !== undefined && expiry > now) return false;

		if (expiry !== undefined) this.#seen.delete(key);

		for (const [seenKey, seenExpiry] of this.#seen) {
			if (seenExpiry <= now) this.#seen.delete(seenKey);
		}

		while (this.#seen.size >= this.options.maxEntries) {
			const oldestKey = this.#seen.keys().next().value;
			if (typeof oldestKey !== "string") break;
			this.#seen.delete(oldestKey);
		}

		this.#seen.set(key, now + this.options.windowMs);
		return true;
	}
}

const retiredLinkAttemptDedup = new RetiredLinkAttemptDedup({
	windowMs: 60 * 60 * 1000,
	maxEntries: 50_000,
});

export function shouldCountRetiredLinkAttempt(recordId: string, clientKey: string, now: number): boolean {
	return retiredLinkAttemptDedup.shouldCount(recordId, clientKey, now);
}

export const retiredLinkService = {
	capture: (client: DbOrTx, input: CaptureRetiredLinkInput) =>
		createRetiredLinksService(createDrizzleRetiredLinkRepository(client)).capture(input),
	removeLivePath: (client: DbOrTx, input: { userId: string; slug: string }) =>
		createRetiredLinksService(createDrizzleRetiredLinkRepository(client)).removeLivePath(input),
	recognize: (input: { username: string; slug: string; now: Date }) =>
		createRetiredLinksService(createDrizzleRetiredLinkRepository(db)).recognize(input),
	increment: (id: string, now: Date) =>
		createRetiredLinksService(createDrizzleRetiredLinkRepository(db)).increment(id, now),
	list: (input: { resumeId: string; userId: string; now: Date }) =>
		createRetiredLinksService(createDrizzleRetiredLinkRepository(db)).list(input),
};
