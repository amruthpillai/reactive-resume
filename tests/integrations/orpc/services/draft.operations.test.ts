/**
 * @packageDocumentation
 *
 * @remarks
 * Exercises the Draft command/operation API using an in-memory Postgres instance.
 * The goal is to validate that batched operations mutate persisted drafts as expected,
 * without relying on an external database.
 */
import { ORPCError } from "@orpc/client";
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
	 * Applies field-level and item-level operations and verifies persisted state changes.
	 */
	it("applies batched operations to a persisted draft", async () => {
		const userId = "00000000-0000-0000-0000-000000000001";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });

		const operations: DraftOperation[] = [
			{
				op: "setField",
				path: "basics.name",
				value: "Ada Lovelace",
			},
			{
				op: "setField",
				path: "basics.location",
				value: "London",
			},
			{
				op: "setField",
				path: "summary.content",
				value: "First programmer.",
			},
			{
				op: "setField",
				path: "sections.experience.title",
				value: "Experience",
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "experience" },
				items: [{ id: "experience-1", company: "Analytical Engine" }],
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "experience" },
				items: [{ id: "experience-1", position: "Analyst" }],
			},
		];

		await draftService.applyOperations({ id: draftId, userId, operations });

		const updated = await draftService.getById({ id: draftId, userId });
		expect(updated.data.basics.name).toBe("Ada Lovelace");
		expect(updated.data.basics.location).toBe("London");
		expect(updated.data.summary.content).toBe("First programmer.");
		expect(updated.data.sections.experience.title).toBe("Experience");
		expect(updated.data.sections.experience.items[0]?.company).toBe("Analytical Engine");
		expect(updated.data.sections.experience.items[0]?.position).toBe("Analyst");
	});

	/**
	 * @remarks
	 * Applies replace-style operations to validate coverage of swap branches.
	 */
	it("applies replace operations for core draft sections", async () => {
		const userId = "00000000-0000-0000-0000-000000000003";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });

		const operations: DraftOperation[] = [
			{
				op: "replacePicture",
				data: { url: "https://example.com/picture.png" },
			},
			{
				op: "replaceBasics",
				data: {
					name: "Grace Hopper",
					headline: "Computer Scientist",
					email: "grace@example.com",
					phone: "",
					location: "Arlington",
					website: { label: "Profile", url: "https://example.com" },
					customFields: [
						{
							id: "custom-field-1",
							text: "Pioneer",
							link: "",
						},
					],
				},
			},
			{
				op: "replaceSummary",
				data: {
					title: "Summary",
					content: "Built early compiler tooling.",
				},
			},
			{
				op: "replaceMetadata",
				data: {
					notes: "Replaced via batch.",
				},
			},
			{
				op: "replaceSection",
				section: "projects",
				data: {
					title: "Projects",
					items: [
						{
							id: "project-1",
							name: "Compiler Project",
							period: "1952",
							website: { label: "", url: "" },
							description: "Early compiler work.",
						},
					],
				},
			},
			{
				op: "replaceCustomSections",
				data: [
					{
						id: "custom-section-1",
						title: "Highlights",
						type: "projects",
						items: [
							{
								id: "custom-project-1",
								name: "COBOL",
								period: "1959",
								website: { label: "", url: "" },
								description: "Language standardization work.",
							},
						],
					},
				],
			},
		];

		await draftService.applyOperations({ id: draftId, userId, operations });

		const updated = await draftService.getById({ id: draftId, userId });
		const customItem = updated.data.customSections[0]?.items[0];
		const customItemName = customItem && "name" in customItem ? customItem.name : undefined;

		expect(updated.data.picture.url).toBe("https://example.com/picture.png");
		expect(updated.data.basics.name).toBe("Grace Hopper");
		expect(updated.data.basics.customFields[0]?.text).toBe("Pioneer");
		expect(updated.data.summary.content).toBe("Built early compiler tooling.");
		expect(updated.data.metadata.notes).toBe("Replaced via batch.");
		expect(updated.data.sections.projects.items[0]?.name).toBe("Compiler Project");
		expect(customItemName).toBe("COBOL");
	});

	/**
	 * @remarks
	 * Validates partial draft creation followed by multiple operation batches,
	 * ensuring deep-merged defaults persist across iterative updates.
	 */
	it("supports partial create plus multiple operation batches", async () => {
		const userId = "00000000-0000-0000-0000-000000000002";
		const partialPayload: unknown = {
			basics: {
				name: "Initial Name",
				website: { url: "https://initial.example" },
			},
			summary: {
				title: "Snapshot",
			},
			sections: {
				experience: {
					title: "Experience",
				},
			},
			customSections: [
				{
					id: "custom-section-1",
					title: "Highlights",
					type: "projects",
					items: [],
				},
			],
		};

		const draftId = await draftService.create({ userId, data: partialPayload });
		const created = await draftService.getById({ id: draftId, userId });

		expect(created.data.basics.name).toBe("Initial Name");
		expect(created.data.basics.headline).toBe("");
		expect(created.data.basics.website.url).toBe("https://initial.example");
		expect(created.data.basics.website.label).toBe("");
		expect(created.data.summary.title).toBe("Snapshot");
		expect(created.data.summary.content).toBe("");
		expect(created.data.sections.experience.title).toBe("Experience");
		expect(created.data.sections.experience.items).toHaveLength(0);
		expect(created.data.customSections[0]?.id).toBe("custom-section-1");
		expect(created.data.customSections[0]?.items).toHaveLength(0);

		const batchOne: DraftOperation[] = [
			{
				op: "setField",
				path: "basics.headline",
				value: "Computing Pioneer",
			},
			{
				op: "setField",
				path: "summary.content",
				value: "First programmer.",
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "experience" },
				items: [{ id: "experience-1", company: "Analytical Engine" }],
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "experience" },
				items: [{ id: "experience-1", position: "Analyst" }],
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "customField" },
				items: [{ id: "custom-field-1", text: "Open to collaboration" }],
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "customSection", sectionId: "custom-section-1" },
				items: [{ id: "custom-item-1", name: "Project A" }],
			},
		];

		await draftService.applyOperations({ id: draftId, userId, operations: batchOne });

		const afterBatchOne = await draftService.getById({ id: draftId, userId });
		const firstExperience = afterBatchOne.data.sections.experience.items.find((item) => item.id === "experience-1");

		expect(afterBatchOne.data.basics.headline).toBe("Computing Pioneer");
		expect(afterBatchOne.data.summary.title).toBe("Snapshot");
		expect(afterBatchOne.data.summary.content).toBe("First programmer.");
		expect(firstExperience?.company).toBe("Analytical Engine");
		expect(firstExperience?.position).toBe("Analyst");
		expect(firstExperience?.website.label).toBe("");
		expect(firstExperience?.website.url).toBe("");
		expect(afterBatchOne.data.basics.customFields[0]?.text).toBe("Open to collaboration");
		expect(afterBatchOne.data.basics.customFields[0]?.link).toBe("");
		const firstCustomItem = afterBatchOne.data.customSections[0]?.items[0];
		expect(firstCustomItem && "name" in firstCustomItem ? firstCustomItem.name : undefined).toBe("Project A");

		const batchTwo: DraftOperation[] = [
			{
				op: "setField",
				path: "basics.name",
				value: "Ada Lovelace",
			},
			{
				op: "setField",
				path: "metadata.notes",
				value: "Captured by agent.",
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "experience" },
				items: [{ id: "experience-1", location: "London" }],
			},
			{
				op: "itemOps",
				action: "remove",
				target: { kind: "customField" },
				ids: ["custom-field-1"],
			},
			{
				op: "itemOps",
				action: "upsert",
				target: { kind: "section", section: "skills" },
				items: [
					{ id: "skill-1", name: "Mathematics" },
					{ id: "skill-2", name: "Logic" },
				],
			},
			{
				op: "itemOps",
				action: "reorder",
				target: { kind: "section", section: "skills" },
				ids: ["skill-2", "skill-1"],
			},
		];

		await draftService.applyOperations({ id: draftId, userId, operations: batchTwo });

		const afterBatchTwo = await draftService.getById({ id: draftId, userId });
		const updatedExperience = afterBatchTwo.data.sections.experience.items.find((item) => item.id === "experience-1");
		const skillIds = afterBatchTwo.data.sections.skills.items.map((item) => item.id);

		expect(afterBatchTwo.data.basics.name).toBe("Ada Lovelace");
		expect(afterBatchTwo.data.basics.headline).toBe("Computing Pioneer");
		expect(afterBatchTwo.data.metadata.notes).toBe("Captured by agent.");
		expect(updatedExperience?.location).toBe("London");
		expect(updatedExperience?.company).toBe("Analytical Engine");
		expect(afterBatchTwo.data.basics.customFields).toHaveLength(0);
		expect(skillIds).toEqual(["skill-2", "skill-1"]);
	});

	/**
	 * @remarks
	 * Ensures invalid operations are rejected after post-merge validation.
	 */
	it("rejects operations that yield invalid draft payloads", async () => {
		const userId = "00000000-0000-0000-0000-000000000004";
		const draftId = await draftService.create({ userId, data: createEmptyDraftData() });

		const invalidOperation = {
			op: "setField",
			path: "basics.website.url",
			value: 123,
		} as unknown as DraftOperation;

		await expect(
			draftService.applyOperations({ id: draftId, userId, operations: [invalidOperation] }),
		).rejects.toBeInstanceOf(ORPCError);
	});
});
