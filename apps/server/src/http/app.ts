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
import { handleUpload } from "../static/uploads";
import { handleWebApp, handleWebAppHead, serveWebDistStatic } from "../static/web";
import { handleAuth, handleOAuth } from "./auth";
import { handleHealth } from "./health";

export function createApp() {
	const app = new Hono();

	app.all("/api/rpc", (c) => handleRpc(c.req.raw));
	app.all("/api/rpc/*", (c) => handleRpc(c.req.raw));
	app.all("/api/openapi", (c) => handleOpenApi(c.req.raw));
	app.all("/api/openapi/*", (c) => handleOpenApi(c.req.raw));
	app.get("/api/auth/oauth", (c) => handleOAuth(c.req.raw));
	app.all("/api/auth/*", (c) => handleAuth(c.req.raw));
	app.get("/api/health", () => handleHealth());
	app.get("/api/uploads/*", (c) => handleUpload(c.req.raw));
	app.get("/uploads/*", (c) => handleUpload(c.req.raw));
	app.all("/mcp", (c) => handleMcp(c.req.raw));
	app.all("/mcp/*", (c) => handleMcp(c.req.raw));

	app.get("/.well-known/mcp/server-card.json", () => handleMcpServerCard());
	app.get("/.well-known/oauth-authorization-server", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/oauth-authorization-server/*", (c) => handleOAuthAuthorizationServer(c.req.raw));
	app.get("/.well-known/openid-configuration", (c) => handleOpenIdConfiguration(c.req.raw));
	app.get("/.well-known/oauth-protected-resource", () => handleOAuthProtectedResource());
	app.get("/.well-known/oauth-protected-resource/*", () => handleOAuthProtectedResource());
	app.all("/.well-known/*", () => handleWellKnownFallback());

	app.use("/*", serveWebDistStatic);
	app.on(["GET"], "/*", (c) => handleWebApp(c.req.raw));
	app.on(["HEAD"], "/*", (c) => handleWebAppHead(c.req.raw));

	return app;
}
