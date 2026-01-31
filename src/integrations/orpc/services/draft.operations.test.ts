/**
 * @packageDocumentation
 *
 * @remarks
 * Exercises the Draft command/operation API using an in-memory Postgres instance.
 * The goal is to validate that batched operations mutate persisted drafts as expected,
 * without relying on an external database.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { schema } from "@/integrations/drizzle";
import type { DraftData } from "@/schema/draft/data";
import type { DraftOperation } from "@/schema/draft/operations";

let testDb: PgliteDatabase<typeof schema>;
let client: PGlite;
let draftService: typeof import("./draft").draftService;

/**
 * @remarks
 * Injects an in-memory Drizzle client in place of the production database module.
 * This keeps the service logic intact while avoiding external dependencies.
 */
vi.mock("@/integrations/drizzle/client", () => ({
	db: testDb,
}));

/**
 * @remarks
 * Builds a fully shaped DraftData payload with intentionally empty values.
 * This mirrors the schema contract for iterative drafts.
 *
 * @returns A DraftData-compliant object populated with empty strings and arrays.
 */
const createEmptyDraftData = (): DraftData => ({
	picture: { url: "" },
	basics: {
		name: "",
		headline: "",
		email: "",
		phone: "",
		location: "",
		website: { label: "", url: "" },
		customFields: [],
	},
	summary: { title: "", content: "" },
	sections: {
		profiles: { title: "", items: [] },
		experience: { title: "", items: [] },
		education: { title: "", items: [] },
		projects: { title: "", items: [] },
		skills: { title: "", items: [] },
		languages: { title: "", items: [] },
		interests: { title: "", items: [] },
		awards: { title: "", items: [] },
		certifications: { title: "", items: [] },
		publications: { title: "", items: [] },
		volunteer: { title: "", items: [] },
		references: { title: "", items: [] },
	},
	customSections: [],
	metadata: { notes: "" },
});

/**
 * @remarks
 * Initializes an in-memory Postgres database and Drizzle client, then
 * creates the minimal schema required by the draft service.
 */
const setupInMemoryDatabase = async () => {
	client = new PGlite("memory://");
	await client.waitReady;
	testDb = drizzle({ client, schema });

	await client.exec(`
		CREATE TABLE "draft" (
			"id" uuid PRIMARY KEY,
			"data" jsonb NOT NULL,
			"user_id" uuid NOT NULL,
			"created_at" timestamptz NOT NULL DEFAULT now(),
			"updated_at" timestamptz NOT NULL DEFAULT now()
		);
	`);
};

beforeAll(async () => {
	await setupInMemoryDatabase();
	({ draftService } = await import("./draft"));
});

beforeEach(async () => {
	await client.exec(`DELETE FROM "draft";`);
});

afterAll(async () => {
	await client.close();
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
