import { readSemanticCssFixture, updateSemanticCssFixture } from "../../fixtures/db";
import { createSampleResumeFromDashboard, openSidebarSection } from "../../fixtures/resume";
import { resumeIdFromPage } from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test("@semantic-css preserves a persisted stylesheet through an old-client resume update", async ({
	authPage: page,
}, testInfo) => {
	await createSampleResumeFromDashboard(page, testInfo);
	const resumeId = resumeIdFromPage(page);
	const source = { languageVersion: 1, text: "@version 1;\nname { color: #dc2626; }\n" };
	await updateSemanticCssFixture(resumeId, { stylesheet: { mode: "semantic", source } });
	await page.reload();

	await openSidebarSection(page, "Basics");
	await page.getByLabel("Headline").fill("Preserves semantic stylesheet");
	await expect
		.poll(() => readSemanticCssFixture(resumeId))
		.toMatchObject({
			headline: "Preserves semantic stylesheet",
			stylesheet: {
				mode: "semantic",
				source,
			},
		});
});
