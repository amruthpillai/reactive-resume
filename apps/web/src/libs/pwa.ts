import type { ManifestOptions } from "vite-plugin-pwa";

const pwaAppName = "Reactive Resume";
const pwaShortDescription = "A free and open-source resume builder.";
const pwaThemeColor = "#09090B";
const pwaBackgroundColor = "#09090B";

export const pwaManifest = {
	name: pwaAppName,
	short_name: pwaAppName,
	description: pwaShortDescription,
	id: "/?source=pwa",
	start_url: "/?source=pwa",
	scope: "/",
	lang: "en",
	display: "standalone",
	orientation: "portrait",
	theme_color: pwaThemeColor,
	background_color: pwaBackgroundColor,
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
} satisfies Partial<ManifestOptions>;

export const pwaHeadMetaTags = [
	{ name: "theme-color", content: pwaThemeColor },
	{ name: "application-name", content: pwaAppName },
	{ name: "mobile-web-app-capable", content: "yes" },
	{ name: "apple-mobile-web-app-capable", content: "yes" },
	{ name: "apple-mobile-web-app-title", content: pwaAppName },
	{ name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
];

export const pwaServiceWorkerRegistrationScript = `
	if ("serviceWorker" in navigator) {
		window.addEventListener("load", () => {
			navigator.serviceWorker.register("/sw.js", { scope: "/" });
		});
	}
`;
