/**
 * @packageDocumentation
 *
 * @remarks
 * Exercises the Draft command/operation API using an in-memory Postgres instance.
 * The goal is to validate that batched operations mutate persisted drafts as expected,
 * without relying on an external database.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { DraftOperation } from "@/schema/draft/operations";
import {
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
 * Validates that the draft service applies a batched set of operations in order.
 */
describe("draftService.applyOperations", () => {
	/**
	 * @remarks
	 * Applies replace-style operations and verifies persisted state changes.
	 */
	it("applies batched operations to a persisted draft", async () => {
		const userId = "00000000-0000-0000-0000-000000000001";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });

		const operations: DraftOperation[] = [
			{
				op: "replaceBasics",
				data: {
					name: "Ada Lovelace",
					headline: "Analyst",
					email: "ada@example.com",
					phone: "",
					location: "London",
					website: { label: "Portfolio", url: "https://example.com" },
					customFields: [],
				},
			},
			{
				op: "replaceSummary",
				data: {
					title: "Summary",
					content: "First programmer.",
				},
			},
			{
				op: "replaceSection",
				section: "experience",
				data: {
					title: "Experience",
					items: [],
				},
			},
		];

		await draftService.applyOperations({ id: draftId, userId, operations });

		const updated = await draftService.getById({ id: draftId, userId });
		expect(updated.data.basics.name).toBe("Ada Lovelace");
		expect(updated.data.basics.location).toBe("London");
		expect(updated.data.summary.content).toBe("First programmer.");
		expect(updated.data.sections.experience.title).toBe("Experience");
	});
});
