import type { BrowserContext } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { createAuthenticatedContext } from "../fixtures/auth";
import { createAccount } from "../fixtures/data";
import { deleteE2EUser } from "../fixtures/db";
import { expect, test } from "../fixtures/test";

const rootId = process.env.ROOT_RESUME_ID?.trim();

test("unset root mode retains marketing and ordinary app entry points", async ({ page, request }) => {
	test.skip(Boolean(rootId), "Run once with ROOT_RESUME_ID unset, then restart with an e2e- ID.");
	await page.goto("/");
	await expect(page.getByRole("main")).toHaveAttribute("id", "main-content");
	await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
	expect((await request.get("/api/health")).ok()).toBe(true);
	await page.goto("/auth/login");
	await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("configured root preserves access, canonical, identity, statistics and app routes", async ({
	browser,
	authPage: owner,
	account,
	baseURL,
}, testInfo) => {
	test.skip(!rootId, "Requires a disposable database and ROOT_RESUME_ID=e2e-root-2669.");
	test.setTimeout(120_000);
	if (!rootId?.startsWith("e2e-")) throw new Error("ROOT_RESUME_ID must begin with e2e- for this disposable fixture.");
	if (!baseURL) throw new Error("APP_URL is required for root E2E.");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	const visitor = await browser.newContext({ baseURL, userAgent: "root-resume-e2e-visitor" });
	const page = await visitor.newPage();
	const failures: string[] = [];
	const fontStatuses: number[] = [];
	const assetStatuses: number[] = [];
	page.on("response", (response) => {
		if (/\.(woff2?|ttf|otf)(?:\?|$)/.test(response.url())) fontStatuses.push(response.status());
		if (new URL(response.url()).pathname.startsWith("/assets/")) assetStatuses.push(response.status());
	});
	const secondAccount = createAccount(testInfo);
	let other: BrowserContext | undefined;
	const otherBootstrap = await browser.newContext({ baseURL });
	page.on("pageerror", (error) => failures.push(error.message));
	const unavailable = async () => {
		await page.goto("/");
		await expect(page.getByText("We couldn't find that page", { exact: true })).toBeVisible();
		await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
		await expect(page.locator("body")).not.toContainText("Root Fixture");
		await expect(page.locator("body")).not.toContainText(rootId);
		await expect(page.getByRole("main")).toHaveCount(1);
		await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
	};
	try {
		await unavailable();
		other = await createAuthenticatedContext(browser, otherBootstrap.request, secondAccount, baseURL);
		const otherCreated = await other.request.post("/api/openapi/resumes", {
			data: { name: "Other public fixture", slug: "other-public", tags: [], withSampleData: true },
		});
		expect(otherCreated.ok()).toBe(true);
		const otherResumeId = await otherCreated.json();
		expect((await other.request.put(`/api/openapi/resumes/${otherResumeId}`, { data: { isPublic: true } })).ok()).toBe(
			true,
		);
		const created = await owner.request.post("/api/openapi/resumes", {
			data: { name: "Root Fixture", slug: "root-fixture", tags: [], withSampleData: true },
		});
		expect(created.ok()).toBe(true);
		const originalId = await created.json();
		await pool.query(
			'update resume set id = $1 where id = $2 and user_id = (select id from "user" where username = $3)',
			[rootId, originalId, account.username],
		);
		await pool.query(`update resume set data = jsonb_set(data, '{basics,name}', '"Root Fixture"') where id = $1`, [
			rootId,
		]);
		const resource = `/api/openapi/resumes/${rootId}`;
		const update = async (data: Record<string, unknown>) => {
			const response = await owner.request.put(resource, { data });
			expect(response.ok()).toBe(true);
		};
		const readStatistics = async () => (await owner.request.get(`${resource}/statistics`)).json();
		await unavailable();
		await owner.goto("/");
		await expect(owner.getByText("We couldn't find that page", { exact: true })).toBeVisible();
		const otherRoot = await other.request.post("/api/rpc/resume/getRoot", { data: { json: null } });
		expect(await otherRoot.json()).toEqual({ json: { status: "unavailable", canonicalUrl: `${baseURL}/` } });
		await owner.setViewportSize({ width: 1920, height: 950 });
		await owner.goto(`/builder/${rootId}`);
		await expect(owner.locator("#sidebar-picture")).toBeVisible();
		await owner.getByRole("button", { name: "Contain", exact: true }).click();
		const pictureData = await owner.evaluate(() => {
			const canvas = document.createElement("canvas");
			canvas.width = 64;
			canvas.height = 64;
			const context = canvas.getContext("2d");
			if (!context) throw new Error("Canvas unavailable");
			context.fillStyle = "#4488aa";
			context.fillRect(0, 0, 64, 64);
			return canvas.toDataURL("image/png").slice("data:image/png;base64,".length);
		});
		await owner
			.locator('#sidebar-picture input[type="file"]')
			.setInputFiles({ name: "root-fixture.png", mimeType: "image/png", buffer: Buffer.from(pictureData, "base64") });
		const pictureInput = owner.locator('#sidebar-picture input[name="url"]');
		await expect(pictureInput).toHaveValue(/\/uploads\//);
		const pictureUrl = await pictureInput.inputValue();
		const pictureResponse = await visitor.request.get(pictureUrl);
		expect(pictureResponse.ok()).toBe(true);
		expect(pictureResponse.headers()["content-type"]).toMatch(/^image\//);
		await owner.goto("/");
		await expect(owner.getByText("We couldn't find that page", { exact: true })).toBeVisible();
		await update({ isPublic: true });
		await owner.reload();
		await expect(owner.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		expect(await readStatistics()).toMatchObject({ views: 0, downloads: 0 });

		await page.reload();
		await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		await expect(page.locator("canvas").first()).toBeVisible();
		await expect(page.getByRole("heading", { name: "Root Fixture", exact: true })).toBeVisible();
		await page.screenshot({ path: testInfo.outputPath("root-public.png"), fullPage: true });
		await expect(page.locator("header img")).toHaveAttribute("src", pictureUrl);
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.getByRole("main")).toHaveCount(1);
		await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
		await expect(page.getByRole("link", { name: "Build your own resume" })).toHaveAttribute("href", "/dashboard");
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}/`);
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
		await expect.poll(readStatistics).toMatchObject({ views: 1, downloads: 0 });
		await page.reload();
		await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		expect(await readStatistics()).toMatchObject({ views: 1, downloads: 0 });
		const downloadPromise = page.waitForEvent("download");
		await page.getByRole("button", { name: "Download PDF" }).first().click();
		const download = await downloadPromise;
		expect(await download.failure()).toBeNull();
		const downloadPath = await download.path();
		if (!downloadPath) throw new Error("Missing root PDF download");
		expect((await readFile(downloadPath)).subarray(0, 5).toString()).toBe("%PDF-");
		await expect.poll(readStatistics).toMatchObject({ views: 1, downloads: 1 });

		await update({ slug: "renamed-root", showDownloadButtons: false });
		await page.reload();
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.getByRole("button", { name: "Download PDF" })).toHaveCount(0);
		await expect(page).toHaveURL(`${baseURL}/`);
		const slugPath = `/${account.username}/renamed-root`;
		await page.goto(slugPath);
		await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
		await expect(page.locator('link[rel="canonical"]').last()).toHaveAttribute("href", `${baseURL}${slugPath}`);
		await update({ showDownloadButtons: true });
		await page.goto("/ats-checker");
		await page.getByRole("link", { name: "Reactive Resume - Go to homepage", exact: true }).click();
		await expect(page.getByRole("heading", { name: "Root Fixture", exact: true })).toBeVisible();
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${baseURL}/`);
		await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);

		const password = "root-e2e-secret";
		expect((await owner.request.put(`${resource}/password`, { data: { password } })).ok()).toBe(true);
		await page.goto("/");
		await expect(page).toHaveURL(/\/auth\/resume-password/);
		expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/");
		await page.getByLabel("Password", { exact: true }).fill("wrong-password");
		await page.getByRole("button", { name: "Unlock", exact: true }).click();
		await expect(page.getByText("The password you entered is incorrect", { exact: true })).toBeVisible();
		const lockedPdf = await visitor.request.get(`/api/resumes/${account.username}/renamed-root/pdf`);
		expect(lockedPdf.status()).toBe(401);
		await page.getByLabel("Password", { exact: true }).fill(password);
		await page.getByRole("button", { name: "Unlock", exact: true }).click();
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		await page.reload();
		await expect(page).toHaveURL(`${baseURL}/`);
		await expect(page.getByRole("button", { name: "Download PDF" }).first()).toBeVisible();
		const accessCookies = (await visitor.cookies()).filter((cookie) => cookie.name.startsWith("resume_access_"));
		expect(accessCookies.length).toBeGreaterThan(0);
		await visitor.addCookies(
			accessCookies.map((cookie) => ({ ...cookie, expires: Math.floor(Date.now() / 1000) - 1 })),
		);
		await page.reload();
		await expect(page).toHaveURL(/\/auth\/resume-password/);
		expect((await visitor.request.get(`/api/resumes/${account.username}/renamed-root/pdf`)).status()).toBe(401);

		await update({ isPublic: false });
		await unavailable();
		await owner.goto("/");
		await expect(owner.getByText("We couldn't find that page", { exact: true })).toBeVisible();
		const rootResponse = await visitor.request.post("/api/rpc/resume/getRoot", {
			data: {
				json: {
					id: otherResumeId,
					username: secondAccount.username,
					slug: "other-public",
					host: "evil.example",
					requirePublic: false,
				},
			},
			headers: { "x-forwarded-host": "evil.example" },
		});
		expect(rootResponse.ok()).toBe(true);
		expect(await rootResponse.json()).toEqual({ json: { status: "unavailable", canonicalUrl: `${baseURL}/` } });
		const shell = await visitor.request.get("/", {
			headers: { host: "attacker.example", "x-forwarded-host": "evil.example" },
		});
		expect(await shell.text()).toContain(`<link rel="canonical" href="${baseURL}/" data-root-resume-shell>`);
		expect(shell.headers()["x-robots-tag"]).toBe("noindex, follow");
		for (const path of ["/api/health", "/auth/login", "/favicon.svg"]) {
			const response = await visitor.request.get(path);
			expect(response.ok(), path).toBe(true);
		}
		await page.goto("/ats-checker");
		await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
		await page.goto("/auth/login");
		await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
		await owner.goto("/dashboard/resumes");
		await expect(owner.getByText("Root Fixture", { exact: true }).first()).toBeVisible();
		expect(failures).toEqual([]);
		expect(fontStatuses.length).toBeGreaterThan(0);
		expect(assetStatuses.length).toBeGreaterThan(0);
		expect([...fontStatuses, ...assetStatuses].every((status) => status >= 200 && status < 400)).toBe(true);
		expect((await owner.request.delete(resource)).ok()).toBe(true);
		await unavailable();
	} finally {
		await visitor.close();
		await other?.close();
		await otherBootstrap.close();
		await deleteE2EUser(secondAccount);
		await pool.end();
	}
});
