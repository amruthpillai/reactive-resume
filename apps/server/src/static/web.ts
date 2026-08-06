import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { env } from "@reactive-resume/env/server";

function resolveWebDistPath() {
	const candidates = [
		// Source layout: apps/server/src/static/web.ts -> apps/web/dist
		fileURLToPath(new URL("../../../web/dist", import.meta.url)),
		// Bundled layout: apps/server/dist/index.mjs -> apps/web/dist
		fileURLToPath(new URL("../../web/dist", import.meta.url)),
	];
	const [fallback] = candidates;
	if (!fallback) throw new Error("Could not resolve web dist path");

	return candidates.find((candidate) => existsSync(candidate)) ?? fallback;
}

const staticRoot = resolveWebDistPath();
const indexHtmlPath = `${staticRoot}/index.html`;
const noindexShellPrefixes = ["/auth", "/dashboard", "/builder", "/agent", "/templates"];
const reservedPublicResumeSegments = new Set([
	"api",
	"mcp",
	".well-known",
	"uploads",
	"auth",
	"dashboard",
	"builder",
	"agent",
	"templates",
]);

function isAssetPath(pathname: string): boolean {
	return pathname.split("/").pop()?.includes(".") ?? false;
}

function getPathSegments(pathname: string) {
	return pathname.split("/").filter(Boolean);
}

function isNoindexShellPath(pathname: string): boolean {
	return noindexShellPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicResumePath(pathname: string): boolean {
	const segments = getPathSegments(pathname);
	const [firstSegment] = segments;

	return segments.length === 2 && firstSegment !== undefined && !reservedPublicResumeSegments.has(firstSegment);
}

const BASE_SECURITY_HEADERS = {
	"X-Frame-Options": "DENY",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Content-Security-Policy-Report-Only":
		"default-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'",
};

const ROOT_TITLE = "Reactive Resume — A free and open-source resume builder";
const ROOT_DESCRIPTION =
	"Reactive Resume is a free and open-source resume builder that simplifies the process of creating, updating, and sharing your resume.";
const ROOT_POSTER_PATH = "/videos/timelapse-v1.webp";
const ROOT_FAQ_ITEMS = [
	{
		question: "Is Reactive Resume really free?",
		answer:
			"Yes! Reactive Resume is completely free to use, with no hidden costs, premium tiers, or subscription fees. It's open-source and will always remain free.",
	},
	{
		question: "How is my data protected?",
		answer:
			"Your data is stored securely and is never shared with third parties. You can also self-host Reactive Resume on your own servers for complete control over your data.",
	},
	{
		question: "Can I export my resume to PDF?",
		answer:
			"Absolutely! You can export your resume to PDF with a single click. The exported PDF maintains all your formatting and styling perfectly.",
	},
	{
		question: "Is Reactive Resume available in multiple languages?",
		answer:
			"Yes, Reactive Resume is available in multiple languages. You can choose your preferred language in the settings page, or using the language switcher in the top right corner. If you don't see your language, or you would like to improve the existing translations, you can contribute to the translations on Crowdin.",
	},
	{
		question: "What makes Reactive Resume different from other resume builders?",
		answer:
			"Reactive Resume is open-source, privacy-focused, and completely free. Unlike other resume builders, it doesn't show ads, track your data, or limit your features behind a paywall.",
	},
	{
		question: "How do I share my resume?",
		answer:
			"You can share your resume via a unique public URL, protect it with a password, or download it as a PDF to share directly. The choice is yours!",
	},
] as const;

function createRootSeoMarkup(canonicalUrl: string) {
	const origin = new URL(canonicalUrl).origin;
	const imageUrl = `${origin}/opengraph/banner.jpg`;
	const structuredData = {
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "WebSite",
				name: "Reactive Resume",
				url: canonicalUrl,
			},
			{
				"@type": ["SoftwareApplication", "WebApplication"],
				name: "Reactive Resume",
				url: canonicalUrl,
				description: ROOT_DESCRIPTION,
				applicationCategory: "BusinessApplication",
				operatingSystem: "Web",
				isAccessibleForFree: true,
				offers: {
					"@type": "Offer",
					price: "0",
					priceCurrency: "USD",
				},
				codeRepository: "https://github.com/amruthpillai/reactive-resume",
			},
			{
				"@type": "Project",
				name: "Reactive Resume",
				url: canonicalUrl,
				sameAs: ["https://github.com/amruthpillai/reactive-resume"],
			},
			{
				"@type": "FAQPage",
				mainEntity: ROOT_FAQ_ITEMS.map((item) => ({
					"@type": "Question",
					name: item.question,
					acceptedAnswer: {
						"@type": "Answer",
						text: item.answer,
					},
				})),
			},
		],
	};

	return `
		<link rel="canonical" href="${canonicalUrl}">
		<link rel="preload" href="${ROOT_POSTER_PATH}" as="image" fetchpriority="high">
		<meta property="og:type" content="website">
		<meta property="og:site_name" content="Reactive Resume">
		<meta property="og:title" content="${ROOT_TITLE}">
		<meta property="og:description" content="${ROOT_DESCRIPTION}">
		<meta property="og:url" content="${canonicalUrl}">
		<meta property="og:image" content="${imageUrl}">
		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:title" content="${ROOT_TITLE}">
		<meta name="twitter:description" content="${ROOT_DESCRIPTION}">
		<meta name="twitter:image" content="${imageUrl}">
		<script id="reactive-resume-structured-data" type="application/ld+json">${JSON.stringify(structuredData)}</script>
	`;
}

export const serveWebDistStatic = serveStatic({
	root: staticRoot,
	onFound: (_path, context) => {
		if (/^\/videos\/.*-v\d+\.(?:mp4|webp)$/.test(context.req.path)) {
			context.header("Cache-Control", "public, max-age=31536000, immutable");
		}
	},
});

function getFallbackResponseHeaders(pathname: string) {
	if (pathname === "/") return { "Content-Type": "text/html; charset=UTF-8", ...BASE_SECURITY_HEADERS };
	if (isNoindexShellPath(pathname) || isPublicResumePath(pathname)) {
		return {
			"Content-Type": "text/html; charset=UTF-8",
			"X-Robots-Tag": "noindex, follow",
			...BASE_SECURITY_HEADERS,
		};
	}

	return null;
}

function notFoundResponse(options: { head?: boolean; noindex?: boolean } = {}) {
	const headers = new Headers({ "Content-Type": "text/plain; charset=UTF-8" });
	if (options.noindex) headers.set("X-Robots-Tag", "noindex, nofollow");

	return new Response(options.head ? null : "Not Found", {
		status: 404,
		headers,
	});
}

// ponytail: GET and HEAD share the same routing logic; method determines body presence
export async function handleWebApp(request: Request) {
	const isHead = request.method === "HEAD";
	const pathname = new URL(request.url).pathname;

	if (!isNoindexShellPath(pathname) && isAssetPath(pathname)) {
		return new Response(isHead ? null : "Not Found", { status: 404 });
	}

	const headers = getFallbackResponseHeaders(pathname);
	if (!headers) return notFoundResponse({ head: isHead, noindex: true });

	if (isHead) return new Response(null, { status: 200, headers });

	const html = await fs.readFile(indexHtmlPath, "utf-8");
	const canonicalUrl = new URL("/", env.APP_URL).toString();
	const responseHtml = pathname === "/" ? html.replace("</head>", `${createRootSeoMarkup(canonicalUrl)}</head>`) : html;

	return new Response(responseHtml, { headers });
}
