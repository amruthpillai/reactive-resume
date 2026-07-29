import { defineConfig, devices } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const baseURL = process.env.APP_URL ?? `http://localhost:${port}`;
const isCI = process.env.CI === "true" || process.env.CI === "1";
const isSemanticCssAuthoringRun = process.env.FLAG_SEMANTIC_CSS_AUTHORING === "true";

export default defineConfig({
	testDir: "./tests/e2e/specs",
	fullyParallel: true,
	forbidOnly: isCI,
	retries: 0,
	// Semantic CSS acceptance includes deterministic PDF preflight and 15 visual renders. Keep it serial so
	// independent browser workers do not contend for the fixed production preflight deadline.
	workers: isSemanticCssAuthoringRun ? 1 : isCI ? 2 : undefined,
	timeout: 30_000,
	expect: {
		timeout: 10_000,
	},
	reporter: isCI
		? [["list"], ["github"], ["junit", { outputFile: "test-results/e2e-junit.xml" }]]
		: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "pnpm start",
		url: `${baseURL}/api/health`,
		reuseExistingServer: !isCI,
		timeout: 120_000,
		env: {
			...process.env,
			APP_URL: baseURL,
			NODE_ENV: "production",
			PORT: String(port),
		},
	},
});
