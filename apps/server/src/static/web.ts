import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";

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

export const serveWebDistStatic = serveStatic({ root: staticRoot });

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

function getFallbackResponseHeaders(pathname: string) {
	if (pathname === "/") return { "Content-Type": "text/html; charset=UTF-8" };
	if (isNoindexShellPath(pathname) || isPublicResumePath(pathname)) {
		return {
			"Content-Type": "text/html; charset=UTF-8",
			"X-Robots-Tag": "noindex, follow",
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

export async function handleWebApp(request: Request) {
	const pathname = new URL(request.url).pathname;
	if (!isNoindexShellPath(pathname) && isAssetPath(pathname)) return new Response("Not Found", { status: 404 });

	const headers = getFallbackResponseHeaders(pathname);
	if (!headers) return notFoundResponse({ noindex: true });

	const html = await fs.readFile(indexHtmlPath, "utf-8");
	return new Response(html, { headers });
}

export function handleWebAppHead(request: Request) {
	const pathname = new URL(request.url).pathname;
	if (!isNoindexShellPath(pathname) && isAssetPath(pathname)) return new Response(null, { status: 404 });

	const headers = getFallbackResponseHeaders(pathname);
	if (!headers) return notFoundResponse({ head: true, noindex: true });

	return new Response(null, { status: 200, headers });
}
