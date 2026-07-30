import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const databaseTest = process.env.DATABASE_URL ? describe : describe.skip;

databaseTest("stylesheet PostgreSQL compare-and-swap", () => {
	it("rejects a preflighted candidate when render data changes on a second connection", async () => {
		const [{ getPool }, { createDatabaseStylesheetService }] = await Promise.all([
			import("@reactive-resume/db/client"),
			import("./stylesheet-service"),
		]);
		const firstConnection = await getPool().connect();
		const secondConnection = await getPool().connect();
		const userId = `stylesheet-user-${randomUUID()}`;
		const resumeId = `stylesheet-resume-${randomUUID()}`;
		const initialSource = { languageVersion: 1, text: "@version 1;\n" };
		const candidateSource = {
			languageVersion: 1,
			text: "@version 1;\nsection { color: #123456; }\n",
		};
		const data: ResumeData = structuredClone(defaultResumeData);
		data.metadata.stylesheet = {
			mode: "semantic",
			source: initialSource,
			applied: initialSource,
		};

		let releasePreflight: () => void = () => {};
		let signalPaused: () => void = () => {};
		const paused = new Promise<void>((resolve) => {
			signalPaused = resolve;
		});
		const released = new Promise<void>((resolve) => {
			releasePreflight = resolve;
		});

		try {
			await secondConnection.query(
				`insert into "user" (id, name, email, username, display_username)
				 values ($1, $2, $3, $4, $4)`,
				[userId, "Stylesheet Test", `${userId}@example.test`, userId],
			);
			await secondConnection.query(
				`insert into resume
				 (id, name, slug, tags, data, user_id, stylesheet_revision, render_data_version)
				 values ($1, 'Resume', 'resume', '{}', $2::jsonb, $3, 0, 0)`,
				[resumeId, JSON.stringify(data), userId],
			);

			const service = createDatabaseStylesheetService({
				database: drizzle({ client: firstConnection }),
				runner: {
					run: async () => ({
						ok: true,
						pageCount: 1,
						byteCount: 128,
						diagnostics: [],
					}),
				},
				afterPreflight: async () => {
					signalPaused();
					await released;
				},
				publish: async () => undefined,
			});

			const mutation = service.mutate({
				id: resumeId,
				userId,
				expectedRevision: 0,
				expectedRenderDataVersion: 0,
				editGeneration: 1,
				transition: "edit_source",
				source: candidateSource,
			});

			await paused;
			await secondConnection.query(
				`update resume
				 set data = jsonb_set(data, '{basics,name}', to_jsonb($1::text), true),
				     render_data_version = render_data_version + 1
				 where id = $2 and user_id = $3`,
				["Concurrent content", resumeId, userId],
			);
			releasePreflight();

			const conflict = await mutation.catch((error: unknown) => error);
			expect(conflict).toMatchObject({
				code: "STYLESHEET_REVISION_CONFLICT",
				status: 409,
				data: {
					state: {
						revision: 0,
						renderDataVersion: 1,
						stylesheet: {
							source: initialSource,
							applied: initialSource,
						},
					},
				},
			});

			const persisted = await secondConnection.query<{
				data: ResumeData;
				stylesheet_revision: number;
				render_data_version: number;
			}>(
				`select data, stylesheet_revision, render_data_version
				 from resume where id = $1 and user_id = $2`,
				[resumeId, userId],
			);
			expect(persisted.rows[0]).toMatchObject({
				data: {
					basics: { name: "Concurrent content" },
					metadata: {
						stylesheet: {
							source: initialSource,
							applied: initialSource,
						},
					},
				},
				stylesheet_revision: 0,
				render_data_version: 1,
			});
		} finally {
			releasePreflight();
			await secondConnection.query(`delete from "user" where id = $1`, [userId]).catch(() => undefined);
			firstConnection.release();
			secondConnection.release();
		}
	});
});
