import type { CoverLetter, CoverLetterDocument, CoverLetterStyle } from "@reactive-resume/schema/cover-letter/data";
import type { CoverLetterListInput, CoverLetterUpdateInput } from "../../dto/cover-letter";
import { ORPCError } from "@orpc/client";
import { and, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { copyCoverLetterStyle } from "@reactive-resume/resume/cover-letter";
import {
	coverLetterContentSchema,
	coverLetterDocumentSchema,
	coverLetterSchema,
} from "@reactive-resume/schema/cover-letter/data";
import { coverLetterItemSchema, resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { resumeService } from "../resume/service";
import { sanitizeCoverLetterHtml } from "./html";

type OwnedId = { userId: string; id: string };
type RevisionInput = OwnedId & { expectedRevision: number };
type CreateInput = {
	userId: string;
	name: string;
	recipient?: string | undefined;
	content?: string | undefined;
	resumeId?: string | undefined;
	applicationId?: string | undefined;
};

async function getById(input: OwnedId): Promise<CoverLetter> {
	const [row] = await db
		.select()
		.from(schema.coverLetter)
		.where(and(eq(schema.coverLetter.id, input.id), eq(schema.coverLetter.userId, input.userId)));
	if (!row) throw new ORPCError("NOT_FOUND");
	return coverLetterSchema.parse(row);
}

async function getResumeStyle(userId: string, resumeId?: string, sectionId?: string, itemId?: string) {
	const data = resumeId
		? resumeDataSchema.parse((await resumeService.getById({ userId, id: resumeId })).data)
		: defaultResumeData;
	return copyCoverLetterStyle(data, sectionId, itemId);
}

async function assertOwnedApplication(userId: string, id?: string) {
	if (!id) return;
	const [application] = await db
		.select({ id: schema.application.id })
		.from(schema.application)
		.where(and(eq(schema.application.id, id), eq(schema.application.userId, userId)));
	if (!application) throw new ORPCError("NOT_FOUND");
}

async function insert(input: {
	userId: string;
	name: string;
	recipient: string;
	content: string;
	style: CoverLetterStyle;
	sourceResumeId?: string | null;
	sourceApplicationId?: string | null;
}): Promise<CoverLetter> {
	const content = coverLetterContentSchema.parse(input);
	const [row] = await db
		.insert(schema.coverLetter)
		.values({
			...content,
			userId: input.userId,
			recipient: sanitizeCoverLetterHtml(content.recipient),
			content: sanitizeCoverLetterHtml(content.content),
			sourceResumeId: input.sourceResumeId ?? null,
			sourceApplicationId: input.sourceApplicationId ?? null,
		})
		.returning();
	return coverLetterSchema.parse(row);
}

async function updateRevision(
	input: RevisionInput,
	changes: Partial<typeof schema.coverLetter.$inferInsert>,
): Promise<CoverLetter> {
	const [row] = await db
		.update(schema.coverLetter)
		.set({ ...changes, revision: sql`${schema.coverLetter.revision} + 1` })
		.where(
			and(
				eq(schema.coverLetter.id, input.id),
				eq(schema.coverLetter.userId, input.userId),
				eq(schema.coverLetter.revision, input.expectedRevision),
			),
		)
		.returning();
	if (row) return coverLetterSchema.parse(row);
	await getById(input);
	throw new ORPCError("CONFLICT", { message: "This cover letter changed elsewhere. Reload it before saving again." });
}

export const coverLetterService = {
	getById,
	list: async (input: CoverLetterListInput & { userId: string }) => {
		const filters = [eq(schema.coverLetter.userId, input.userId)];
		if (input.resumeId) filters.push(eq(schema.coverLetter.sourceResumeId, input.resumeId));
		if (input.applicationId) filters.push(eq(schema.coverLetter.sourceApplicationId, input.applicationId));
		if (input.search?.trim())
			filters.push(ilike(schema.coverLetter.name, `%${input.search.trim().replace(/[\\%_]/g, "\\$&")}%`));
		const where = and(...filters);
		const [rows, totals] = await Promise.all([
			db
				.select()
				.from(schema.coverLetter)
				.where(where)
				.orderBy(desc(schema.coverLetter.updatedAt), desc(schema.coverLetter.id))
				.limit(input.limit)
				.offset(input.offset),
			db.select({ total: count() }).from(schema.coverLetter).where(where),
		]);
		return { items: rows.map((row) => coverLetterSchema.parse(row)), total: totals[0]?.total ?? 0 };
	},
	create: async (input: CreateInput) => {
		await assertOwnedApplication(input.userId, input.applicationId);
		const style = await getResumeStyle(input.userId, input.resumeId);
		return insert({
			userId: input.userId,
			name: input.name,
			recipient: input.recipient ?? "",
			content: input.content ?? "",
			style,
			sourceResumeId: input.resumeId ?? null,
			sourceApplicationId: input.applicationId ?? null,
		});
	},
	update: (input: CoverLetterUpdateInput & { userId: string }) => {
		const changes: Partial<typeof schema.coverLetter.$inferInsert> = {};
		if (input.name !== undefined) changes.name = coverLetterContentSchema.shape.name.parse(input.name);
		if (input.recipient !== undefined)
			changes.recipient = sanitizeCoverLetterHtml(coverLetterContentSchema.shape.recipient.parse(input.recipient));
		if (input.content !== undefined)
			changes.content = sanitizeCoverLetterHtml(coverLetterContentSchema.shape.content.parse(input.content));
		return updateRevision(input, changes);
	},
	refreshStyle: async (input: RevisionInput & { resumeId: string }) => {
		const letter = await getById(input);
		const style = await getResumeStyle(input.userId, input.resumeId, letter.style.sectionId, letter.style.itemId);
		return updateRevision(input, { style, sourceResumeId: input.resumeId });
	},
	duplicate: async (input: OwnedId & { name?: string | undefined }) => {
		const letter = await getById(input);
		return insert({ ...letter, userId: input.userId, name: input.name ?? `${letter.name} (copy)`.slice(0, 100) });
	},
	delete: async (input: RevisionInput): Promise<void> => {
		const rows = await db
			.delete(schema.coverLetter)
			.where(
				and(
					eq(schema.coverLetter.id, input.id),
					eq(schema.coverLetter.userId, input.userId),
					eq(schema.coverLetter.revision, input.expectedRevision),
				),
			)
			.returning({ id: schema.coverLetter.id });
		if (rows.length) return;
		await getById(input);
		throw new ORPCError("CONFLICT", { message: "This cover letter changed elsewhere. Reload it before deleting." });
	},
	copyEmbedded: async (input: {
		userId: string;
		resumeId: string;
		sectionId: string;
		itemId: string;
		name?: string | undefined;
	}) => {
		const resume = await resumeService.getById({ userId: input.userId, id: input.resumeId });
		const data = resumeDataSchema.parse(resume.data);
		const section = data.customSections.find((item) => item.id === input.sectionId && item.type === "cover-letter");
		const item = section?.items.find((entry) => entry.id === input.itemId);
		if (!item) throw new ORPCError("NOT_FOUND");
		const letter = coverLetterItemSchema.parse(item);
		return insert({
			userId: input.userId,
			name: input.name ?? (section?.title || "Cover Letter").slice(0, 100),
			recipient: letter.recipient,
			content: letter.content,
			style: copyCoverLetterStyle(data, input.sectionId, input.itemId),
			sourceResumeId: input.resumeId,
		});
	},
	export: async (input: OwnedId): Promise<CoverLetterDocument> => {
		const letter = await getById(input);
		return coverLetterDocumentSchema.parse({ ...letter, format: "reactive-resume-cover-letter", version: 1 });
	},
	import: (input: { userId: string; document: CoverLetterDocument }) => {
		const document = coverLetterDocumentSchema.parse(input.document);
		return insert({ ...document, userId: input.userId });
	},
};
