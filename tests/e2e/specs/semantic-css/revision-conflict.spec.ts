import { updateSemanticCssFixture } from "../../fixtures/db";
import {
	createSemanticCssResume,
	readStylesheetSource,
	replaceStylesheet,
	seedSemanticCssResume,
	waitForStylesheetStatus,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

test.setTimeout(120_000);

test("@semantic-css rebases a stale revision without dropping the focused draft", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	await seedSemanticCssResume(page, resumeId);
	await replaceStylesheet(page, "@version 1;\nname { color: #dc2626; }\n");
	await waitForStylesheetStatus(page, "Applied");

	await updateSemanticCssFixture(resumeId, { bumpRevision: true });
	const latest = "@version 1;\nname { color: #2563eb; }\n";
	await replaceStylesheet(page, latest);
	await waitForStylesheetStatus(page, "Applied");
	await expect.poll(() => readStylesheetSource(page)).toBe(latest);
});
