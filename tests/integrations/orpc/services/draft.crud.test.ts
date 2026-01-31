/**
 * @packageDocumentation
 *
 * @remarks
 * Validates CRUD behavior for the Draft service using an in-memory Postgres instance.
 * The intent is to ensure basic persistence semantics and user scoping are correct
 * without relying on external infrastructure.
 */
import { ORPCError } from "@orpc/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
	createDraftDataWithDetails,
	createEmptyDraftData,
	resetDraftServiceTestContext,
	setupDraftServiceTestContext,
	teardownDraftServiceTestContext,
} from "./draft-test-helpers";

let draftService: typeof import("@/integrations/orpc/services/draft/draft").draftService;

beforeAll(async () => {
	({ draftService } = await setupDraftServiceTestContext());
});

beforeEach(async () => {
	await resetDraftServiceTestContext();
});

afterAll(async () => {
	await teardownDraftServiceTestContext();
});

/**
 * @remarks
 * Exercises create and getById for persisted drafts.
 */
describe("draftService.create/getById", () => {
	/**
	 * @remarks
	 * Persists a draft payload and verifies retrieval by identifier.
	 */
	it("creates and retrieves a draft payload", async () => {
		const userId = "00000000-0000-0000-0000-000000000001";
		const payload = createEmptyDraftData();

		const draftId = await draftService.create({ userId, data: payload });
		const record = await draftService.getById({ id: draftId, userId });

		expect(record.id).toBe(draftId);
		expect(record.data).toEqual(payload);
	});

	/**
	 * @remarks
	 * Ensures access is scoped to the owning user.
	 */
	it("rejects retrieval for a non-owning user", async () => {
		const ownerId = "00000000-0000-0000-0000-000000000002";
		const otherUserId = "00000000-0000-0000-0000-000000000003";
		const draftId = await draftService.create({ userId: ownerId, data: createEmptyDraftData() });

		await expect(draftService.getById({ id: draftId, userId: otherUserId })).rejects.toBeInstanceOf(ORPCError);
	});
});

/**
 * @remarks
 * Validates list behavior and user scoping.
 */
describe("draftService.list", () => {
	/**
	 * @remarks
	 * Lists only drafts belonging to the requesting user.
	 */
	it("returns only drafts scoped to the user", async () => {
		const userId = "00000000-0000-0000-0000-000000000010";
		const otherUserId = "00000000-0000-0000-0000-000000000011";

		const firstId = await draftService.create({ userId, data: createEmptyDraftData() });
		const secondId = await draftService.create({ userId, data: createEmptyDraftData() });
		await draftService.create({ userId: otherUserId, data: createEmptyDraftData() });

		const list = await draftService.list({ userId });
		const ids = list.map((item) => item.id);

		expect(list).toHaveLength(2);
		expect(ids).toEqual(expect.arrayContaining([firstId, secondId]));
	});
});

/**
 * @remarks
 * Validates update semantics and ownership checks.
 */
describe("draftService.update", () => {
	/**
	 * @remarks
	 * Replaces the persisted draft payload with new data.
	 */
	it("replaces draft data with the provided payload", async () => {
		const userId = "00000000-0000-0000-0000-000000000020";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });
		const updatedPayload = createDraftDataWithDetails();

		await draftService.update({ id: draftId, userId, data: updatedPayload });
		const record = await draftService.getById({ id: draftId, userId });

		expect(record.data).toEqual(updatedPayload);
		expect(record.data.basics.name).toBe("Ada Lovelace");
	});

	/**
	 * @remarks
	 * Ensures that users cannot update drafts they do not own.
	 */
	it("rejects updates from non-owning users", async () => {
		const ownerId = "00000000-0000-0000-0000-000000000021";
		const otherUserId = "00000000-0000-0000-0000-000000000022";
		const draftId = await draftService.create({ userId: ownerId, data: createEmptyDraftData() });

		await expect(
			draftService.update({ id: draftId, userId: otherUserId, data: createDraftDataWithDetails() }),
		).rejects.toBeInstanceOf(ORPCError);
	});
});

/**
 * @remarks
 * Validates deletion semantics and ownership checks.
 */
describe("draftService.delete", () => {
	/**
	 * @remarks
	 * Removes a draft and ensures it is no longer retrievable.
	 */
	it("deletes a draft and blocks retrieval", async () => {
		const userId = "00000000-0000-0000-0000-000000000030";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });

		await draftService.delete({ id: draftId, userId });
		await expect(draftService.getById({ id: draftId, userId })).rejects.toBeInstanceOf(ORPCError);
	});

	/**
	 * @remarks
	 * Ensures drafts cannot be deleted by non-owning users.
	 */
	it("rejects deletion from non-owning users", async () => {
		const ownerId = "00000000-0000-0000-0000-000000000031";
		const otherUserId = "00000000-0000-0000-0000-000000000032";
		const draftId = await draftService.create({ userId: ownerId, data: createEmptyDraftData() });

		await expect(draftService.delete({ id: draftId, userId: otherUserId })).rejects.toBeInstanceOf(ORPCError);
		const record = await draftService.getById({ id: draftId, userId: ownerId });
		expect(record.id).toBe(draftId);
	});
});
