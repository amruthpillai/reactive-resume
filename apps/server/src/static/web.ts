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

export const serveWebDistStatic = serveStatic({ root: staticRoot });

function isAssetPath(pathname: string): boolean {
	return pathname.split("/").pop()?.includes(".") ?? false;
}

export async function handleWebApp(request: Request) {
	const pathname = new URL(request.url).pathname;
	if (isAssetPath(pathname)) return new Response("Not Found", { status: 404 });

	const html = await fs.readFile(indexHtmlPath, "utf-8");
	return new Response(html, {
		headers: { "Content-Type": "text/html; charset=UTF-8" },
	});
}

export function handleWebAppHead(request: Request) {
	const pathname = new URL(request.url).pathname;
	if (isAssetPath(pathname)) return new Response(null, { status: 404 });

	return new Response(null, {
		status: 200,
		headers: { "Content-Type": "text/html; charset=UTF-8" },
	});
}
