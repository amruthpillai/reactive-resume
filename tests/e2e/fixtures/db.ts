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
		if (update.legacyStyleRule) {
			const metadata = data.metadata as Record<string, unknown>;
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
			stylesheet_revision: number;
		}>('select data, stylesheet_revision from "resume" where id = $1', [resumeId]);
		const row = result.rows[0];
		if (!row) throw new Error(`Resume ${resumeId} was not found.`);
		return {
			stylesheet: row.data.metadata?.stylesheet,
			headline: row.data.basics?.headline,
			revision: row.stylesheet_revision,
		};
	} finally {
		await pool.end();
	}
}
