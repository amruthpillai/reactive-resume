import type { ActivityEvent, AiMetadata, ApplicationStatus, Contact } from "@reactive-resume/schema/applications/data";
import type { ApplicationDocumentKind } from "../../dto/application";
import { ORPCError } from "@orpc/client";
import { and, arrayContains, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import * as schema from "@reactive-resume/db/schema";
import { STAGES } from "@reactive-resume/schema/applications/data";
import { generateId } from "@reactive-resume/utils/string";
import { resumeService } from "../resume/service";
import { getStorageService, uploadFile } from "../storage/service";

const stageLabel = (status: ApplicationStatus) => STAGES.find((s) => s.value === status)?.label ?? status;

function activityEvent(type: ActivityEvent["type"], text: string): ActivityEvent {
	return { id: generateId(), type, text, at: new Date() };
}

// Editable fields shared by create/update. Kept explicit so Drizzle's typed insert/update
// checks catch mistakes; `status`/`activity` are handled separately (auto-logging).
// `| undefined` is explicit throughout because the DTO layer (zod `.partial()`) produces
// `T | undefined` and the repo compiles with exactOptionalPropertyTypes.
type EditableFields = {
	company?: string | undefined;
	role?: string | undefined;
	location?: string | null | undefined;
	salary?: string | null | undefined;
	source?: string | null | undefined;
	sourceUrl?: string | null | undefined;
	jobDescription?: string | null | undefined;
	notes?: string | null | undefined;
	resumeFileUrl?: string | null | undefined;
	resumeFileName?: string | null | undefined;
	coverLetterUrl?: string | null | undefined;
	coverLetterName?: string | null | undefined;
	followUpAt?: Date | null | undefined;
	followUpNote?: string | null | undefined;
	contacts?: Contact[] | undefined;
	resumeId?: string | null | undefined;
	tags?: string[] | undefined;
};

// All reads/writes filter on userId — the single ownership guard every route funnels through.
async function requireOwned(id: string, userId: string) {
	const [row] = await db
		.select()
		.from(schema.application)
		.where(and(eq(schema.application.id, id), eq(schema.application.userId, userId)));
	if (!row) throw new ORPCError("NOT_FOUND");
	return row;
}

async function assertOwnedResume(userId: string, resumeId: string | null | undefined) {
	if (!resumeId) return;
	await resumeService.getById({ id: resumeId, userId });
}

async function assertOwnedResumes(userId: string, resumeIds: (string | null | undefined)[]) {
	const uniqueResumeIds = [...new Set(resumeIds.filter((id): id is string => !!id))];
	await Promise.all(uniqueResumeIds.map((resumeId) => assertOwnedResume(userId, resumeId)));
}

function storageKeyFromApplicationUrl(userId: string, value: string | null | undefined) {
	if (!value) return null;

	let pathname: string;
	try {
		pathname = value.startsWith("/") ? value : new URL(value).pathname;
	} catch {
		return null;
	}

	const match = pathname.match(/^\/(?:api\/)?uploads\/(.+)$/);
	if (!match?.[1]) return null;

	const key = `uploads/${match[1]}`;
	return key.startsWith(`uploads/${userId}/`) ? key : null;
}

async function deleteApplicationAttachments(
	userId: string,
	applications: { resumeFileUrl?: string | null; coverLetterUrl?: string | null }[],
) {
	const candidateKeys = [
		...new Set(
			applications.flatMap((application) => [
				storageKeyFromApplicationUrl(userId, application.resumeFileUrl),
				storageKeyFromApplicationUrl(userId, application.coverLetterUrl),
			]),
		),
	].filter((key): key is string => !!key);

	if (candidateKeys.length === 0) return;

	const remainingApplications = await db
		.select({
			resumeFileUrl: schema.application.resumeFileUrl,
			coverLetterUrl: schema.application.coverLetterUrl,
		})
		.from(schema.application)
		.where(eq(schema.application.userId, userId));

	const referencedKeys = new Set(
		remainingApplications.flatMap((application) => [
			storageKeyFromApplicationUrl(userId, application.resumeFileUrl),
			storageKeyFromApplicationUrl(userId, application.coverLetterUrl),
		]),
	);
	const keys = candidateKeys.filter((key) => !referencedKeys.has(key));

	if (keys.length === 0) return;
	const storageService = getStorageService();
	await Promise.allSettled(keys.map((key) => storageService.delete(key)));
}

function documentFields(kind: ApplicationDocumentKind) {
	return kind === "resume"
		? ({
				url: "resumeFileUrl",
				name: "resumeFileName",
			} as const)
		: ({
				url: "coverLetterUrl",
				name: "coverLetterName",
			} as const);
}

const stripUserId = <T extends { userId: string }>(row: T) => {
	const { userId: _userId, ...rest } = row;
	return rest;
};

export const applicationService = {
	list: async (input: { userId: string; status?: ApplicationStatus; tags?: string[]; includeArchived?: boolean }) => {
		const rows = await db
			.select()
			.from(schema.application)
			.where(
				and(
					eq(schema.application.userId, input.userId),
					input.status ? eq(schema.application.status, input.status) : undefined,
					input.tags && input.tags.length > 0 ? arrayContains(schema.application.tags, input.tags) : undefined,
				),
			)
			.orderBy(desc(schema.application.updatedAt));

		return rows.filter((row) => input.includeArchived || !row.archived).map(stripUserId);
	},

	getById: async (input: { id: string; userId: string }) => {
		return stripUserId(await requireOwned(input.id, input.userId));
	},

	create: async (
		input: EditableFields & { userId: string; company: string; role: string; status?: ApplicationStatus | undefined },
	) => {
		const { userId, status, ...fields } = input;
		const id = generateId();

		await assertOwnedResume(userId, fields.resumeId);

		await db.insert(schema.application).values({
			id,
			userId,
			status: status ?? "saved",
			activity: [activityEvent("created", `Added to ${stageLabel(status ?? "saved")}`)],
			...fields,
		});

		return id;
	},

	importMany: async (input: {
		userId: string;
		items: (EditableFields & { company: string; role: string; status?: ApplicationStatus | undefined })[];
	}) => {
		if (input.items.length === 0) return { imported: 0 };

		await assertOwnedResumes(
			input.userId,
			input.items.map((item) => item.resumeId),
		);

		const values = input.items.map(({ status, ...fields }) => ({
			id: generateId(),
			userId: input.userId,
			status: status ?? ("saved" as ApplicationStatus),
			activity: [activityEvent("created", `Added to ${stageLabel(status ?? "saved")}`)],
			...fields,
		}));

		const rows = await db.insert(schema.application).values(values).returning({ id: schema.application.id });
		return { imported: rows.length };
	},

	update: async (
		input: EditableFields & {
			id: string;
			userId: string;
			status?: ApplicationStatus | undefined;
			archived?: boolean | undefined;
		},
	) => {
		await requireOwned(input.id, input.userId);

		const { id, userId, status, archived, ...fields } = input;
		await assertOwnedResume(userId, fields.resumeId);

		// Append in SQL so concurrent notes/stage events are not overwritten by a stale array.
		const activityExpr =
			status !== undefined
				? sql`case when ${schema.application.status} <> ${status}
							then ${schema.application.activity} || ${JSON.stringify([activityEvent("stage", `Moved to ${stageLabel(status)}`)])}::jsonb
							else ${schema.application.activity} end`
				: undefined;

		const [updated] = await db
			.update(schema.application)
			.set({
				...fields,
				...(status !== undefined ? { status } : {}),
				...(archived !== undefined ? { archived } : {}),
				...(activityExpr ? { activity: activityExpr } : {}),
			})
			.where(and(eq(schema.application.id, id), eq(schema.application.userId, userId)))
			.returning();

		if (!updated) throw new ORPCError("NOT_FOUND");
		return stripUserId(updated);
	},

	attachDocument: async (input: {
		id: string;
		userId: string;
		kind: ApplicationDocumentKind;
		fileName: string;
		data: Uint8Array;
		contentType: string;
	}) => {
		if (input.contentType !== "application/pdf") {
			throw new ORPCError("BAD_REQUEST", { message: "Application documents must be PDF files." });
		}

		const existing = await requireOwned(input.id, input.userId);
		const fields = documentFields(input.kind);
		const uploaded = await uploadFile({
			userId: input.userId,
			data: input.data,
			contentType: input.contentType,
		});

		try {
			const updated = await applicationService.update({
				id: input.id,
				userId: input.userId,
				[fields.url]: uploaded.url,
				[fields.name]: input.fileName,
			});

			await deleteApplicationAttachments(input.userId, [
				{
					resumeFileUrl: fields.url === "resumeFileUrl" ? existing.resumeFileUrl : null,
					coverLetterUrl: fields.url === "coverLetterUrl" ? existing.coverLetterUrl : null,
				},
			]);

			return updated;
		} catch (error) {
			await getStorageService()
				.delete(uploaded.key)
				.catch(() => false);
			throw error;
		}
	},

	removeDocument: async (input: { id: string; userId: string; kind: ApplicationDocumentKind }) => {
		const existing = await requireOwned(input.id, input.userId);
		const fields = documentFields(input.kind);
		const updated = await applicationService.update({
			id: input.id,
			userId: input.userId,
			[fields.url]: null,
			[fields.name]: null,
		});

		await deleteApplicationAttachments(input.userId, [
			{
				resumeFileUrl: fields.url === "resumeFileUrl" ? existing.resumeFileUrl : null,
				coverLetterUrl: fields.url === "coverLetterUrl" ? existing.coverLetterUrl : null,
			},
		]);

		return updated;
	},

	// Persist AI-owned enrichment (match score + freeform metadata). Separate from the editable
	// update path so these fields are only ever written by the AI procedures.
	setAiResult: async (input: {
		id: string;
		userId: string;
		matchScore?: number | null;
		aiMetadata?: AiMetadata | null;
	}) => {
		const [updated] = await db
			.update(schema.application)
			.set({
				...(input.matchScore !== undefined ? { matchScore: input.matchScore } : {}),
				...(input.aiMetadata !== undefined ? { aiMetadata: input.aiMetadata } : {}),
			})
			.where(and(eq(schema.application.id, input.id), eq(schema.application.userId, input.userId)))
			.returning();

		if (!updated) throw new ORPCError("NOT_FOUND");
		return stripUserId(updated);
	},

	addNote: async (input: { id: string; userId: string; text: string }) => {
		// Append in a single statement (activity || [event]) so concurrent notes can't drop each
		// other via read-then-write; ownership is enforced by the WHERE clause.
		const event = activityEvent("note", input.text);
		const [updated] = await db
			.update(schema.application)
			.set({ activity: sql`${schema.application.activity} || ${JSON.stringify([event])}::jsonb` })
			.where(and(eq(schema.application.id, input.id), eq(schema.application.userId, input.userId)))
			.returning();

		if (!updated) throw new ORPCError("NOT_FOUND");
		return stripUserId(updated);
	},

	delete: async (input: { id: string; userId: string }) => {
		const existing = await requireOwned(input.id, input.userId);
		const result = await db
			.delete(schema.application)
			.where(and(eq(schema.application.id, input.id), eq(schema.application.userId, input.userId)))
			.returning({ id: schema.application.id });
		if (result.length === 0) throw new ORPCError("NOT_FOUND");
		await deleteApplicationAttachments(input.userId, [existing]);
	},

	bulkUpdate: async (input: {
		userId: string;
		ids: string[];
		status?: ApplicationStatus | undefined;
		archived?: boolean | undefined;
		addTags?: string[] | undefined;
	}) => {
		const scope = and(inArray(schema.application.id, input.ids), eq(schema.application.userId, input.userId));

		// Tags: union the new tags into the existing array (de-duplicated) in a single statement.
		// Build an explicit `array[$1, $2]` — drizzle renders a bare JS array as a tuple `($1,$2)`,
		// which can't be cast to text[].
		const tagsExpr =
			input.addTags && input.addTags.length > 0
				? sql`(select array(select distinct unnest(${schema.application.tags} || array[${sql.join(
						input.addTags.map((tag) => sql`${tag}`),
						sql`, `,
					)}]::text[])))`
				: undefined;

		// Stage moves must log a timeline event on every row that actually changed — mirror the
		// single-item update path. Append the event only where the current status differs.
		const activityExpr =
			input.status !== undefined
				? sql`case when ${schema.application.status} <> ${input.status}
						then ${schema.application.activity} || ${JSON.stringify([activityEvent("stage", `Moved to ${stageLabel(input.status)}`)])}::jsonb
						else ${schema.application.activity} end`
				: undefined;

		const rows = await db
			.update(schema.application)
			.set({
				...(input.status !== undefined ? { status: input.status } : {}),
				...(activityExpr ? { activity: activityExpr } : {}),
				...(input.archived !== undefined ? { archived: input.archived } : {}),
				...(tagsExpr ? { tags: tagsExpr } : {}),
			})
			.where(scope)
			.returning({ id: schema.application.id });

		return { updated: rows.length };
	},

	bulkDelete: async (input: { userId: string; ids: string[] }) => {
		const existing = await db
			.select()
			.from(schema.application)
			.where(and(inArray(schema.application.id, input.ids), eq(schema.application.userId, input.userId)));
		const rows = await db
			.delete(schema.application)
			.where(and(inArray(schema.application.id, input.ids), eq(schema.application.userId, input.userId)))
			.returning({ id: schema.application.id });
		await deleteApplicationAttachments(
			input.userId,
			existing.filter((application) => rows.some((row) => row.id === application.id)),
		);
		return { deleted: rows.length };
	},

	// Raw counts for Insights; funnel/sankey/tiles are derived client-side from these.
	stats: async (input: { userId: string }) => {
		const scope = and(eq(schema.application.userId, input.userId), eq(schema.application.archived, false));

		const byStage = await db
			.select({ status: schema.application.status, count: sql<number>`count(*)::int` })
			.from(schema.application)
			.where(scope)
			.groupBy(schema.application.status);

		const bySource = await db
			.select({ source: schema.application.source, count: sql<number>`count(*)::int` })
			.from(schema.application)
			.where(scope)
			.groupBy(schema.application.source);

		const total = byStage.reduce((sum, row) => sum + row.count, 0);

		return {
			total,
			byStage,
			bySource: bySource
				.filter((row): row is { source: string; count: number } => !!row.source)
				.sort((a, b) => b.count - a.count),
		};
	},

	listTags: async (input: { userId: string }) => {
		const rows = await db
			.select({ tag: sql<string>`distinct unnest(${schema.application.tags})` })
			.from(schema.application)
			.where(eq(schema.application.userId, input.userId));

		return rows.map((row) => row.tag).sort((a, b) => a.localeCompare(b));
	},
};
