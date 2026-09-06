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

export async function expireRetiredResumeLink(username: string, slug: string) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		await pool.query(
			`update "resume_retired_link"
			 set retired_at = now() - interval '91 days'
			 where username = $1 and slug = $2`,
			[username, slug],
		);
	} finally {
		await pool.end();
	}
}

const resumeInsertGateKey = 2_836_010;
const resumeInsertGateSlug = "e2e-concurrent-first";

type ResumeInsertGate = {
	waitUntilInsertBlocked: () => Promise<void>;
	release: () => Promise<void>;
	dispose: () => Promise<void>;
};

async function waitForAdvisoryLock(pool: Pool, key: number) {
	await expectDatabaseCondition(
		pool,
		`select exists (
			select 1
			from pg_locks
			where locktype = 'advisory'
			  and database = (select oid from pg_database where datname = current_database())
			  and classid = 0
			  and objid = $1
			  and not granted
		) as matched`,
		[key],
	);
}

async function expectDatabaseCondition(pool: Pool, query: string, values: unknown[] = []) {
	const deadline = Date.now() + 10_000;

	while (Date.now() < deadline) {
		const result = await pool.query<{ matched: boolean }>(query, values);
		if (result.rows[0]?.matched) return;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}

	throw new Error(`Database condition was not met within 10 seconds: ${query}`);
}

export async function createResumeInsertGate(): Promise<ResumeInsertGate> {
	const pool = new Pool({ connectionString: getDatabaseUrl() });
	const lockClient = await pool.connect();
	let released = false;

	try {
		await pool.query('drop trigger if exists "e2e_resume_insert_gate" on "resume"');
		await pool.query('drop function if exists "e2e_resume_insert_gate"()');
		await pool.query(`
			create function "e2e_resume_insert_gate"() returns trigger
			language plpgsql
			as $$
			begin
				if new.slug = '${resumeInsertGateSlug}' then
					perform pg_advisory_xact_lock(${resumeInsertGateKey});
				end if;
				return new;
			end;
			$$
		`);
		await pool.query(`
			create trigger "e2e_resume_insert_gate"
			before insert on "resume"
			for each row execute function "e2e_resume_insert_gate"()
		`);
		await lockClient.query("select pg_advisory_lock($1)", [resumeInsertGateKey]);
	} catch (error) {
		lockClient.release();
		await pool.end();
		throw error;
	}

	const release = async () => {
		if (released) return;
		released = true;
		await lockClient.query("select pg_advisory_unlock($1)", [resumeInsertGateKey]);
	};

	return {
		waitUntilInsertBlocked: () => waitForAdvisoryLock(pool, resumeInsertGateKey),
		release,
		dispose: async () => {
			await release();
			lockClient.release();
			await pool.query('drop trigger if exists "e2e_resume_insert_gate" on "resume"');
			await pool.query('drop function if exists "e2e_resume_insert_gate"()');
			await pool.end();
		},
	};
}

export async function readResumeLinkState(resumeId: string) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		const live = await pool.query<{ slug: string }>('select slug from "resume" where id = $1', [resumeId]);
		const retired = await pool.query<{ slug: string; attemptCount: number }>(
			`select slug, attempt_count as "attemptCount"
			 from "resume_retired_link"
			 where resume_id = $1
			 order by retired_at, id`,
			[resumeId],
		);

		return { liveSlug: live.rows[0]?.slug ?? null, retiredLinks: retired.rows };
	} finally {
		await pool.end();
	}
}

export async function hasLiveRetiredPathConflict(slug: string) {
	const pool = new Pool({ connectionString: getDatabaseUrl() });

	try {
		const result = await pool.query<{ matched: boolean }>(
			`select exists (
				select 1
				from "resume" live
				inner join "resume_retired_link" retired
					on retired.user_id = live.user_id and retired.slug = live.slug
				where live.slug = $1
			) as matched`,
			[slug],
		);

		return result.rows[0]?.matched ?? false;
	} finally {
		await pool.end();
	}
}

type SemanticStylesheetSeed = {
	mode: "legacy" | "semantic";
	source: { languageVersion: number; text: string };
};

export async function updateSemanticCssFixture(
	resumeId: string,
	update: {
		stylesheet?: SemanticStylesheetSeed;
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
			     updated_at = now()
			 where id = $1`,
			[resumeId, data],
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
		}>(`select data from "resume" where id = $1`, [resumeId]);
		const row = result.rows[0];
		if (!row) throw new Error(`Resume ${resumeId} was not found.`);
		return {
			stylesheet: row.data.metadata?.stylesheet,
			headline: row.data.basics?.headline,
		};
	} finally {
		await pool.end();
	}
}
