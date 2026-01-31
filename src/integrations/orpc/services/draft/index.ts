import { ORPCError } from "@orpc/client";
import { and, desc, eq } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { draftDataSchema, draftFactory, type DraftData } from "@/schema/draft/data";
import { type DeepMergeLeafURI, deepmergeCustom } from "deepmerge-ts";
import type { DraftOperation } from "@/schema/draft/operations";
import { generateId } from "@/utils/string";
import { applyItemOpsOperation } from "./item-ops";
import { applySetFieldOperation } from "./set-field";

/**
 * @remarks Identifies plain object values for safe deep merging.
 * @param value - The candidate value to inspect.
 * @returns True when the value is a plain object.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null) return false;
	if (Array.isArray(value)) return false;
	return Object.getPrototypeOf(value) === Object.prototype;
};

/**
 * @remarks Deep merge function that replaces arrays instead of concatenating them.
 */
const deepmergeDraft = deepmergeCustom<
	unknown,
	{
		DeepMergeArraysURI: DeepMergeLeafURI;
	}
>({
	mergeArrays: false,
});

/**
 * @remarks Deeply merges a partial payload onto a base draft shape.
 * @param base - The canonical empty draft payload.
 * @param patch - The partial payload to overlay.
 * @returns A merged draft candidate for validation.
 */
const mergeDraftData = (base: DraftData, patch: unknown): DraftData => {
	const safePatch = isPlainObject(patch) ? patch : {};
	return deepmergeDraft(base, safePatch) as DraftData;
};

/**
 * @remarks Normalizes a partial draft payload into a full DraftData structure.
 * @param data - The partial payload provided by the client.
 * @returns A validated DraftData payload.
 * @throws ORPCError - Thrown when the merged payload is invalid.
 */
const normalizeDraftCreateData = (data?: unknown): DraftData => {
	const base = draftFactory.draft.empty();
	const merged = mergeDraftData(base, data ?? {});
	const validation = draftDataSchema.safeParse(merged);

	if (!validation.success) {
		throw new ORPCError("DRAFT_INVALID_CREATE", {
			status: 400,
			data: validation.error.issues,
			message: "Draft create payload produced an invalid draft.",
		});
	}

	return validation.data;
};

/**
 * @remarks Represents the minimal shape returned for draft listings.
 * @example { id: "uuid", createdAt: new Date(), updatedAt: new Date() }
 */
