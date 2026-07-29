import { updateSemanticCssFixture } from "../../fixtures/db";
import { createSampleResumeFromDashboard, openSidebarSection } from "../../fixtures/resume";
import { resumeIdFromPage, waitForStablePreview } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test("@semantic-css keeps persisted semantic rendering active when authoring is off", async ({
	authPage: page,
}, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	const beforeCanvas = await waitForStablePreview(page);
	const before = await beforeCanvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL());
	const source = { languageVersion: 1, text: "@rr-version 1;\nname { color: #2563eb; font-size: 30pt; }\n" };
	await updateSemanticCssFixture(resumeIdFromPage(page), {
		stylesheet: { mode: "semantic", source, applied: source },
	});
	await page.reload();

	const afterCanvas = await waitForStablePreview(page);
	await expect
		.poll(() => afterCanvas.evaluate((element) => (element as HTMLCanvasElement).toDataURL()))
		.not.toBe(before);
	await waitForStablePreview(page);
	await openSidebarSection(page, "Custom Styles");
	await expect(page.getByText("Semantic styles remain active", { exact: true })).toBeVisible();
	await expect(
		page.getByText("This instance does not currently allow Semantic CSS editing.", { exact: true }),
	).toBeVisible();
	await expect(page.getByLabel("Target Scope")).toHaveCount(0);
});
