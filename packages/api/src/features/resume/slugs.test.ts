import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const dbMock = vi.hoisted(() => ({ insert: vi.fn(), delete: vi.fn(), select: vi.fn() }));
vi.mock("@reactive-resume/db/client", () => ({ db: dbMock }));

const { matchesSlug, recordSlugChange } = await import("./slugs");

beforeEach(() => {
	for (const mock of Object.values(dbMock)) mock.mockReset();
});

describe("recordSlugChange", () => {
	it("frees the new address from old redirects and keeps the old one for 30 days", async () => {
		const deleteWhere = vi.fn(async () => undefined);
		dbMock.delete.mockReturnValue({ where: deleteWhere });
		const onConflictDoUpdate = vi.fn(async () => undefined);
		const values = vi.fn((_input: { expiresAt: Date }) => ({ onConflictDoUpdate }));
		dbMock.insert.mockReturnValue({ values });

		await recordSlugChange(dbMock as never, { userId: "u1", resumeId: "r1", from: "old", to: "new" });

		expect(deleteWhere).toHaveBeenCalled();
		expect(values).toHaveBeenCalledWith(expect.objectContaining({ userId: "u1", resumeId: "r1", slug: "old" }));
		const expiresIn = (values.mock.calls[0]?.[0].expiresAt.getTime() ?? 0) - Date.now();
		expect(Math.round(expiresIn / (24 * 60 * 60 * 1000))).toBe(30);
		expect(onConflictDoUpdate).toHaveBeenCalled();
	});
});

describe("matchesSlug", () => {
	it("builds condition checking resume slug or unexpired redirect subquery", async () => {
		const { PgDialect } = await import("drizzle-orm/pg-core");
		const { drizzle } = await import("drizzle-orm/node-postgres");
		const testDb = drizzle({ client: {} as never });
		dbMock.select.mockImplementation((fields?: unknown) => testDb.select(fields as never));

		const condition = matchesSlug("old-slug");
		if (!condition) throw new Error("Expected condition");
		const query = new PgDialect().sqlToQuery(condition);

		expect(query.sql).toContain('"resume"."slug" = $1');
		expect(query.sql).toContain('"resume_slug_redirect"."slug" = $2');
		expect(query.sql).toContain('"resume_slug_redirect"."user_id" = "resume"."user_id"');
		expect(query.sql).toContain('"resume_slug_redirect"."expires_at" > now()');
		expect(query.params).toEqual(["old-slug", "old-slug"]);
	});
});
