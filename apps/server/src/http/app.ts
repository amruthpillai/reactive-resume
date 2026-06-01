import { Hono } from "hono";
import { handleMcp } from "../mcp/handler";
import { handleOpenApi } from "../openapi/handler";
import {
	handleMcpServerCard,
	handleOAuthAuthorizationServer,
	handleOAuthProtectedResource,
	handleOpenIdConfiguration,
	handleWellKnownFallback,
} from "../openapi/metadata";
import { handleRpc } from "../rpc/handler";
import { handleSchemaJson } from "../static/schema";
import { handleLlms, handleRobots, handleSitemap } from "../static/seo";
import { handleUpload } from "../static/uploads";
import { handleWebApp, handleWebAppHead, serveWebDistStatic } from "../static/web";
import { handleAuth, handleOAuth } from "./auth";
import { handleHealth } from "./health";
import { handleResumePdfDownload } from "./resume-pdf";

export function createApp() {
	const app = new Hono();

	app.all("/api/rpc", (c) => handleRpc(c.req.raw));
	app.all("/api/rpc/*", (c) => handleRpc(c.req.raw));
	app.all("/api/openapi", (c) => handleOpenApi(c.req.raw));
	app.all("/api/openapi/*", (c) => handleOpenApi(c.req.raw));
	app.get("/api/auth/oauth", (c) => handleOAuth(c.req.raw));
	app.all("/api/auth/*", (c) => handleAuth(c.req.raw));
	app.get("/api/health", () => handleHealth());
	app.get("/api/resumes/:id/pdf", (c) => handleResumePdfDownload(c.req.raw, c.req.param("id")));
	app.get("/api/uploads/*", (c) => handleUpload(c.req.raw));
	app.get("/uploads/*", (c) => handleUpload(c.req.raw));
	app.get("/schema.json", () => handleSchemaJson());
	app.all("/mcp", (c) => handleMcp(c.req.raw));
	app.all("/mcp/*", (c) => handleMcp(c.req.raw));

	app.get("/.well-known/mcp/server-card.json", () => handleMcpServerCard());
	app.get("/.well-known/oauth-authorization-server", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/oauth-authorization-server/*", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/openid-configuration", (c) => handleOpenIdConfiguration(c.req.raw));
	app.get("/.well-known/oauth-protected-resource", () => handleOAuthProtectedResource());
	app.get("/.well-known/oauth-protected-resource/*", () => handleOAuthProtectedResource());
	app.all("/.well-known/*", () => handleWellKnownFallback());

	app.on(["GET", "HEAD"], "/robots.txt", (c) => handleRobots({ head: c.req.method === "HEAD" }));
	app.on(["GET", "HEAD"], "/sitemap.xml", (c) => handleSitemap({ head: c.req.method === "HEAD" }));
	app.on(["GET", "HEAD"], "/llms.txt", (c) => handleLlms({ head: c.req.method === "HEAD" }));

	app.use("/*", serveWebDistStatic);
	app.on(["GET"], "/*", (c) => handleWebApp(c.req.raw));
	app.on(["HEAD"], "/*", (c) => handleWebAppHead(c.req.raw));

	return app;
}
