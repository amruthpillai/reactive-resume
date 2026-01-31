import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * @remarks
 * Baseline Vitest configuration for unit-level checks that focus on schema contracts.
 * Keep this minimal so it remains portable across environments and CI hosts.
 *
 * @see {@link https://vitest.dev/config/ | Vitest configuration reference}
 */
export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["tests/**/*.test.ts"],
	},
});
