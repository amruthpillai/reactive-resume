/**
 * @packageDocumentation
 *
 * @remarks
 * Validates CRUD behavior for the Draft service using an in-memory Postgres instance.
 * The intent is to ensure basic persistence semantics and user scoping are correct
 * without relying on external infrastructure.
 */
import { ORPCError } from "@orpc/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { draftFactory } from "@/schema/draft/data";
import {
	createDraftDataWithDetails,
	createEmptyDraftData,
	resetDraftServiceTestContext,
	setupDraftServiceTestContext,
	teardownDraftServiceTestContext,
} from "./draft-test-helpers";

let draftService: typeof import("@/integrations/orpc/services/draft").draftService;

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
	 * Ensures create uses the canonical empty draft factory when no payload is provided.
	 */
	it("creates an empty draft when data is omitted", async () => {
		const userId = "00000000-0000-0000-0000-000000000004";
		const draftId = await draftService.create({ userId });

		const record = await draftService.getById({ id: draftId, userId });

		expect(record.data).toEqual(createEmptyDraftData());
	});

	/**
	 * @remarks
	 * Ensures invalid create payloads are rejected during normalization.
	 */
	it("rejects invalid partial create payloads", async () => {
		const userId = "00000000-0000-0000-0000-000000000006";
		const invalidPayload: unknown = {
			basics: {
				website: {
					url: 123,
				},
			},
		};

		await expect(draftService.create({ userId, data: invalidPayload })).rejects.toBeInstanceOf(ORPCError);
	});

	/**
	 * @remarks
	 * Ensures partial payloads are deep-merged onto the empty skeleton.
	 */
	it("deep merges partial create payloads with the empty skeleton", async () => {
		const userId = "00000000-0000-0000-0000-000000000005";
		const partialPayload: unknown = {
			basics: {
				name: "Ada Lovelace",
				website: { url: "https://example.com" },
			},
			summary: {
				content: "First programmer.",
			},
			metadata: {
				notes: "Initial agent capture.",
			},
			sections: {
				experience: {
					title: "Experience",
				},
			},
		};

		const draftId = await draftService.create({ userId, data: partialPayload });
		const record = await draftService.getById({ id: draftId, userId });

		expect(record.data.basics.name).toBe("Ada Lovelace");
		expect(record.data.basics.headline).toBe("");
		expect(record.data.basics.website.url).toBe("https://example.com");
		expect(record.data.basics.website.label).toBe("");
		expect(record.data.summary.content).toBe("First programmer.");
		expect(record.data.summary.title).toBe("");
		expect(record.data.metadata.notes).toBe("Initial agent capture.");
		expect(record.data.sections.experience.title).toBe("Experience");
		expect(record.data.sections.experience.items).toHaveLength(0);
		expect(record.data.sections.skills.title).toBe("");
	});

	/**
	 * @remarks
	 * Ensures array fields are replaced (not concatenated) during create merges.
	 */
	it("replaces array fields when merging partial create payloads", async () => {
		const userId = "00000000-0000-0000-0000-000000000006";

		const baseDraft = draftFactory.draft.empty();
		const baseCustomField = draftFactory.basics.customField.empty("base-custom-field");
		baseCustomField.text = "Base Field";
		baseDraft.basics.customFields = [baseCustomField];

		const baseCustomSection = draftFactory.customSections.item.empty("base-custom-section", "projects");
		const baseCustomItem = draftFactory.sections.item.empty("projects", "base-project");
		baseCustomItem.name = "Base Project";
		baseCustomSection.items = [baseCustomItem];
		baseDraft.customSections = [baseCustomSection];

		const baseSkill = draftFactory.sections.item.empty("skills", "base-skill");
		baseSkill.name = "Base Skill";
		baseDraft.sections.skills.items = [baseSkill];

		const patchCustomField = draftFactory.basics.customField.empty("patch-custom-field");
		patchCustomField.text = "Patch Field";
		const patchCustomSection = draftFactory.customSections.item.empty("patch-custom-section", "projects");
		const patchCustomItem = draftFactory.sections.item.empty("projects", "patch-project");
		patchCustomItem.name = "Patch Project";
		patchCustomSection.items = [patchCustomItem];
		const patchSkill = draftFactory.sections.item.empty("skills", "patch-skill");
		patchSkill.name = "Patch Skill";

		const partialPayload: unknown = {
			basics: {
				customFields: [patchCustomField],
			},
			customSections: [patchCustomSection],
			sections: {
				skills: {
					title: "Skills",
					items: [patchSkill],
				},
			},
		};

		const factorySpy = vi.spyOn(draftFactory.draft, "empty").mockReturnValue(baseDraft);

		try {
			const draftId = await draftService.create({ userId, data: partialPayload });
			const record = await draftService.getById({ id: draftId, userId });

			expect(record.data.basics.customFields).toHaveLength(1);
			expect(record.data.basics.customFields[0]?.id).toBe("patch-custom-field");
			expect(record.data.basics.customFields.map((item) => item.id)).not.toContain("base-custom-field");

			expect(record.data.customSections).toHaveLength(1);
			expect(record.data.customSections[0]?.id).toBe("patch-custom-section");
			expect(record.data.customSections[0]?.items[0]?.id).toBe("patch-project");
			expect(record.data.customSections.map((section) => section.id)).not.toContain("base-custom-section");

			expect(record.data.sections.skills.items).toHaveLength(1);
			expect(record.data.sections.skills.items[0]?.id).toBe("patch-skill");
			expect(record.data.sections.skills.items.map((item) => item.id)).not.toContain("base-skill");
		} finally {
			factorySpy.mockRestore();
		}
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
