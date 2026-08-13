import type { E2EAccount } from "./data";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool } from "pg";

const legacyParityRules = JSON.parse(
	readFileSync(
		resolve(process.cwd(), "packages/pdf/src/semantic/__fixtures__/legacy/custom-section-type.json"),
		"utf8",
	),
) as unknown[];

function getDatabaseUrl() {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E cleanup.");

	return databaseUrl;
}

export async function deleteE2EUser(account: E2EAccount) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		await pool.query('delete from "user" where email = $1 or username = $2', [account.email, account.username]);
	} finally {
		await pool.end();
	}
}

type SemanticStylesheetSeed = {
	mode: "legacy" | "semantic";
	source: { languageVersion: number; text: string };
	applied: { languageVersion: number; text: string };
};

export async function updateSemanticCssFixture(
	resumeId: string,
	update: {
		stylesheet?: SemanticStylesheetSeed;
		bumpRevision?: boolean;
		portableLayout?: "balanced" | "pagination-stress";
		experienceItemId?: string;
		legacyStyleRule?: boolean;
		hidePicture?: boolean;
		basicsName?: string;
	},
) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		const result = await pool.query<{ data: Record<string, unknown> }>('select data from "resume" where id = $1', [
			resumeId,
		]);
		const data = result.rows[0]?.data;
		if (!data) throw new Error(`Resume ${resumeId} was not found.`);

		if (update.stylesheet) {
			const metadata = data.metadata as Record<string, unknown>;
			metadata.stylesheet = update.stylesheet;
		}
		if (update.experienceItemId) {
			const sections = data.sections as Record<string, { items: Array<Record<string, unknown>> }>;
			const experience = sections.experience;
			if (!experience?.items[0]) throw new Error("The semantic CSS fixture requires an experience item.");
			const item = experience.items[1] ?? structuredClone(experience.items[0]);
			item.id = update.experienceItemId;
			if (!experience.items[1]) experience.items.push(item);
		}
		if (update.portableLayout) {
			const sections = data.sections as Record<string, { items: Array<Record<string, unknown>> }>;
			const experience = sections.experience;
			const education = sections.education;
			const projects = sections.projects;
			const profiles = sections.profiles;
			const skills = sections.skills;
			if (
				!experience?.items[0] ||
				!experience.items[1] ||
				!education?.items[0] ||
				!projects?.items[0] ||
				!profiles?.items[0] ||
				!skills?.items[0]
			) {
				throw new Error("The portable semantic CSS fixture requires standard sample sections.");
			}

			experience.items = experience.items.slice(0, 2);
			experience.items[0].description = "<ul><li><p>Portable rich text marker one.</p></li></ul>";
			experience.items[1].description = "<ul><li><p>Portable rich text marker two.</p></li></ul>";
			education.items = education.items.slice(0, 1);
			education.items[0].description = Array.from(
				{ length: update.portableLayout === "pagination-stress" ? 30 : 12 },
				(_, index) =>
					`<p>Education pagination spacer ${index + 1}: deterministic content places the next section near the page boundary.</p>`,
			).join("");
			projects.items = projects.items.slice(0, 1);
			projects.items[0].description = Array.from(
				{ length: 5 },
				(_, index) =>
					`<p>Project pagination marker ${index + 1}: this section fits on a fresh page and must stay together.</p>`,
			).join("");
			profiles.items = profiles.items.slice(0, 1);
			skills.items = skills.items.slice(0, 1);

			const metadata = data.metadata as {
				layout: { pages: Array<{ fullWidth: boolean; main: string[]; sidebar: string[] }> };
			};
			metadata.layout.pages = [
				{
					fullWidth: false,
					main: ["experience"],
					sidebar: ["profiles", "skills"],
				},
				{
					fullWidth: true,
					main: ["education", "projects"],
					sidebar: [],
				},
			];
		}
		if (update.legacyStyleRule) {
			const metadata = data.metadata as Record<string, unknown>;
			delete metadata.stylesheet;
			metadata.styleRules = structuredClone(legacyParityRules);
		}
		if (update.hidePicture) {
			const picture = data.picture as Record<string, unknown>;
			picture.hidden = true;
			picture.url = "";
		}
		if (update.basicsName) {
			const basics = data.basics as Record<string, unknown>;
			basics.name = update.basicsName;
		}

		await pool.query(
			`update "resume"
			 set data = $2,
			     stylesheet_revision = stylesheet_revision + $3,
			     render_data_version = render_data_version + $4,
			     updated_at = now()
			 where id = $1`,
			[
				resumeId,
				data,
				update.bumpRevision || update.stylesheet || update.legacyStyleRule ? 1 : 0,
				update.stylesheet ||
				update.portableLayout ||
				update.experienceItemId ||
				update.legacyStyleRule ||
				update.hidePicture ||
				update.basicsName
					? 1
					: 0,
			],
		);
	} finally {
		await pool.end();
	}
}

export async function readSemanticCssFixture(resumeId: string) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		const result = await pool.query<{
			data: {
				basics?: { headline?: string };
				metadata?: { stylesheet?: SemanticStylesheetSeed };
			};
			slug: string;
			stylesheet_revision: number;
			username: string;
		}>(
			`select r.data, r.slug, r.stylesheet_revision, u.username
			 from "resume" r
			 inner join "user" u on u.id = r.user_id
			 where r.id = $1`,
			[resumeId],
		);
		const row = result.rows[0];
		if (!row) throw new Error(`Resume ${resumeId} was not found.`);
		return {
			stylesheet: row.data.metadata?.stylesheet,
			headline: row.data.basics?.headline,
			revision: row.stylesheet_revision,
			slug: row.slug,
			username: row.username,
		};
	} finally {
		await pool.end();
	}
}
