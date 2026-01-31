/**
 * @packageDocumentation
 *
 * @remarks
 * Shared helpers for Draft service tests that rely on an in-memory Postgres instance.
 * The helpers centralize database setup/teardown and provide reusable draft fixtures
 * to keep test suites focused on behavior rather than boilerplate.
 */
import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { vi } from "vitest";
import { schema } from "@/integrations/drizzle";
import type { DraftData } from "@/schema/draft/data";

let testDb: PgliteDatabase<typeof schema>;
let client: PGlite;

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
export const createEmptyDraftData = (): DraftData => ({
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
 * Produces a DraftData payload that differs from the empty baseline, enabling
 * update assertions without deep-partial merges.
 *
 * @returns A DraftData payload with populated basics and summary fields.
 */
export const createDraftDataWithDetails = (): DraftData => ({
	...createEmptyDraftData(),
	basics: {
		name: "Ada Lovelace",
		headline: "Analyst",
		email: "ada@example.com",
		phone: "",
		location: "London",
		website: { label: "Portfolio", url: "https://example.com" },
		customFields: [],
	},
	summary: {
		title: "Summary",
		content: "First programmer.",
	},
});

/**
 * @remarks
 * Initializes an in-memory Postgres database and Drizzle client, then
 * creates the minimal schema required by the draft service.
 *
 * @returns The draft service module bound to the in-memory database.
 */
export const setupDraftServiceTestContext = async () => {
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

	return await import("@/integrations/orpc/services/draft");
};

/**
 * @remarks
 * Removes all draft rows from the in-memory database to keep test isolation.
 */
export const resetDraftServiceTestContext = async (): Promise<void> => {
	await client.exec(`DELETE FROM "draft";`);
};

/**
 * @remarks
 * Closes the in-memory database connection after a test suite completes.
 */
export const teardownDraftServiceTestContext = async (): Promise<void> => {
	await client.close();
};
