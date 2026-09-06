import { request as requestFactory } from "@playwright/test";
import { createAuthenticatedContext } from "../fixtures/auth";
import { createAccount } from "../fixtures/data";
import {
	createResumeInsertGate,
	createRetiredLinkCaptureFailure,
	deleteE2EUser,
	expireRetiredResumeLink,
	hasLiveRetiredPathConflict,
	readResumeLinkState,
} from "../fixtures/db";
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

test("preserves retired-link invariants across concurrent reuse and a failed rename", async ({ authPage: page }) => {
	test.setTimeout(90_000);

	const updateResume = (resumeId: string, slug: string) =>
		page.request.put(`/api/openapi/resumes/${resumeId}`, { data: { slug } });

	const createFirst = await page.request.post("/api/openapi/resumes", {
		data: { name: "Concurrent source", slug: "e2e-concurrent-first", tags: [], withSampleData: false },
	});
	expect(createFirst.ok(), await createFirst.text()).toBe(true);
	const firstResumeId = (await createFirst.json()) as string;
	const gate = await createResumeInsertGate();
	let releaseFirstPath: ReturnType<typeof updateResume> | undefined;
	let reuseFirstPath: ReturnType<typeof page.request.post> | undefined;

	try {
		reuseFirstPath = page.request.post("/api/openapi/resumes", {
			data: { name: "Concurrent reuse", slug: "e2e-concurrent-first", tags: [], withSampleData: false },
		});
		await gate.waitUntilInsertBlocked();

		releaseFirstPath = updateResume(firstResumeId, "e2e-concurrent-third");
		const releaseResponse = await releaseFirstPath;
		expect(releaseResponse.ok(), await releaseResponse.text()).toBe(true);
		await gate.release();

		const reuseResponse = await reuseFirstPath;
		expect(reuseResponse.ok(), await reuseResponse.text()).toBe(true);
		expect(await hasLiveRetiredPathConflict("e2e-concurrent-first")).toBe(false);
	} finally {
		await gate.release();
		await Promise.allSettled([releaseFirstPath, reuseFirstPath].filter((request) => request !== undefined));
		await gate.dispose();
	}

	const updateOriginal = await page.request.put(`/api/openapi/resumes/${firstResumeId}`, {
		data: { slug: "e2e-rollback-original" },
	});
	expect(updateOriginal.ok(), await updateOriginal.text()).toBe(true);

	const createOccupied = await page.request.post("/api/openapi/resumes", {
		data: { name: "Occupied target", slug: "e2e-rollback-occupied", tags: [], withSampleData: false },
	});
	expect(createOccupied.ok(), await createOccupied.text()).toBe(true);

	const failedRename = await page.request.put(`/api/openapi/resumes/${firstResumeId}`, {
		data: { slug: "e2e-rollback-occupied" },
	});
	expect(failedRename.status()).toBe(400);
	expect(await failedRename.json()).toMatchObject({ code: "RESUME_SLUG_ALREADY_EXISTS" });
	expect(await readResumeLinkState(firstResumeId)).toEqual({
		liveSlug: "e2e-rollback-original",
		retiredLinks: [{ slug: "e2e-concurrent-third", attemptCount: 0 }],
	});
});

test("rolls back a live slug update when retired-link capture fails", async ({ authPage: page }) => {
	test.setTimeout(90_000);

	const createResponse = await page.request.post("/api/openapi/resumes", {
		data: { name: "Rollback proof", slug: "e2e-rollback-first", tags: [], withSampleData: false },
	});
	expect(createResponse.ok(), await createResponse.text()).toBe(true);
	const resumeId = (await createResponse.json()) as string;

	const initialRename = await page.request.put(`/api/openapi/resumes/${resumeId}`, {
		data: { slug: "e2e-rollback-original" },
	});
	expect(initialRename.ok(), await initialRename.text()).toBe(true);
	expect(await readResumeLinkState(resumeId)).toEqual({
		liveSlug: "e2e-rollback-original",
		retiredLinks: [{ slug: "e2e-rollback-first", attemptCount: 0 }],
	});

	const captureFailure = await createRetiredLinkCaptureFailure(resumeId);
	try {
		const failedRename = await page.request.put(`/api/openapi/resumes/${resumeId}`, {
			data: { slug: "e2e-rollback-target" },
		});
		expect(failedRename.status()).toBe(500);
		expect(await failedRename.json()).toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
	} finally {
		await captureFailure.dispose();
	}

	expect(await readResumeLinkState(resumeId)).toEqual({
		liveSlug: "e2e-rollback-original",
		retiredLinks: [{ slug: "e2e-rollback-first", attemptCount: 0 }],
	});
});
