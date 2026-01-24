import { ORPCError } from "@orpc/client";
import { and, arrayContains, asc, desc, eq, sql } from "drizzle-orm";
import { get } from "es-toolkit/compat";
import { match } from "ts-pattern";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData } from "@/schema/resume/data";
import { env } from "@/utils/env";
import type { Locale } from "@/utils/locale";
import { hashPassword } from "@/utils/password";
import { generateId } from "@/utils/string";
import { hasResumeAccess } from "../helpers/resume-access";
import { getStorageService } from "./storage";

const tags = {
	list: async (input: { userId: string }): Promise<string[]> => {
		const result = await db
			.select({ tags: schema.resume.tags })
			.from(schema.resume)
			.where(eq(schema.resume.userId, input.userId));

		const uniqueTags = new Set(result.flatMap((tag) => tag.tags));
		const sortedTags = Array.from(uniqueTags).sort((a, b) => a.localeCompare(b));

		return sortedTags;
	},
};

const statistics = {
	getById: async (input: { id: string; userId: string }) => {
		const [statistics] = await db
			.select({
				isPublic: schema.resume.isPublic,
				views: schema.resumeStatistics.views,
				downloads: schema.resumeStatistics.downloads,
				lastViewedAt: schema.resumeStatistics.lastViewedAt,
				lastDownloadedAt: schema.resumeStatistics.lastDownloadedAt,
			})
			.from(schema.resumeStatistics)
			.rightJoin(schema.resume, eq(schema.resumeStatistics.resumeId, schema.resume.id))
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		return {
			isPublic: statistics.isPublic,
			views: statistics.views ?? 0,
			downloads: statistics.downloads ?? 0,
			lastViewedAt: statistics.lastViewedAt,
			lastDownloadedAt: statistics.lastDownloadedAt,
		};
	},

	increment: async (input: { id: string; views?: boolean; downloads?: boolean }): Promise<void> => {
		const views = input.views ? 1 : 0;
		const downloads = input.downloads ? 1 : 0;
		const lastViewedAt = input.views ? sql`now()` : undefined;
		const lastDownloadedAt = input.downloads ? sql`now()` : undefined;

		await db
			.insert(schema.resumeStatistics)
			.values({
				resumeId: input.id,
				views,
				downloads,
				lastViewedAt,
				lastDownloadedAt,
			})
			.onConflictDoUpdate({
				target: [schema.resumeStatistics.resumeId],
				set: {
					views: sql`${schema.resumeStatistics.views} + ${views}`,
					downloads: sql`${schema.resumeStatistics.downloads} + ${downloads}`,
					lastViewedAt,
					lastDownloadedAt,
				},
			});
	},
};

