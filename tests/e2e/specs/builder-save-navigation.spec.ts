import type { Page } from "@playwright/test";
import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const updateUrl = "**/api/rpc/resume/update**";
function barrier() {
	let resolve!: () => void;
	const promise = new Promise<void>((done) => {
		resolve = done;
	});
	return { promise, resolve };
}
function waitSave(page: Page) {
	return page.waitForResponse((response) => response.url().includes("/api/rpc/resume/update") && response.ok());
}

test("retries a failed autosave before leaving the builder", async ({ authPage: page }, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	await page.reload();
	const url = page.url();
	const warmup = waitSave(page);
	await page.getByLabel("Headline", { exact: true }).fill("Navigation fixture ready");
	await warmup;

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
	await createSampleResumeFromDashboard(page, testInfo);
	await page.reload();
	const url = page.url();
	const warmup = waitSave(page);
	await page.getByLabel("Headline", { exact: true }).fill("Navigation failure fixture ready");
	await warmup;
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
