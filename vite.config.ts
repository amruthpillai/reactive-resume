import { fileURLToPath } from "node:url";
import { lingui } from "@lingui/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Polyfill for Reflect.getMetadata() (required by @better-auth/passkey)
const REFLECT_POLYFILL = `if("function"!=typeof Reflect.getMetadata){const e=new WeakMap,t=(t,a)=>e.get(t)?.get(a),a=(t,a)=>{let n=e.get(t);n||(n=new Map,e.set(t,n));let f=n.get(a);return f||(f=new Map,n.set(a,f)),f},n=(e,a,f)=>{const c=t(a,f);if(c?.has(e))return c.get(e);const s=Object.getPrototypeOf(a);return s?n(e,s,f):void 0};Reflect.getMetadata=(e,t,a)=>n(e,t,a),Reflect.getOwnMetadata=(e,a,n)=>t(a,n)?.get(e),Reflect.defineMetadata=(e,t,n,f)=>a(n,f).set(e,t),Reflect.hasMetadata=(e,t,a)=>void 0!==n(e,t,a),Reflect.hasOwnMetadata=(e,a,n)=>t(a,n)?.has(e)??!1,Reflect.metadata=(e,t)=>(n,f)=>a(n,f).set(e,t)};`;

function reflectPolyfillPlugin(): Plugin {
	return {
		name: "reflect-polyfill",
		renderChunk(code, chunk) {
			if (chunk.fileName.includes("passkey")) return `${REFLECT_POLYFILL}\n${code}`;
			return null;
		},
	};
}

const config = defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(process.env.npm_package_version),
	},

	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},

	optimizeDeps: {
		exclude: [
			"@tanstack/react-start",
			"@tanstack/react-start/client",
			"@tanstack/react-start/server",
			"@tanstack/start-server-core",
		],
	},

	build: {
		chunkSizeWarningLimit: 10 * 1024, // 10mb

		// Mute MODULE_LEVEL_DIRECTIVE warnings
		rolldownOptions: {
			onLog(level, log, defaultHandler) {
				if (level === "warn" && log.code === "MODULE_LEVEL_DIRECTIVE") return;
				defaultHandler(level, log);
			},
		},
	},

	server: {
		host: true,
		port: 3000,
		strictPort: true,
		allowedHosts: true,
		hmr: {
			host: "localhost",
			port: 3000,
		},
	},

	plugins: [
		reflectPolyfillPlugin(),
		lingui(),
		tailwindcss(),
		nitro({ plugins: ["plugins/1.migrate.ts"] }),
		tanstackStart({ router: { semicolons: true, quoteStyle: "double" } }),
		viteReact({ babel: { plugins: ["@lingui/babel-plugin-lingui-macro"] } }),
		VitePWA({
			outDir: "public",
			useCredentials: true,
			injectRegister: false,
			includeAssets: ["**/*"],
			registerType: "autoUpdate",
			workbox: {
				skipWaiting: true,
				clientsClaim: true,
				globPatterns: ["**/*"],
				maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10mb
				navigateFallback: null, // Disable navigation fallback for SSR
			},
			manifest: {
				name: "Reactive Resume",
				short_name: "Reactive Resume",
				description: "A free and open-source resume builder.",
				id: "/?source=pwa",
				start_url: "/?source=pwa",
				display: "standalone",
				orientation: "portrait",
				theme_color: "#09090B",
				background_color: "#09090B",
				icons: [
					{
						src: "favicon.ico",
						sizes: "128x128",
						type: "image/x-icon",
					},
					{
						src: "pwa-64x64.png",
						sizes: "64x64",
						type: "image/png",
					},
					{
						src: "pwa-192x192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "pwa-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "maskable-icon-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
				screenshots: [
					{
						src: "screenshots/web/1-landing-page.webp",
						sizes: "1920x1080 any",
						type: "image/webp",
						form_factor: "wide",
						label: "Landing Page",
					},
					{
						src: "screenshots/web/2-resume-dashboard.webp",
						sizes: "1920x1080 any",
						type: "image/webp",
						form_factor: "wide",
						label: "Resume Dashboard",
					},
					{
						src: "screenshots/web/3-builder-screen.webp",
						sizes: "1920x1080 any",
						type: "image/webp",
						form_factor: "wide",
						label: "Builder Screen",
					},
					{
						src: "screenshots/web/4-template-gallery.webp",
						sizes: "1920x1080 any",
						type: "image/webp",
						form_factor: "wide",
						label: "Template Gallery",
					},
					{
						src: "screenshots/mobile/1-landing-page.webp",
						sizes: "1284x2778 any",
						type: "image/webp",
						form_factor: "narrow",
						label: "Landing Page",
					},
					{
						src: "screenshots/mobile/2-resume-dashboard.webp",
						sizes: "1284x2778 any",
						type: "image/webp",
						form_factor: "narrow",
						label: "Resume Dashboard",
					},
					{
						src: "screenshots/mobile/3-builder-screen.webp",
						sizes: "1284x2778 any",
						type: "image/webp",
						form_factor: "narrow",
						label: "Builder Screen",
					},
					{
						src: "screenshots/mobile/4-template-gallery.webp",
						sizes: "1284x2778 any",
						type: "image/webp",
						form_factor: "narrow",
						label: "Template Gallery",
					},
				],
				categories: [
					"ai",
					"builder",
					"business",
					"career",
					"cv",
					"editor",
					"free",
					"generator",
					"job-search",
					"multilingual",
					"open-source",
					"privacy",
					"productivity",
					"resume",
					"self-hosted",
					"templates",
					"utilities",
					"writing",
				],
			},
		}),
	],
});

export default config;
