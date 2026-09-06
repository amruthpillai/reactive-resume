import { request as requestFactory } from "@playwright/test";
import { createAuthenticatedContext } from "../fixtures/auth";
import { createAccount } from "../fixtures/data";
import { deleteE2EUser, expireRetiredResumeLink } from "../fixtures/db";
import { createSampleResumeFromDashboard, openSidebarSection } from "../fixtures/resume";
import { expect, test } from "../fixtures/test";

test("records prospective retired-link attempts without changing public 404 privacy", async ({
	browser,
	authPage: page,
}, testInfo) => {
	test.setTimeout(90_000);
	const baseURL = String(testInfo.project.use.baseURL ?? "http://127.0.0.1:31336");

	await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = new URL(page.url()).pathname.split("/")[2];
	if (!resumeId) throw new Error("Created resume ID was missing from builder URL.");

	const sessionResponse = await page.request.get("/api/auth/get-session");
	expect(sessionResponse.ok()).toBe(true);
	const session = (await sessionResponse.json()) as { user: { username: string } };
	const username = session.user.username;
	const updateResume = async (data: Record<string, unknown>) => {
		const response = await page.request.put(`/api/openapi/resumes/${resumeId}`, { data });
		expect(response.ok(), await response.text()).toBe(true);
	};
	const readRetiredLinks = async () => {
		const response = await page.request.get(`/api/openapi/resumes/${resumeId}/statistics/retired-links`);
		expect(response.ok(), await response.text()).toBe(true);
		return response.json() as Promise<Array<{ path: string; attemptCount: number; lastAttemptAt: string | null }>>;
	};
	const readStatistics = async () => {
		const response = await page.request.get(`/api/openapi/resumes/${resumeId}/statistics`);
		expect(response.ok(), await response.text()).toBe(true);
		return response.json() as Promise<{ views: number }>;
	};

	await updateResume({ slug: "first-path", isPublic: true });
	await updateResume({ slug: "second-path" });

	const anonymous = await browser.newPage();
	const otherAccount = createAccount(testInfo);
	const registrationRequest = await requestFactory.newContext({ baseURL });
	const otherContext = await createAuthenticatedContext(browser, registrationRequest, otherAccount, baseURL);
	const otherPage = await otherContext.newPage();

	try {
		const oldResponse = await anonymous.request.get(`/api/openapi/resumes/${username}/first-path`);
		expect(oldResponse.status()).toBe(404);
		await expect.poll(readRetiredLinks).toEqual(
			expect.arrayContaining([
				{
					path: `/${username}/first-path`,
					attemptCount: 1,
					lastAttemptAt: expect.any(String),
				},
			]),
		);

		expect((await anonymous.request.get(`/api/openapi/resumes/${username}/first-path`)).status()).toBe(404);
		await expect
			.poll(readRetiredLinks)
			.toEqual(expect.arrayContaining([expect.objectContaining({ path: `/${username}/first-path`, attemptCount: 1 })]));

		const liveResponse = await anonymous.request.get(`/api/openapi/resumes/${username}/second-path`);
		expect(liveResponse.ok()).toBe(true);
		await expect.poll(readStatistics).toMatchObject({ views: 1 });

		expect((await page.request.get(`/api/openapi/resumes/${username}/first-path`)).status()).toBe(404);
		await expect
			.poll(readRetiredLinks)
			.toEqual(expect.arrayContaining([expect.objectContaining({ path: `/${username}/first-path`, attemptCount: 1 })]));

		const denied = await otherPage.request.get(`/api/openapi/resumes/${resumeId}/statistics/retired-links`);
		expect(denied.status()).toBe(404);

		await page.goto(`/builder/${resumeId}`);
		await openSidebarSection(page, "Statistics");
		await expect(page.getByText("Old link attempts")).toBeVisible();
		await expect(page.getByText(`/${username}/first-path`)).toBeVisible();
		await expect(page.getByText("1 attempt")).toBeVisible();

		await updateResume({ slug: "third-path" });
		await updateResume({ isPublic: false });
		expect((await anonymous.request.get(`/api/openapi/resumes/${username}/second-path`)).status()).toBe(404);
		await updateResume({ isPublic: true });

		await expireRetiredResumeLink(username, "second-path");
		expect((await anonymous.request.get(`/api/openapi/resumes/${username}/second-path`)).status()).toBe(404);
		expect((await readRetiredLinks()).some((link) => link.path.endsWith("/second-path"))).toBe(false);

		const createReuse = await page.request.post("/api/openapi/resumes", {
			data: { name: "Live reuse", slug: "first-path", tags: [], withSampleData: false },
		});
		expect(createReuse.ok(), await createReuse.text()).toBe(true);
		const reusedResumeId = (await createReuse.json()) as string;
		const publishReuse = await page.request.put(`/api/openapi/resumes/${reusedResumeId}`, {
			data: { isPublic: true },
		});
		expect(publishReuse.ok(), await publishReuse.text()).toBe(true);
		expect((await anonymous.request.get(`/api/openapi/resumes/${username}/first-path`)).ok()).toBe(true);
		expect((await readRetiredLinks()).some((link) => link.path.endsWith("/first-path"))).toBe(false);

		const deleted = await page.request.delete(`/api/openapi/resumes/${resumeId}`);
		expect(deleted.ok(), await deleted.text()).toBe(true);
		expect((await anonymous.request.get(`/api/openapi/resumes/${username}/second-path`)).status()).toBe(404);
	} finally {
		await anonymous.close();
		await otherPage.close();
		await otherContext.close();
		await registrationRequest.dispose();
		await deleteE2EUser(otherAccount);
	}
});
