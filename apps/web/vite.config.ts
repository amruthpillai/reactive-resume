import type { Plugin, PluginOption } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaManifest } from "./src/libs/pwa";

const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version: string | undefined };
const appVersion = JSON.stringify(rootPackageJson.version ?? "0.0.0");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const pwa = (): PluginOption =>
	VitePWA({
		outDir: ".output/public",
		useCredentials: true,
		injectRegister: false,
		includeAssets: ["favicon.ico", "favicon.svg", "apple-touch-icon-180x180.png", "screenshots/**/*"],
		registerType: "autoUpdate",
		workbox: {
			skipWaiting: true,
			clientsClaim: true,
			cleanupOutdatedCaches: true,
			globPatterns: ["**/*"],
			globIgnores: ["**/manifest.webmanifest"],
			maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
			navigateFallback: null,
		},
		manifest: pwaManifest,
	}).map((plugin) => ({
		...(plugin as Plugin),
		applyToEnvironment: (environment) => environment.name === "client",
	}));

export default defineConfig({
	envDir: workspaceRoot,

	resolve: {
		tsconfigPaths: true,
	},

	define: {
		__APP_VERSION__: appVersion,
	},

	build: {
		chunkSizeWarningLimit: 10 * 1024, // 10 MB
		rolldownOptions: {
			external: ["bcrypt", "sharp", "@aws-sdk/client-s3"],
		},
	},

	server: {
		host: true,
		port: Number.parseInt(process.env.PORT ?? "3000", 10),
	},

	plugins: [
		tailwindcss(),
		tanstackStart(),
		viteReact(),
		lingui(),
		babel({ presets: [linguiTransformerBabelPreset()] }),
		nitro({ plugins: ["plugins/1.migrate.ts"] }),
		pwa(),
	],
});
