import type { Plugin, ProxyOptions } from "vite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Auto-reload the browser tab when the dev server restarts, and forcibly evict
 * any pre-existing browser cache for this origin on first contact after each
 * server boot.  Without the eviction step a stale `/@vite/client` (and its
 * baked-in HMR token) can persist across server restarts even with
 * `Cache-Control: no-store` — because the browser cached the file under the
 * server's previous headers and silently keeps using it.
 *
 * The plugin remembers, per-process, which client IPs have been served. The
 * first response any given IP gets after server start carries
 * `Clear-Site-Data: "cache"` on the HTML document, nuking that browser's
 * cached entries for this origin one time.
 */
const autoReloadOnServerRestart = (): Plugin => {
	const serverId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
	const clientsServed = new Set<string>();
	return {
		name: "auto-reload-on-server-restart",
		apply: "serve",
		configureServer(server) {
			server.middlewares.use("/__server_id", (_req, res) => {
				res.setHeader("Content-Type", "text/plain");
				res.setHeader("Cache-Control", "no-store");
				res.end(serverId);
			});

			// Tag the HTML document response with Clear-Site-Data the first
			// time each client connects after the server (re)started.  This
			// flushes whatever stale `/@vite/client` etc. the browser was
			// holding onto from the previous Vite process.
			server.middlewares.use((req, res, next) => {
				const isHtmlDoc = !req.url || req.url === "/" || req.url.split("?")[0]?.endsWith(".html");
				const key = req.socket.remoteAddress ?? "unknown";
				if (isHtmlDoc && !clientsServed.has(key)) {
					clientsServed.add(key);
					res.setHeader("Clear-Site-Data", '"cache"');
				}
				next();
			});
		},
		transformIndexHtml() {
			return [
				{
					tag: "script",
					injectTo: "head",
					children: `
(() => {
	let initial = null;
	const check = async () => {
		try {
			const res = await fetch("/__server_id", { cache: "no-store" });
			if (!res.ok) return;
			const id = await res.text();
			if (initial === null) initial = id;
			else if (initial !== id) location.reload();
		} catch {}
	};
	setInterval(check, 1500);
	check();
})();
					`.trim(),
				},
			];
		},
	};
};

const rootPackageJsonPath = new URL("../../package.json", import.meta.url);
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf-8")) as { version: string | undefined };
const appVersion = JSON.stringify(rootPackageJson.version ?? "0.0.0");
const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const serverPaths = ["/api", "/mcp", "/uploads", "/.well-known", "/schema.json"] as const;

const serverProxy = serverPaths.reduce(
	(acc, path) => {
		acc[path] = {
			target: `http://127.0.0.1:${process.env.SERVER_PORT ?? "3001"}`,
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
		dedupe: ["react", "react-dom", "react/jsx-runtime", "react/compiler-runtime"],
	},

	optimizeDeps: {
		include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "react/compiler-runtime"],
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
		hmr: {
			// Force IPv4 — on Windows `localhost` resolves to ::1 (IPv6) but
			// Vite's `host: true` only binds to 0.0.0.0 (IPv4).  Browsers do
			// not fall back from IPv6 to IPv4 for WebSockets, so HMR would
			// silently fail, forcing a hard-refresh after every code change.
			host: "127.0.0.1",
			clientPort: Number.parseInt(process.env.PORT ?? "3000", 10),
		},
		// Disable browser caching of dev assets so a normal F5 always picks up
		// a fresh /@vite/client (with the current HMR token) after server restart.
		headers: {
			"Cache-Control": "no-store",
		},
	},

	plugins: [
		autoReloadOnServerRestart(),
		tailwindcss(),
		tanstackRouter({
			target: "react",
			semicolons: true,
			quoteStyle: "double",
			autoCodeSplitting: true,
		}),
		viteReact(),
		lingui(),
		// React Compiler temporarily disabled — investigating duplicate-React issue with
		// react/compiler-runtime under Vite pre-bundling + pnpm symlinks.
		// babel({ presets: [reactCompilerPreset(), linguiTransformerBabelPreset()] }),
		babel({ presets: [linguiTransformerBabelPreset()] }),
	],
});
