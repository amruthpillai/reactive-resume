import { Pool } from "pg";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { resumeIdFromPage } from "../fixtures/semantic-css";
import { expect, test } from "../fixtures/test";

type ExperienceItem = {
	id: string;
	company: string;
	position: string;
	location: string;
	period: string;
	description: string;
	hidden: boolean;
	website: { url: string; label: string; inlineLink: boolean };
	roles: [];
};

const experienceItem = (id: string, company: string, period: string): ExperienceItem => ({
	id,
	company,
	position: "Engineer",
	location: "",
	period,
	description: "",
	hidden: false,
	website: { url: "", label: "", inlineLink: false },
	roles: [],
});

function databasePool() {
	if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for section sorting E2E coverage.");
	return new Pool({ connectionString: process.env.DATABASE_URL });
}

async function seedExperienceItems(resumeId: string, items: ExperienceItem[]) {
	const pool = databasePool();
	try {
		const result = await pool.query<{ data: { sections: { experience: { items: ExperienceItem[] } } } }>(
			'select data from "resume" where id = $1',
			[resumeId],
		);
		const data = result.rows[0]?.data;
		if (!data) throw new Error(`Resume ${resumeId} was not found.`);
		data.sections.experience.items = items;
		await pool.query('update "resume" set data = $2, updated_at = now() where id = $1', [resumeId, data]);
	} finally {
		await pool.end();
	}
}

async function readExperienceItems(resumeId: string) {
	const pool = databasePool();
	try {
		const result = await pool.query<{ data: { sections: { experience: { items: ExperienceItem[] } } } }>(
			'select data from "resume" where id = $1',
			[resumeId],
		);
		const items = result.rows[0]?.data.sections.experience.items;
		if (!items) throw new Error(`Resume ${resumeId} was not found.`);
		return items;
	} finally {
		await pool.end();
	}
}

const itemIds = (items: ExperienceItem[]) => items.map(({ id }) => id);

test("sorts Experience once while preserving undo, persistence, later edits, and locking", async ({
	authPage: page,
}, testInfo) => {
	test.setTimeout(90_000);
	await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = resumeIdFromPage(page);
	const authoredItems = [
		experienceItem("unknown-sort", "Mystery Co", "Recently"),
		experienceItem("older-sort", "Older Co", "2018 - 2020"),
		experienceItem("current-sort", "Current Co", "2023 - Present"),
	];
	await seedExperienceItems(resumeId, authoredItems);
	await page.reload();
	await openSidebarSection(page, "Experience");
	const section = page.locator("#sidebar-experience");
	const renderedItemIds = () =>
		section
			.locator('[id^="resume-item-"]')
			.evaluateAll((nodes) => nodes.map(({ id }) => id.replace("resume-item-", "")));

	await expect.poll(renderedItemIds).toEqual(["unknown-sort", "older-sort", "current-sort"]);
	await section.getByRole("button", { name: "Section options" }).click();
	await page.getByRole("menuitem", { name: "Sort by date" }).click();
	await expect(page.getByText("Could not sort these items; they stayed at the end: Mystery Co.")).toBeVisible();
	await expect
		.poll(async () => itemIds(await readExperienceItems(resumeId)))
		.toEqual(["current-sort", "older-sort", "unknown-sort"]);
	await expect.poll(renderedItemIds).toEqual(["current-sort", "older-sort", "unknown-sort"]);

	await page.getByRole("button", { name: "Undo", exact: true }).click();
	await expect
		.poll(async () => itemIds(await readExperienceItems(resumeId)))
		.toEqual(["unknown-sort", "older-sort", "current-sort"]);

	await section.getByRole("button", { name: "Section options" }).click();
	await page.getByRole("menuitem", { name: "Sort by date" }).click();
	await expect
		.poll(async () => itemIds(await readExperienceItems(resumeId)))
		.toEqual(["current-sort", "older-sort", "unknown-sort"]);
	await page.reload();
	await openSidebarSection(page, "Experience");
	await expect.poll(renderedItemIds).toEqual(["current-sort", "older-sort", "unknown-sort"]);

	await section.getByText("Current Co", { exact: true }).click();
	const updateDialog = page.getByRole("dialog", { name: "Update an existing experience" });
	await updateDialog.getByLabel("Period").fill("2010 - 2011");
	await updateDialog.getByRole("button", { name: "Save Changes" }).click();
	await expect
		.poll(async () => {
			const items = await readExperienceItems(resumeId);
			return { ids: itemIds(items), currentPeriod: items.find(({ id }) => id === "current-sort")?.period };
		})
		.toEqual({ ids: ["current-sort", "older-sort", "unknown-sort"], currentPeriod: "2010 - 2011" });

	await page.getByRole("button", { name: "Resume options" }).click();
	await page.getByRole("menuitem", { name: "Lock" }).click();
	await page.getByRole("alertdialog").getByRole("button", { name: "Confirm" }).click();
	await expect(section.getByRole("button", { name: "Section options" })).toBeDisabled();
});
