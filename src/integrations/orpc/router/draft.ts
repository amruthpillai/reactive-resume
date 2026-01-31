import z from "zod";
import { draftDataSchema } from "@/schema/draft/data";
import { draftOperationListSchema } from "@/schema/draft/operations";
import { protectedProcedure } from "../context";
import { draftService } from "../services/draft";

/**
 * @remarks Lists draft identifiers for the authenticated user.
 * @see draftService.list
 */
const listDrafts = protectedProcedure
	.route({
		method: "GET",
		path: "/draft/list",
		tags: ["Draft"],
		summary: "List drafts",
		description: "List all draft records for the authenticated user.",
	})
	.output(
		z.array(
			z.object({
				id: z.string(),
				createdAt: z.date(),
				updatedAt: z.date(),
			}),
		),
	)
	.handler(async ({ context }) => {
		return draftService.list({ userId: context.user.id });
	});

/**
 * @remarks Retrieves a draft record by identifier.
 * @see draftService.getById
 */
const getDraftById = protectedProcedure
	.route({
		method: "GET",
		path: "/draft/{id}",
		tags: ["Draft"],
		summary: "Get draft by ID",
		description: "Fetch a draft record, including its data payload, by ID.",
	})
	.input(z.object({ id: z.string() }))
	.output(
		z.object({
			id: z.string(),
			data: draftDataSchema,
			createdAt: z.date(),
			updatedAt: z.date(),
		}),
	)
	.handler(async ({ context, input }) => {
		return draftService.getById({ id: input.id, userId: context.user.id });
	});

/**
 * @remarks Creates a draft record for the authenticated user.
 * @see draftService.create
 */
const createDraft = protectedProcedure
	.route({
		method: "POST",
		path: "/draft/create",
		tags: ["Draft"],
		summary: "Create draft",
		description: "Create a draft record by overlaying partial data onto an empty draft.",
	})
	.input(z.object({ data: z.record(z.string(), z.any()).optional() }))
	.output(z.string().describe("The ID of the created draft."))
	.errors({
		DRAFT_INVALID_CREATE: {
			message: "Draft create payload produced an invalid draft.",
			status: 400,
		},
	})
	.handler(async ({ context, input }) => {
		return draftService.create({ userId: context.user.id, data: input.data });
	});

/**
 * @remarks Replaces the data payload for a draft record.
 * @see draftService.update
 */
const updateDraft = protectedProcedure
	.route({
		method: "PUT",
		path: "/draft/{id}",
		tags: ["Draft"],
		summary: "Update draft",
		description: "Replace the draft data payload for a draft record.",
	})
	.input(z.object({ id: z.string(), data: draftDataSchema }))
	.output(z.void())
	.handler(async ({ context, input }) => {
		return draftService.update({ id: input.id, userId: context.user.id, data: input.data });
	});

/**
 * @remarks Applies a batch of draft operations to an existing draft.
 * @see draftService.applyOperations
 */
const applyDraftOperations = protectedProcedure
	.route({
		method: "POST",
		path: "/draft/{id}/ops",
		tags: ["Draft"],
		summary: "Apply draft operations",
		description: "Apply an ordered list of draft operations to a draft record.",
	})
	.input(z.object({ id: z.string(), operations: draftOperationListSchema }))
	.output(z.void())
	.errors({
		DRAFT_INVALID_OPERATION: {
			message: "Draft operations produced an invalid payload.",
			status: 400,
		},
	})
	.handler(async ({ context, input }) => {
		return draftService.applyOperations({ id: input.id, userId: context.user.id, operations: input.operations });
	});

/**
 * @remarks Removes a draft record for the authenticated user.
 * @see draftService.delete
 */
const deleteDraft = protectedProcedure
	.route({
		method: "DELETE",
		path: "/draft/{id}",
		tags: ["Draft"],
		summary: "Delete draft",
		description: "Delete a draft record by ID.",
	})
	.input(z.object({ id: z.string() }))
	.output(z.void())
	.handler(async ({ context, input }) => {
		return draftService.delete({ id: input.id, userId: context.user.id });
	});

/**
 * @remarks Draft router surface area for basic CRUD endpoints.
 * @see listDrafts
 */
export const draftRouter = {
	list: listDrafts,
	getById: getDraftById,
	create: createDraft,
	update: updateDraft,
	applyOperations: applyDraftOperations,
	delete: deleteDraft,
};
