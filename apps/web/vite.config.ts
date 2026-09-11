import type { ProxyOptions } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version: string | undefined };
const appVersion = JSON.stringify(rootPackageJson.version ?? "0.0.0");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const serverPaths = ["/api", "/mcp", "/uploads", "/.well-known", "/schema.json"] as const;

const serverProxy = serverPaths.reduce(
	(acc, path) => {
		acc[path] = {
			target: `http://localhost:${process.env.SERVER_PORT ?? "3001"}`,
			changeOrigin: true,
		};
		return acc;
	},
	{} as Record<string, ProxyOptions>,
);

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
			external: ["bcrypt", "sharp", "@aws-sdk/client-s3", "ioredis", "linkedom"],
		},
	},

	server: {
		host: true,
		strictPort: true,
		port: Number.parseInt(process.env.PORT ?? "3000", 10),
		proxy: serverProxy,
	},

	plugins: [
		{
			name: "cloudflare-rocket-loader-bootstrap",
			transformIndexHtml: {
				order: "post",
				handler: (html) =>
					html.replace(
						/<script\b(?=[^>]*\btype="module")(?=[^>]*\bsrc="\/assets\/[^"]+")(?![^>]*\bdata-cfasync=)[^>]*>/,
						(script) => script.replace('src="', 'data-cfasync="false" src="'),
					),
			},
		},
		devtools(),
		tailwindcss(),
		tanstackRouter({
			target: "react",
			semicolons: true,
			quoteStyle: "double",
			autoCodeSplitting: true,
		}),
		viteReact(),
		lingui(),
		babel({ presets: [reactCompilerPreset(), linguiTransformerBabelPreset()] }),
	],
});
