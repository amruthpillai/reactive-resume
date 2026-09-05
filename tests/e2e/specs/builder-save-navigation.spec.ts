import type { Page, TestInfo } from "@playwright/test";
import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const updateUrl = "**/api/rpc/resume/update";
function barrier() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
function waitSave(page: Page) {
	return page.waitForResponse(
		(response) => new URL(response.url()).pathname === "/api/rpc/resume/update" && response.ok(),
	);
}

async function prepareNavigationTest(page: Page, testInfo: TestInfo) {
	await createSampleResumeFromDashboard(page, testInfo);
	await page.reload();
	const warmup = waitSave(page);
	await page.getByLabel("Headline", { exact: true }).fill("Navigation fixture ready");
	await warmup;
	return page.url();
}

test("retries a failed autosave before leaving the builder", async ({ authPage: page }, testInfo) => {
	const url = await prepareNavigationTest(page, testInfo);

	await page.route(updateUrl, async (route) => {
		await route.abort("failed");
	});
	await page.getByLabel("Name", { exact: true }).fill("Draft recovered before leaving");
	await expect(page.getByText("Your latest changes could not be saved.", { exact: true })).toBeVisible();
	await page.unroute(updateUrl);
	const arrived = barrier();
	const release = barrier();
	await page.route(updateUrl, async (route) => {
		arrived.resolve();
		await release.promise;
		await route.continue();
	});
	await page.getByRole("button", { name: "Go to resumes dashboard", exact: true }).click();
	await arrived.promise;
	expect(page.url()).toBe(url);
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Draft recovered before leaving");
	release.resolve();
	await page.waitForURL(/\/dashboard/);
	await page.goto(url);
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Draft recovered before leaving");
});

test("retains the current draft when saving during navigation fails", async ({ authPage: page }, testInfo) => {
	const url = await prepareNavigationTest(page, testInfo);
	let attempts = 0;
	await page.route(updateUrl, async (route) => {
		attempts++;
		await route.abort("failed");
	});
	await page.getByLabel("Name", { exact: true }).fill("Keep unsaved draft");
	await expect(page.getByText("Your latest changes could not be saved.", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Go to resumes dashboard", exact: true }).click();
	await expect.poll(() => attempts).toBe(2);
	await expect(page.getByRole("status").filter({ hasText: "Couldn't save" })).toBeVisible();
	expect(page.url()).toBe(url);
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Keep unsaved draft");
	await page.unroute(updateUrl);
	await page.getByRole("button", { name: "Go to resumes dashboard", exact: true }).click();
	await page.waitForURL(/\/dashboard/);
	await page.goto(url);
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Keep unsaved draft");
});

test("stops waiting for a slow save while preserving late acknowledgements and queued edits", async ({
	authPage: page,
}, testInfo) => {
	const url = await prepareNavigationTest(page, testInfo);
	await page.clock.install();
	const arrived = barrier();
	const release = barrier();
	let attempts = 0;
	await page.route(updateUrl, async (route) => {
		attempts++;
		if (attempts === 1) {
			arrived.resolve();
			await release.promise;
		}
		await route.continue();
	});
	await page.getByLabel("Name", { exact: true }).fill("Slow save draft");
	await page.clock.fastForward(600);
	await arrived.promise;
	await page.getByRole("button", { name: "Go to resumes dashboard", exact: true }).click();
	await page.clock.fastForward(10000);
	const slowNotice = page.getByText("Saving is taking longer than expected. Your changes are still open.", {
		exact: true,
	});
	await expect(slowNotice).toBeVisible();
	await expect(page.getByRole("status").filter({ hasText: "Saving" })).toBeVisible();
	expect(page.url()).toBe(url);
	expect(attempts).toBe(1);

	await page.getByLabel("Headline", { exact: true }).fill("Latest edit during slow save");
	await page.clock.fastForward(600);
	expect(attempts).toBe(1);
	const latestSaved = page.waitForResponse(
		(response) =>
			new URL(response.url()).pathname === "/api/rpc/resume/update" &&
			response.ok() &&
			(response.request().postData() ?? "").includes("Latest edit during slow save"),
	);
	release.resolve();
	await latestSaved;
	await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
	await expect(slowNotice).toBeHidden();
	await page.getByRole("button", { name: "Go to resumes dashboard", exact: true }).click();
	await page.waitForURL(/\/dashboard/);
	await page.goto(url);
	await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Slow save draft");
	await expect(page.getByLabel("Headline", { exact: true })).toHaveValue("Latest edit during slow save");
	expect(attempts).toBe(2);
});
