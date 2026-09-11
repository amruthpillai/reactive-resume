import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { Pool } from "pg";
import { createSampleResumeFromDashboard } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

const requireWeb = createRequire(`${process.cwd()}/apps/web/package.json`);
async function textOf(bytes: Uint8Array) {
	const { getDocument } = await import(requireWeb.resolve("pdfjs-dist/legacy/build/pdf.mjs"));
	const task = getDocument({ data: new Uint8Array(bytes) });
	try {
		const pdf = await task.promise;
		const pages = [];
		for (let i = 1; i <= pdf.numPages; i++)
			pages.push(
				(await (await pdf.getPage(i)).getTextContent()).items.map((x: { str?: string }) => x.str ?? "").join(" "),
			);
		return pages.join("\n");
	} finally {
		await task.destroy();
	}
}
test("uses the resume language for anonymous browser and server PDF downloads", async ({
	authPage: page,
	browser,
	account,
}, info) => {
	test.setTimeout(90_000);
	await createSampleResumeFromDashboard(page, info);
	const id = page.url().split("/").at(-1);
	await page.goto("/dashboard/resumes");
	const pool = new Pool({ connectionString: process.env.DATABASE_URL });
	let slug: string;
	try {
		const result = await pool.query("select data,slug from resume where id=$1", [id]);
		const data = result.rows[0].data;
		slug = result.rows[0].slug;
		data.metadata.page.locale = "es-ES";
		data.picture.hidden = true;
		data.metadata.typography.body.fontFamily = "Source Sans 3";
		data.metadata.typography.heading.fontFamily = "Source Sans 3";
		data.summary.title = "";
		for (const section of Object.values(data.sections) as Array<{ title: string }>) section.title = "";
		await pool.query("update resume set data=$2,is_public=true,updated_at=now() where id=$1", [id, data]);
	} finally {
		await pool.end();
	}
	const visitor = await browser.newPage();
	try {
		await visitor.goto(`/${account.username}/${slug}`);
		await expect(visitor.locator(".textLayer").first()).toContainText("Experiencia", { timeout: 30_000 });
		const dl = visitor.waitForEvent("download");
		await visitor.getByRole("button", { name: "Download PDF", exact: true }).first().click();
		const path = await (await dl).path();
		if (!path) throw new Error("No PDF");
		const browserText = await textOf(await readFile(path));
		expect(browserText).toContain("Experiencia");
		const response = await visitor.request.get(`/api/resumes/${account.username}/${slug}/pdf`);
		expect(response.ok()).toBe(true);
		const serverText = await textOf(await response.body());
		expect(serverText).toContain("Experiencia");
	} finally {
		await visitor.close();
	}
	const fallback = await browser.newPage();
	try {
		await fallback.route("https://fonts.gstatic.com/**", (route) => route.abort());
		const response = fallback.waitForResponse((response) =>
			response.url().endsWith(`/api/resumes/${account.username}/${slug}/pdf`),
		);
		await fallback.goto(`/${account.username}/${slug}`);
		expect((await response).ok()).toBe(true);
		await expect(fallback.locator(".textLayer").first()).toContainText("Experiencia", { timeout: 30_000 });
		const download = fallback.waitForEvent("download");
		await fallback.getByRole("button", { name: "Download PDF", exact: true }).first().click();
		const path = await (await download).path();
		if (!path) throw new Error("No fallback PDF");
		expect(await textOf(await readFile(path))).toContain("Experiencia");
	} finally {
		await fallback.close();
	}
});
