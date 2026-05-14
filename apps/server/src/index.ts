import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { env } from "@reactive-resume/env/server";
import { handleAuth, handleOAuth } from "./handlers/auth";
import { handleHealth } from "./handlers/health";
import { handleMcp } from "./handlers/mcp";
import {
	handleMcpServerCard,
	handleOAuthAuthorizationServer,
	handleOAuthProtectedResource,
	handleOpenIdConfiguration,
	handleSchemaJson,
	handleWellKnownFallback,
} from "./handlers/metadata";
import { handleOpenApi } from "./handlers/openapi";
import { handleRpc } from "./handlers/rpc";
import { handleUpload } from "./handlers/uploads";
import { runStartupChecks } from "./lib/startup";

const staticRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
const indexHtmlPath = fileURLToPath(new URL("../../web/dist/index.html", import.meta.url));

export function createApp() {
	const app = new Hono();

	app.all("/api/rpc", (c) => handleRpc(c.req.raw));
	app.all("/api/rpc/*", (c) => handleRpc(c.req.raw));
	app.all("/api/openapi", (c) => handleOpenApi(c.req.raw));
	app.all("/api/openapi/*", (c) => handleOpenApi(c.req.raw));
	app.on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw));
	app.get("/api/health", () => handleHealth());
	app.get("/api/uploads/*", (c) => handleUpload(c.req.raw));
	app.get("/uploads/*", (c) => handleUpload(c.req.raw));
	app.get("/schema.json", () => handleSchemaJson());
	app.get("/auth/oauth", (c) => handleOAuth(c.req.raw));
	app.all("/mcp", (c) => handleMcp(c.req.raw));
	app.all("/mcp/*", (c) => handleMcp(c.req.raw));

	app.get("/.well-known/mcp/server-card.json", () => handleMcpServerCard());
	app.get("/.well-known/oauth-authorization-server", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/oauth-authorization-server/*", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/openid-configuration", (c) => handleOpenIdConfiguration(c.req.raw));
	app.get("/.well-known/oauth-protected-resource", () => handleOAuthProtectedResource());
	app.get("/.well-known/oauth-protected-resource/*", () => handleOAuthProtectedResource());
	app.get("/.well-known/*", () => handleWellKnownFallback());
	app.on(["HEAD"], "/.well-known/*", () => handleWellKnownFallback());

	app.use("/*", serveStatic({ root: staticRoot }));
	app.get("/*", async (c) => {
		const pathname = new URL(c.req.url).pathname;
		if (pathname.split("/").pop()?.includes(".")) return c.text("Not Found", 404);

		const html = await fs.readFile(indexHtmlPath, "utf-8");
		return c.html(html);
	});
	app.on(["HEAD"], "/*", async (c) => {
		const pathname = new URL(c.req.url).pathname;
		if (pathname.split("/").pop()?.includes(".")) return c.body(null, 404);

		return c.body(null, 200, { "Content-Type": "text/html; charset=UTF-8" });
	});

	return app;
}

async function main() {
	await runStartupChecks();

	const port =
		process.env.NODE_ENV === "production" ? Number.parseInt(process.env.PORT ?? "3000", 10) : env.SERVER_PORT;
	const app = createApp();

	serve(
		{
			fetch: app.fetch,
			port,
		},
		(info) => {
			console.info(`Reactive Resume server listening on http://localhost:${info.port}`);
		},
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await main();
}
