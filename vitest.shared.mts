import type { ViteUserConfig } from "vitest/config";
import type { VitestEnvironment } from "vitest/node";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));
const setupFile = fileURLToPath(new URL("./vitest.setup.ts", import.meta.url));

type VitestProjectOptions = {
	name: string;
	dirname: string;
	environment?: VitestEnvironment;
	plugins?: ViteUserConfig["plugins"];
};

export const createVitestProjectConfig = ({
	name,
	dirname,
	environment = "node",
	plugins = [],
}: VitestProjectOptions) =>
	defineConfig({
		root: dirname,
		envDir: workspaceRoot,
		resolve: { tsconfigPaths: true },
		plugins,
		test: {
			name,
			environment,
			environmentOptions: {
				happyDOM: {
					settings: {
						disableJavaScriptFileLoading: true,
						disableCSSFileLoading: true,
						navigation: {
							disableMainFrameNavigation: true,
							disableChildFrameNavigation: true,
							disableChildPageNavigation: true,
						},
					},
				},
			},
			setupFiles: [setupFile],
			include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"],
			exclude: ["node_modules", "dist", ".output", "coverage", "reports"],
			pool: "threads",
			// Isolation stays on: without it, test files in a worker share one module registry, so a
			// `vi.mock` in one file leaks into another and whichever file imported a module first wins.
			// That made every suite mocking `@reactive-resume/env/server` order-dependent and flaky.
			passWithNoTests: true,
			coverage: {
				provider: "v8",
				reportsDirectory: "coverage",
				reporter: ["text", "text-summary", "json-summary", "json", "lcov", "html"],
				include: ["src/**/*.{ts,tsx}"],
				exclude: ["src/**/*.{test,spec}.*", "src/**/*.d.ts", "src/routeTree.gen.ts"],
				reportOnFailure: true,
			},
		},
	});
