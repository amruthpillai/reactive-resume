import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));
const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version?: string };

export default defineConfig({
	envDir: workspaceRoot,
	plugins: [react()],
	resolve: {
		tsconfigPaths: true,
	},
	define: {
		__APP_VERSION__: JSON.stringify(rootPackageJson.version ?? "0.0.0"),
	},
	build: {
		ssr: "src/index.ts",
		target: "node24",
		outDir: "dist",
		emptyOutDir: true,
		rollupOptions: {
			output: {
				entryFileNames: "index.mjs",
			},
			external: ["@aws-sdk/client-s3", "bcrypt", "pg-native", "sharp"],
		},
	},
});
