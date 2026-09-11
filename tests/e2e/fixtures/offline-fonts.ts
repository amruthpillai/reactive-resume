import type { Page } from "@playwright/test";
import { Pool } from "pg";

export const offlineFontScriptSamples = [
	{ name: "latin-punctuation", marker: "Latin punctuation • — “quotes” €" },
	{ name: "cjk", marker: "简体中文" },
	{ name: "arabic", marker: "العربية" },
	{ name: "hebrew", marker: "עברית" },
	{ name: "thai", marker: "ไทย" },
	{ name: "emoji", marker: "Emoji 🚀" },
] as const;

const offlineFontFixtureSummary = offlineFontScriptSamples.map(({ marker }) => `<p>${marker}</p>`).join("");

export type OfflineFontResumeFixture = {
	builderURL: string;
	slug: string;
	username: string;
};

/** Seeds one stable multilingual document so each diagnostic surface uses identical glyph input. */
export async function seedOfflineFontResume(page: Page): Promise<OfflineFontResumeFixture> {
	const builderURL = page.url();
	const resumeId = new URL(builderURL).pathname.split("/").at(-1);
	const databaseURL = process.env.DATABASE_URL;
	if (!resumeId || !databaseURL) throw new Error("Offline font fixture requires builder URL and DATABASE_URL.");

	const pool = new Pool({ connectionString: databaseURL });
	try {
		const patches: Array<{ path: string[]; value: unknown }> = [
			{ path: ["picture", "hidden"], value: true },
			{ path: ["basics", "name"], value: "Offline Font Diagnostic Fixture" },
			{ path: ["basics", "headline"], value: "Offline font diagnostic" },
			// Keep each marker in one dedicated block so raster evidence can map each script to a local PDF crop.
			{ path: ["summary", "content"], value: offlineFontFixtureSummary },
			{ path: ["metadata", "typography", "body", "fontFamily"], value: "IBM Plex Serif" },
			{ path: ["metadata", "typography", "body", "fontWeights"], value: ["400", "700"] },
			{ path: ["metadata", "typography", "heading", "fontFamily"], value: "IBM Plex Serif" },
			{ path: ["metadata", "typography", "heading", "fontWeights"], value: ["400", "700"] },
		];

		for (const patch of patches) {
			await pool.query(
				`update "resume"
				 set data = jsonb_set(data, $2::text[], $3::jsonb, true),
				     updated_at = now()
				 where id = $1`,
				[resumeId, patch.path, JSON.stringify(patch.value)],
			);
		}

		await pool.query('update "resume" set is_public = true, updated_at = now() where id = $1', [resumeId]);
		const result = await pool.query<{ slug: string; user_id: string }>(
			'select slug, user_id from "resume" where id = $1',
			[resumeId],
		);
		const row = result.rows[0];
		if (!row) throw new Error("Offline font fixture resume was not found after seeding.");

		const owner = await pool.query<{ username: string }>('select username from "user" where id = $1', [row.user_id]);
		const ownerUsername = owner.rows[0]?.username;
		if (!ownerUsername) throw new Error("Offline font fixture owner was not found after seeding.");

		return { builderURL, slug: row.slug, username: ownerUsername };
	} finally {
		await pool.end();
	}
}
