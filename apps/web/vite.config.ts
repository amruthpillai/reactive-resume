import type { PluginOption } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { pwaManifest } from "./src/libs/pwa";

const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version: string | undefined };
const appVersion = JSON.stringify(rootPackageJson.version ?? "0.0.0");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const pwa = (): PluginOption =>
	VitePWA({
		outDir: "dist",
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
	}) as PluginOption;

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
		strictPort: true,
		port: Number.parseInt(process.env.PORT ?? "3000", 10),
		proxy: {
			"/api": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
			"/uploads": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
			"/schema.json": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
			"/auth/oauth": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
			"/mcp": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
			"/.well-known": {
				target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
				changeOrigin: true,
			},
		},
	},

	plugins: [
		tailwindcss(),
		tanstackRouter({
			target: "react",
			autoCodeSplitting: true,
		}),
		viteReact(),
		lingui(),
		babel({ presets: [linguiTransformerBabelPreset()] }),
		pwa(),
	],
});
