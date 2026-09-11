import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ORPCError } from "@orpc/client";
import { createRouterClient } from "@orpc/server";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const fixture = vi.hoisted(() => ({
	db: undefined as ReturnType<typeof drizzle> | undefined,
	pool: undefined as Pool | undefined,
}));
vi.mock("@reactive-resume/db/client", () => ({
	get db() {
		return fixture.db;
	},
}));
vi.mock("../../context", async () => {
	const { os } = await vi.importActual<typeof import("@orpc/server")>("@orpc/server");
	return { protectedProcedure: os.$context<{ user: { id: string } }>() };
});
vi.mock("../resume/service", () => ({
	resumeService: {
		getById: async ({ id, userId }: { id: string; userId: string }) => {
			const result = await getPool().query("SELECT id, data FROM resume WHERE id=$1 AND user_id=$2", [id, userId]);
			if (!result.rows[0]) throw new ORPCError("NOT_FOUND");
			return result.rows[0];
		},
	},
}));

function getPool(): Pool {
	if (!fixture.pool) throw new Error("Test database is not initialized");
	return fixture.pool;
}

// Opt-in real PostgreSQL tests. Use a disposable database; all tables live in an isolated schema.
describe.skipIf(!process.env.COVER_LETTER_TEST_DATABASE_URL)("cover-letter owned persistence", () => {
	let service: typeof import("./service").coverLetterService;
	const schemaName = `cover_letter_test_${randomUUID().replaceAll("-", "")}`;
	let admin: Pool;

	beforeAll(async () => {
		admin = new Pool({ connectionString: process.env.COVER_LETTER_TEST_DATABASE_URL });
		await admin.query(`CREATE SCHEMA ${schemaName}`);
		fixture.pool = new Pool({
			connectionString: process.env.COVER_LETTER_TEST_DATABASE_URL,
			options: `-c search_path=${schemaName}`,
		});
		fixture.db = drizzle({ client: fixture.pool });
		await fixture.pool.query(
			'CREATE TABLE "user" (id text PRIMARY KEY); CREATE TABLE resume (id text PRIMARY KEY, user_id text, data jsonb); CREATE TABLE application (id text PRIMARY KEY, user_id text);',
		);
		const migration = await readFile(
			new URL("../../../../../migrations/20260905121445_cover_letter_library/migration.sql", import.meta.url),
			"utf8",
		);
		await fixture.pool.query(migration.replaceAll('"public".', ""));
		service = (await import("./service")).coverLetterService;
	});
	afterAll(async () => {
		await fixture.pool?.end();
		await admin?.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
		await admin?.end();
	});
	beforeEach(async () => {
		await getPool().query('TRUNCATE "user",resume,application,cover_letter CASCADE');
		await getPool().query("INSERT INTO \"user\" VALUES ('alice'),('bob')");
		await getPool().query("INSERT INTO resume VALUES ('alice-resume','alice',$1),('bob-resume','bob',$1)", [
			defaultResumeData,
		]);
		await getPool().query("INSERT INTO application VALUES ('alice-app','alice'),('bob-app','bob')");
	});

	it("persists one shared document and atomically rejects stale writers and deletes", async () => {
		const created = await service.create({ userId: "alice", name: "Draft", content: "<p>First</p>" });
		const saved = await service.update({
			userId: "alice",
			id: created.id,
			expectedRevision: 1,
			content: "<p>Second</p>",
		});
		expect(saved.revision).toBe(2);
		expect((await service.getById({ userId: "alice", id: created.id })).content).toBe("<p>Second</p>");
		await expect(
			service.update({ userId: "alice", id: created.id, expectedRevision: 1, name: "Stale" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
		await expect(service.delete({ userId: "alice", id: created.id, expectedRevision: 1 })).rejects.toMatchObject({
			code: "CONFLICT",
		});
	});

	it("accepts procedure defaults, rejects invalid input, and permits only one concurrent writer", async () => {
		const { coverLettersRouter } = await import("./router");
		const client = createRouterClient(coverLettersRouter, { context: { user: { id: "alice" } } as never });
		const created = await client.create({ name: "Through procedure" });
		expect(created).toMatchObject({ recipient: "", content: "", revision: 1 });
		await expect(client.create({ name: " " })).rejects.toMatchObject({ code: "BAD_REQUEST" });
		await expect(client.list({ limit: 101 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
		const results = await Promise.allSettled([
			client.update({ id: created.id, expectedRevision: 1, content: "First editor" }),
			client.update({ id: created.id, expectedRevision: 1, content: "Second editor" }),
		]);
		expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
		expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
	});

	it("copies an embedded letter without modifying the source and keeps targeted style identifiers", async () => {
		const source = structuredClone(defaultResumeData);
		source.customSections = [
			{
				id: "embedded",
				title: "Embedded Letter",
				type: "cover-letter",
				icon: "",
				columns: 1,
				hidden: true,
				keepTogether: false,
				startOnNewPage: false,
				items: [{ id: "embedded-item", hidden: true, recipient: "Recipient", content: "<p>Original</p>" }],
			},
		];
		await getPool().query("UPDATE resume SET data=$1 WHERE id='alice-resume'", [source]);
		const copy = await service.copyEmbedded({
			userId: "alice",
			resumeId: "alice-resume",
			sectionId: "embedded",
			itemId: "embedded-item",
		});
		expect(copy).toMatchObject({
			name: "Embedded Letter",
			content: "<p>Original</p>",
			style: { sectionId: "embedded", itemId: "embedded-item" },
		});
		await service.update({ userId: "alice", id: copy.id, expectedRevision: 1, content: "Changed independently" });
		const result = await getPool().query("SELECT data FROM resume WHERE id='alice-resume'");
		expect(result.rows[0].data).toEqual(source);
		await expect(
			service.copyEmbedded({ userId: "bob", resumeId: "alice-resume", sectionId: "embedded", itemId: "embedded-item" }),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
	});

	it("isolates every read, mutation, export and context selection by account", async () => {
		const created = await service.create({ userId: "alice", name: "Private" });
		const foreign = { userId: "bob", id: created.id, expectedRevision: 1 };
		for (const operation of [
			() => service.getById(foreign),
			() => service.update({ ...foreign, name: "Stolen" }),
			() => service.delete(foreign),
			() => service.duplicate(foreign),
			() => service.export(foreign),
			() => service.refreshStyle({ ...foreign, resumeId: "bob-resume" }),
		]) {
			await expect(operation()).rejects.toMatchObject({ code: "NOT_FOUND" });
		}
		expect((await service.list({ userId: "bob", limit: 20, offset: 0 })).items).toEqual([]);
		await expect(service.create({ userId: "alice", name: "Invalid", resumeId: "bob-resume" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
		await expect(service.create({ userId: "alice", name: "Invalid", applicationId: "bob-app" })).rejects.toMatchObject({
			code: "NOT_FOUND",
		});
	});

	it("refreshes copied style without changing content and survives source deletion", async () => {
		const created = await service.create({
			userId: "alice",
			name: "Keep",
			content: "<p>Keep body</p>",
			resumeId: "alice-resume",
			applicationId: "alice-app",
		});
		const changed = structuredClone(defaultResumeData);
		changed.basics.name = "New sender";
		await getPool().query("UPDATE resume SET data=$1 WHERE id='alice-resume'", [changed]);
		expect((await service.getById({ userId: "alice", id: created.id })).style.basics.name).toBe("");
		const refreshed = await service.refreshStyle({
			userId: "alice",
			id: created.id,
			expectedRevision: 1,
			resumeId: "alice-resume",
		});
		expect(refreshed).toMatchObject({
			name: "Keep",
			content: "<p>Keep body</p>",
			revision: 2,
			style: { basics: { name: "New sender" } },
		});
		await expect(
			service.refreshStyle({ userId: "alice", id: created.id, expectedRevision: 1, resumeId: "alice-resume" }),
		).rejects.toMatchObject({ code: "CONFLICT" });
		await getPool().query("DELETE FROM resume WHERE id='alice-resume'; DELETE FROM application WHERE id='alice-app'");
		expect(await service.getById({ userId: "alice", id: created.id })).toMatchObject({
			sourceResumeId: null,
			sourceApplicationId: null,
			style: { basics: { name: "New sender" } },
		});
	});

	it("searches literal names and paginates stable results within owner context", async () => {
		await service.create({ userId: "alice", name: "100%_match", resumeId: "alice-resume" });
		await service.create({ userId: "alice", name: "100 percent" });
		expect((await service.list({ userId: "alice", search: "%_", limit: 20, offset: 0 })).total).toBe(1);
		const page = await service.list({ userId: "alice", limit: 1, offset: 1 });
		expect(page.total).toBe(2);
		expect(page.items).toHaveLength(1);
		expect((await service.list({ userId: "alice", resumeId: "alice-resume", limit: 20, offset: 0 })).total).toBe(1);
	});

	it("round-trips standalone exports without foreign provenance and sanitizes all writes", async () => {
		const created = await service.create({
			userId: "alice",
			name: "Original",
			resumeId: "alice-resume",
			content: '<p onclick="evil()">Safe<script>evil()</script></p>',
		});
		expect(created.content).toBe("<p>Safe</p>");
		const document = await service.export({ userId: "alice", id: created.id });
		const imported = await service.import({ userId: "bob", document });
		expect(imported.id).not.toBe(created.id);
		expect(imported).toMatchObject({ sourceResumeId: null, sourceApplicationId: null, content: "<p>Safe</p>" });
		const copy = await service.duplicate({ userId: "alice", id: created.id });
		await service.delete({ userId: "alice", id: created.id, expectedRevision: 1 });
		expect((await service.getById({ userId: "alice", id: copy.id })).content).toBe("<p>Safe</p>");
	});
});