export const resumeService = {
	tags,
	statistics,

	list: async (input: { userId: string; tags: string[]; sort: "lastUpdatedAt" | "createdAt" | "name" }) => {
		return await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				createdAt: schema.resume.createdAt,
				updatedAt: schema.resume.updatedAt,
			})
			.from(schema.resume)
			.where(
				and(
					eq(schema.resume.userId, input.userId),
					match(input.tags.length)
						.with(0, () => undefined)
						.otherwise(() => arrayContains(schema.resume.tags, input.tags)),
				),
			)
			.orderBy(
				match(input.sort)
					.with("lastUpdatedAt", () => desc(schema.resume.updatedAt))
					.with("createdAt", () => asc(schema.resume.createdAt))
					.with("name", () => asc(schema.resume.name))
					.exhaustive(),
			);
	},

	getById: async (input: { id: string; userId: string }) => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
			})
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		if (!resume) throw new ORPCError("NOT_FOUND");

		return resume;
	},

	getByIdForPrinter: async (input: { id: string }) => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				userId: schema.resume.userId,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
			})
			.from(schema.resume)
			.where(eq(schema.resume.id, input.id));

		if (!resume) throw new ORPCError("NOT_FOUND");

		try {
			if (!resume.data.picture.url) throw new Error("Picture is not available");

			// Convert picture URL to base64 data, so there's no fetching required on the client.
			const url = resume.data.picture.url.replace(env.APP_URL, "http://localhost:3000");
			const base64 = await fetch(url)
				.then((res) => res.arrayBuffer())
				.then((buffer) => Buffer.from(buffer).toString("base64"));

			resume.data.picture.url = `data:image/jpeg;base64,${base64}`;
		} catch {
			// Ignore errors, as the picture is not always available
		}

		return resume;
	},

	getBySlug: async (input: { username: string; slug: string; currentUserId?: string }) => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				passwordHash: schema.resume.password,
				hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
			})
			.from(schema.resume)
			.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
			.where(
				and(
					eq(schema.resume.slug, input.slug),
					eq(schema.user.username, input.username),
					input.currentUserId ? eq(schema.resume.userId, input.currentUserId) : eq(schema.resume.isPublic, true),
				),
			);

		if (!resume) throw new ORPCError("NOT_FOUND");

		if (!resume.hasPassword) {
			await resumeService.statistics.increment({ id: resume.id, views: true });

			return {
				id: resume.id,
				name: resume.name,
				slug: resume.slug,
				tags: resume.tags,
				data: resume.data,
				isPublic: resume.isPublic,
				isLocked: resume.isLocked,
				hasPassword: false as const,
			};
		}

		if (hasResumeAccess(resume.id, resume.passwordHash)) {
			await resumeService.statistics.increment({ id: resume.id, views: true });

			return {
				id: resume.id,
				name: resume.name,
				slug: resume.slug,
				tags: resume.tags,
				data: resume.data,
				isPublic: resume.isPublic,
				isLocked: resume.isLocked,
				hasPassword: true as const,
			};
		}

		throw new ORPCError("NEED_PASSWORD", {
			status: 401,
			data: { username: input.username, slug: input.slug },
		});
	},

	create: async (input: {
		userId: string;
		name: string;
		slug: string;
		tags: string[];
		locale: Locale;
		data?: ResumeData;
	}): Promise<string> => {
		const id = generateId();

		input.data = input.data ?? defaultResumeData;
		input.data.metadata.page.locale = input.locale;

		try {
			await db.insert(schema.resume).values({
				id,
				name: input.name,
				slug: input.slug,
				tags: input.tags,
				userId: input.userId,
				data: input.data,
			});

			return id;
		} catch (error) {
			const constraint = get(error, "cause.constraint") as string | undefined;

			if (constraint === "resume_slug_user_id_unique") {
				throw new ORPCError("RESUME_SLUG_ALREADY_EXISTS", { status: 400 });
			}

			throw error;
		}
	},

	update: async (input: {
		id: string;
		userId: string;
		name?: string;
		slug?: string;
		tags?: string[];
		data?: ResumeData;
		isPublic?: boolean;
	}): Promise<void> => {
		const [resume] = await db
			.select({ isLocked: schema.resume.isLocked })
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		if (resume?.isLocked) throw new ORPCError("RESUME_LOCKED");

		const updateData: Partial<typeof schema.resume.$inferSelect> = {
			name: input.name,
			slug: input.slug,
			tags: input.tags,
			data: input.data,
			isPublic: input.isPublic,
		};

		try {
			await db
				.update(schema.resume)
				.set(updateData)
				.where(
					and(
						eq(schema.resume.id, input.id),
						eq(schema.resume.isLocked, false),
						eq(schema.resume.userId, input.userId),
					),
				);
		} catch (error) {
			if (get(error, "cause.constraint") === "resume_slug_user_id_unique") {
				throw new ORPCError("RESUME_SLUG_ALREADY_EXISTS", { status: 400 });
			}

			throw error;
		}
	},

	setLocked: async (input: { id: string; userId: string; isLocked: boolean }): Promise<void> => {
		await db
			.update(schema.resume)
			.set({ isLocked: input.isLocked })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	setPassword: async (input: { id: string; userId: string; password: string }): Promise<void> => {
		const hashedPassword = await hashPassword(input.password);

		await db
			.update(schema.resume)
			.set({ password: hashedPassword })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	removePassword: async (input: { id: string; userId: string }): Promise<void> => {
		await db
			.update(schema.resume)
			.set({ password: null })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	delete: async (input: { id: string; userId: string }): Promise<void> => {
		const storageService = getStorageService();

		const deleteResumePromise = db
			.delete(schema.resume)
			.where(
				and(eq(schema.resume.id, input.id), eq(schema.resume.isLocked, false), eq(schema.resume.userId, input.userId)),
			);

		// Delete screenshots and PDFs using the new key format
		const deleteScreenshotsPromise = storageService.delete(`uploads/${input.userId}/screenshots/${input.id}`);
		const deletePdfsPromise = storageService.delete(`uploads/${input.userId}/pdfs/${input.id}`);

		await Promise.allSettled([deleteResumePromise, deleteScreenshotsPromise, deletePdfsPromise]);
	},
};