export type DraftListItem = {
	id: string;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * @remarks Represents a fully loaded draft record for API responses.
 * @example { id: "uuid", data: { picture: { url: "" }, basics: { name: "", headline: "", email: "", phone: "", location: "", website: { label: "", url: "" }, customFields: [] }, summary: { title: "", content: "" }, sections: { profiles: { title: "", items: [] }, experience: { title: "", items: [] }, education: { title: "", items: [] }, projects: { title: "", items: [] }, skills: { title: "", items: [] }, languages: { title: "", items: [] }, interests: { title: "", items: [] }, awards: { title: "", items: [] }, certifications: { title: "", items: [] }, publications: { title: "", items: [] }, volunteer: { title: "", items: [] }, references: { title: "", items: [] } }, customSections: [], metadata: { notes: "" } }, createdAt: new Date(), updatedAt: new Date() }
 */
export type DraftRecord = {
	id: string;
	data: DraftData;
	createdAt: Date;
	updatedAt: Date;
};

/**
 * @remarks Applies a single draft operation to an existing draft payload.
 * @param draft - The current draft payload.
 * @param operation - The operation to apply.
 * @returns The updated draft payload.
 */
const applyDraftOperation = (draft: DraftData, operation: DraftOperation): DraftData => {
	switch (operation.op) {
		case "setField":
			return applySetFieldOperation(draft, operation);
		case "itemOps":
			return applyItemOpsOperation(draft, operation);
		case "replacePicture":
			return { ...draft, picture: operation.data };
		case "replaceBasics":
			return { ...draft, basics: operation.data };
		case "replaceSummary":
			return { ...draft, summary: operation.data };
		case "replaceMetadata":
			return { ...draft, metadata: operation.data };
		case "replaceSection":
			return { ...draft, sections: { ...draft.sections, [operation.section]: operation.data } };
		case "replaceCustomSections":
			return { ...draft, customSections: operation.data };
		default: {
			const _exhaustive: never = operation;
			return _exhaustive;
		}
	}
};

/**
 * @remarks Provides CRUD operations for Draft Resume data scoped to a user.
 * @see DraftData
 */
export const draftService = {
	/**
	 * @remarks Lists all draft records for the owning user.
	 * @param input - The user identity used to scope the lookup.
	 * @returns An ordered list of draft identifiers and timestamps.
	 */
	list: async (input: { userId: string }): Promise<DraftListItem[]> => {
		return db
			.select({
				id: schema.draft.id,
				createdAt: schema.draft.createdAt,
				updatedAt: schema.draft.updatedAt,
			})
			.from(schema.draft)
			.where(eq(schema.draft.userId, input.userId))
			.orderBy(desc(schema.draft.updatedAt));
	},

	/**
	 * @remarks Retrieves a single draft by its identifier.
	 * @param input - The draft and user identity to scope the lookup.
	 * @returns The matching draft record.
	 * @throws ORPCError - Thrown when the draft does not exist.
	 */
	getById: async (input: { id: string; userId: string }): Promise<DraftRecord> => {
		const [draft] = await db
			.select({
				id: schema.draft.id,
				data: schema.draft.data,
				createdAt: schema.draft.createdAt,
				updatedAt: schema.draft.updatedAt,
			})
			.from(schema.draft)
			.where(and(eq(schema.draft.id, input.id), eq(schema.draft.userId, input.userId)));

		if (!draft) throw new ORPCError("NOT_FOUND");

		return draft;
	},

	/**
	 * @remarks Creates a new draft record for a user.
	 * @param input - The partial draft data to persist.
	 * @returns The identifier of the newly created draft.
	 * @throws ORPCError - Thrown when the provided payload is invalid.
	 */
	create: async (input: { userId: string; data?: unknown }): Promise<string> => {
		const id = generateId();
		const data = normalizeDraftCreateData(input.data);

		await db.insert(schema.draft).values({
			id,
			userId: input.userId,
			data,
		});

		return id;
	},

	/**
	 * @remarks Updates a draft by replacing its stored data payload.
	 * @param input - The draft identifier, owner, and new data payload.
	 * @returns A void promise when the update is complete.
	 * @throws ORPCError - Thrown when the draft does not exist.
	 */
	update: async (input: { id: string; userId: string; data: DraftData }): Promise<void> => {
		const updated = await db
			.update(schema.draft)
			.set({ data: input.data })
			.where(and(eq(schema.draft.id, input.id), eq(schema.draft.userId, input.userId)))
			.returning({ id: schema.draft.id });

		if (updated.length === 0) throw new ORPCError("NOT_FOUND");
	},

	/**
	 * @remarks Deletes a draft record by its identifier.
	 * @param input - The draft identifier and owner to scope deletion.
	 * @returns A void promise when deletion is complete.
	 * @throws ORPCError - Thrown when the draft does not exist.
	 */
	delete: async (input: { id: string; userId: string }): Promise<void> => {
		const deleted = await db
			.delete(schema.draft)
			.where(and(eq(schema.draft.id, input.id), eq(schema.draft.userId, input.userId)))
			.returning({ id: schema.draft.id });

		if (deleted.length === 0) throw new ORPCError("NOT_FOUND");
	},

	/**
	 * @remarks Applies an ordered list of draft operations to a draft payload.
	 * @param input - The draft identifier, owner, and list of operations.
	 * @returns A void promise when the draft has been updated.
	 * @throws ORPCError - Thrown when the draft does not exist.
	 * @throws ORPCError - Thrown when the resulting draft payload is invalid.
	 */
	applyOperations: async (input: { id: string; userId: string; operations: DraftOperation[] }): Promise<void> => {
		const current = await draftService.getById({ id: input.id, userId: input.userId });

		const nextDraft = input.operations.reduce(applyDraftOperation, current.data);
		const validation = draftDataSchema.safeParse(nextDraft);

		if (!validation.success) {
			throw new ORPCError("DRAFT_INVALID_OPERATION", {
				status: 400,
				data: validation.error.issues,
				message: "Draft operations produced an invalid payload.",
			});
		}

		await db
			.update(schema.draft)
			.set({ data: validation.data })
			.where(and(eq(schema.draft.id, input.id), eq(schema.draft.userId, input.userId)));
	},
};
