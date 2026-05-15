# Monolith and Split Deployment Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status note:** This is a historical proposal, not the current architecture source of truth. Before executing any task from this plan, verify paths and route ownership against `AGENTS.md`, `docs/contributing/architecture.mdx`, and the current `apps/server/src/{http,rpc,mcp,openapi,static,startup}` tree.

**Goal:** Preserve the existing one-image Docker contract for open-source self-hosters while enabling the same codebase to run as an edge/static frontend plus Node backend for hosted and VPS split deployments.

**Architecture:** Reactive Resume should have one route ownership model and multiple deployment compositions. The OSS Docker image remains a monolith: one image, one port, backend routes plus static SPA fallback. Hosted/split deployments serve the built SPA statically from Cloudflare/S3/NGINX/Caddy and route only backend-owned paths to the Node server, where unknown frontend routes return `404`.

**Tech Stack:** Hono, Better Auth, Vite, Turborepo, Docker, optional NGINX/Caddy/CDN routing, Zod JSON Schema generation.

---

## Decisions Locked By This Plan

- Keep the official Docker image as a complete monolith.
- Do not make NGINX a required wrapper for the official OSS image.
- Use Hono static serving as the Docker/self-host fallback.
- Prefer edge/static frontend plus Node backend for hosted Reactive Resume.
- Do not pursue Cloudflare Worker backend support in this phase.
- Keep backend logic Node-first and platform-independent where practical, but do not contort PDF, database, storage, or auth runtime code for Worker compatibility yet.
- Move custom OAuth bridge behavior under `/api/auth/oauth`.
- Keep `/.well-known/*` backend-owned because OAuth/MCP metadata is runtime-owned.
- Make `/schema.json` frontend/static-owned by generating it during build/source preparation.
- In split backend mode, unknown non-backend routes return `404`.

## Deployment Modes

### Mode 1: Docker Monolith

**Audience:** OSS users and current Docker image consumers.

```txt
Request -> Node/Hono server
  /api/*              -> backend
  /api/auth/oauth     -> custom OAuth bridge
  /mcp, /mcp/*        -> backend
  /.well-known/*      -> backend
  /uploads/*          -> backend unless object storage owns this later
  /schema.json        -> static file from apps/web/dist
  static assets       -> static file from apps/web/dist
  non-file GET/HEAD   -> apps/web/dist/index.html
  file-looking miss   -> 404
```

### Mode 2: Split VPS

**Audience:** Advanced self-hosters or the project owner's VPS migration path.

```txt
Request -> NGINX/Caddy
  static files        -> apps/web/dist
  SPA fallback        -> apps/web/dist/index.html
  backend routes      -> proxy to Node

Request -> Node/Hono backend-only app
  backend routes      -> backend
  unknown routes      -> 404
```

### Mode 3: Hosted Edge Frontend + Node Backend

**Audience:** Cloud hosted Reactive Resume.

```txt
Request -> Cloudflare/S3/CDN
  static files        -> edge object/static hosting
  SPA fallback        -> edge index.html
  backend routes      -> proxy/fetch to Node backend

Request -> Node backend
  backend routes      -> backend
  unknown routes      -> 404
```

---

## Route Ownership Contract

### Backend-Owned Routes

```txt
/api/*
/api/auth/oauth
/mcp
/mcp/*
/.well-known/*
/uploads/*
```

`/uploads/*` remains backend-owned while local filesystem uploads are supported. If uploads move fully to S3/R2 public or signed URLs later, this can become object-storage-owned.

### Frontend/Static-Owned Routes

```txt
/schema.json
/assets/*
/templates/*
/favicon.ico
/favicon.svg
/manifest.webmanifest
/robots.txt
/sitemap.xml
/fonts/*
/icon/*
/logo/*
/opengraph/*
/photos/*
/pwa-*.png
/sounds/*
/videos/*
```

### Frontend SPA-Owned Routes

```txt
/auth/*
/dashboard/*
/builder/*
/agent/*
/$username/$slug
all other non-file GET/HEAD frontend routes
```

In Docker monolith mode, Node serves the SPA fallback. In split modes, the static frontend host serves the SPA fallback and Node returns `404` for unknown non-backend routes.

---

## File Structure

- Create `packages/server`
  - Owns route ownership constants and shared Hono app composition.
  - Exposes `createBackendApp()` and `createMonolithApp()`.
- Modify `apps/server/src/index.ts`
  - Becomes a thin Node entrypoint around `@reactive-resume/server/node`.
  - Selects monolith/backend-only mode through explicit env/config.
- Modify `apps/server/src/handlers/*`
  - Move or re-export handlers into `packages/server` only after package boundaries are clear.
  - Keep this as a later task if direct movement is too large.
- Modify `packages/auth/src/config.ts`
  - Change OAuth provider `loginPage` and `consentPage` to `/api/auth/oauth`.
- Modify `apps/server/src/handlers/auth.ts`
  - Change callback preservation to `/api/auth/oauth`.
- Create `packages/scripts/schema/generate.ts`
  - Generates both package and web-public schema artifacts.
- Create `apps/web/public/schema.json`
  - Static schema artifact for Vite, Docker monolith, S3, and edge hosting.
- Modify `apps/web/package.json`
  - Runs schema generation before build.
- Modify `apps/web/vite.config.ts`
  - Remove dev proxies that become unnecessary after route/static ownership cleanup.
- Modify `Dockerfile`
  - Preserve one-image behavior.
  - Make runtime default to monolith mode.
- Create `docs/deployment/architecture.mdx`
  - Explains monolith vs split modes.
- Create `docs/deployment/split-vps.mdx`
  - Shows NGINX/Caddy examples.
- Create `docs/deployment/edge-frontend-node-backend.mdx`
  - Shows Cloudflare/S3/CDN static frontend plus Node backend.
- Create or update `AGENTS.md`
  - Records route ownership and deployment-mode rules as normative architecture guidance.

---

## Task 1: Document The Deployment Contract First

**Files:**
- Create: `docs/deployment/architecture.mdx`
- Create: `docs/deployment/split-vps.mdx`
- Create: `docs/deployment/edge-frontend-node-backend.mdx`
- Modify: `AGENTS.md`

- [ ] **Step 1: Write `docs/deployment/architecture.mdx`**

Create the document with these sections:

```mdx
# Deployment Architecture

Reactive Resume supports multiple deployment compositions from one codebase.

## Default: Docker Monolith

The official Docker image remains a complete application image. It exposes one port and serves backend routes, static assets, and SPA fallback from the same Node process.

This is the compatibility contract for open-source self-hosters.

## Split Frontend And Backend

Split deployments serve `apps/web/dist` from a static host and route backend-owned paths to the Node server.

The Node server does not serve SPA fallback in backend-only mode. Unknown non-backend routes return `404`.

## Route Ownership

Backend-owned:

- `/api/*`
- `/api/auth/oauth`
- `/mcp`
- `/mcp/*`
- `/.well-known/*`
- `/uploads/*`

Frontend/static-owned:

- `/schema.json`
- `/assets/*`
- `/templates/*`
- `/favicon.ico`
- `/favicon.svg`
- `/manifest.webmanifest`
- `/robots.txt`
- `/sitemap.xml`
- `/fonts/*`
- `/icon/*`
- `/logo/*`
- `/opengraph/*`
- `/photos/*`
- `/pwa-*.png`
- `/sounds/*`
- `/videos/*`

Frontend SPA-owned:

- `/auth/*`
- `/dashboard/*`
- `/builder/*`
- `/agent/*`
- public resume pages
- all other non-file frontend routes

## Runtime Modes

- `monolith`: backend routes plus static SPA serving.
- `backend-only`: backend routes only; unknown routes return `404`.
```

- [ ] **Step 2: Write `docs/deployment/split-vps.mdx`**

Include this minimal NGINX shape:

```nginx
server {
    listen 80;
    server_name example.com;

    root /srv/reactive-resume/web;
    index index.html;

    location ^~ /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location = /mcp {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ^~ /mcp/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ^~ /.well-known/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location ^~ /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Add a note that `APP_URL` must be the public origin.

- [ ] **Step 3: Write `docs/deployment/edge-frontend-node-backend.mdx`**

Include:

```mdx
# Edge Frontend With Node Backend

Build `apps/web/dist` and upload it to the static host. Route backend-owned paths to the Node backend.

Backend route patterns:

- `/api/*`
- `/mcp`
- `/mcp/*`
- `/.well-known/*`
- `/uploads/*`

The frontend host owns `/schema.json` and SPA fallback.

The Node backend should run in backend-only mode so unknown frontend routes return `404`.
```

- [ ] **Step 4: Update `AGENTS.md`**

Add a short normative section:

```md
### Deployment route ownership

The official Docker image is a monolith and must keep serving the full application from one image and one port.

Split deployments are supported by serving `apps/web/dist` statically and routing backend-owned paths to Node. In backend-only mode, Node returns `404` for unknown frontend routes.

Do not add new backend routes outside `/api/*`, `/mcp`, `/.well-known/*`, or explicitly documented exceptions without updating the route ownership docs.
```

- [ ] **Step 5: Commit**

```bash
git add docs/deployment/architecture.mdx docs/deployment/split-vps.mdx docs/deployment/edge-frontend-node-backend.mdx AGENTS.md
git commit -m "docs: define monolith and split deployment contract"
```

---

## Task 2: Create Route Ownership Primitives

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/vitest.config.ts`
- Create: `packages/server/src/routes/ownership.ts`
- Create: `packages/server/src/routes/ownership.test.ts`

- [ ] **Step 1: Write the failing ownership tests**

Create `packages/server/src/routes/ownership.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getRouteOwner } from "./ownership";

describe("getRouteOwner", () => {
	it.each([
		["/api/rpc", "backend"],
		["/api/auth/oauth", "backend"],
		["/mcp", "backend"],
		["/mcp/tools", "backend"],
		["/.well-known/oauth-protected-resource", "backend"],
		["/uploads/avatar.png", "backend"],
		["/schema.json", "static"],
		["/assets/app.js", "static"],
		["/templates/jpg/azurill.jpg", "static"],
		["/auth/login", "spa"],
		["/dashboard", "spa"],
		["/builder/abc", "spa"],
		["/agent/thread", "spa"],
		["/amruth/resume", "spa"],
	])("classifies %s as %s", (pathname, owner) => {
		expect(getRouteOwner(pathname)).toBe(owner);
	});

	it.each(["/missing.js", "/unknown.css", "/image.png"])("classifies file-looking misses as static", (pathname) => {
		expect(getRouteOwner(pathname)).toBe("static");
	});
});
```

- [ ] **Step 2: Add package scaffolding**

Create `packages/server/package.json`:

```json
{
	"name": "@reactive-resume/server",
	"version": "0.0.0",
	"type": "module",
	"private": true,
	"exports": {
		"./routes/ownership": "./src/routes/ownership.ts"
	},
	"scripts": {
		"typecheck": "tsgo --noEmit",
		"test": "vitest run --passWithNoTests"
	},
	"devDependencies": {
		"@reactive-resume/config": "workspace:*",
		"@typescript/native-preview": "7.0.0-dev.20260514.1",
		"typescript": "^6.0.3"
	}
}
```

Create `packages/server/tsconfig.json`:

```json
{
	"extends": "@reactive-resume/config/tsconfig.base.json"
}
```

Create `packages/server/vitest.config.ts`:

```ts
import { createVitestProjectConfig } from "@reactive-resume/config/vitest";

export default createVitestProjectConfig({
	name: "@reactive-resume/server",
});
```

- [ ] **Step 3: Run the failing tests**

```bash
pnpm --filter @reactive-resume/server test -- src/routes/ownership.test.ts
```

Expected: fails because `ownership.ts` does not exist.

- [ ] **Step 4: Implement route ownership**

Create `packages/server/src/routes/ownership.ts`:

```ts
export type RouteOwner = "backend" | "static" | "spa";

const backendExactRoutes = new Set(["/mcp"]);
const backendPrefixes = ["/api/", "/mcp/", "/.well-known/", "/uploads/"];
const staticExactRoutes = new Set([
	"/schema.json",
	"/favicon.ico",
	"/favicon.svg",
	"/manifest.webmanifest",
	"/robots.txt",
	"/sitemap.xml",
]);
const staticPrefixes = [
	"/assets/",
	"/templates/",
	"/fonts/",
	"/icon/",
	"/logo/",
	"/opengraph/",
	"/photos/",
	"/sounds/",
	"/videos/",
];

function looksLikeFile(pathname: string) {
	const lastSegment = pathname.split("/").pop() ?? "";
	return lastSegment.includes(".");
}

export function getRouteOwner(pathname: string): RouteOwner {
	if (backendExactRoutes.has(pathname)) return "backend";
	if (backendPrefixes.some((prefix) => pathname.startsWith(prefix))) return "backend";
	if (staticExactRoutes.has(pathname)) return "static";
	if (staticPrefixes.some((prefix) => pathname.startsWith(prefix))) return "static";
	if (/^\/pwa-\d+x\d+\.png$/.test(pathname)) return "static";
	if (looksLikeFile(pathname)) return "static";
	return "spa";
}

export function isBackendRoute(pathname: string) {
	return getRouteOwner(pathname) === "backend";
}

export function isStaticRoute(pathname: string) {
	return getRouteOwner(pathname) === "static";
}
```

- [ ] **Step 5: Verify route ownership tests**

```bash
pnpm --filter @reactive-resume/server test -- src/routes/ownership.test.ts
pnpm --filter @reactive-resume/server typecheck
```

Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add packages/server
git commit -m "feat(server): add route ownership contract"
```

---

## Task 3: Move Custom OAuth Bridge To `/api/auth/oauth`

**Files:**
- Modify: `apps/server/src/handlers/auth.test.ts`
- Create: `apps/server/src/index.test.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/handlers/auth.ts`
- Modify: `packages/auth/src/config.ts`
- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Update the handler test first**

In `apps/server/src/handlers/auth.test.ts`, change the request URL and expected callback path:

```ts
const response = await handleOAuth(
	new Request(
		"http://localhost:3001/api/auth/oauth?client_id=test-client&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback&state=abc&exp=123&sig=456",
	),
);

expect(callbackUrl.pathname).toBe("/api/auth/oauth");
```

- [ ] **Step 2: Add a route precedence test**

Create `apps/server/src/index.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	handleAuth: vi.fn(),
	handleOAuth: vi.fn(),
}));

vi.mock("./handlers/auth", () => ({
	handleAuth: mocks.handleAuth,
	handleOAuth: mocks.handleOAuth,
}));

vi.mock("./handlers/health", () => ({ handleHealth: () => Response.json({ ok: true }) }));
vi.mock("./handlers/mcp", () => ({ handleMcp: () => new Response("mcp") }));
vi.mock("./handlers/metadata", () => ({
	handleMcpServerCard: () => Response.json({}),
	handleOAuthAuthorizationServer: () => Response.json({}),
	handleOAuthProtectedResource: () => Response.json({}),
	handleOpenIdConfiguration: () => Response.json({}),
	handleWellKnownFallback: () => new Response("OK"),
}));
vi.mock("./handlers/openapi", () => ({ handleOpenApi: () => Response.json({}) }));
vi.mock("./handlers/rpc", () => ({ handleRpc: () => Response.json({}) }));
vi.mock("./handlers/uploads", () => ({ handleUpload: () => new Response("upload") }));

describe("createApp route ownership", () => {
	beforeEach(() => {
		mocks.handleAuth.mockReset();
		mocks.handleOAuth.mockReset();
		mocks.handleAuth.mockResolvedValue(Response.json({ route: "auth" }));
		mocks.handleOAuth.mockResolvedValue(Response.json({ route: "oauth" }));
	});

	it("routes /api/auth/oauth to the custom OAuth bridge before the Better Auth catch-all", async () => {
		const { createApp } = await import("./index");
		const response = await createApp().request("http://localhost:3001/api/auth/oauth?client_id=test");

		await expect(response.json()).resolves.toEqual({ route: "oauth" });
		expect(mocks.handleOAuth).toHaveBeenCalledTimes(1);
		expect(mocks.handleAuth).not.toHaveBeenCalled();
	});

	it("keeps other /api/auth/* requests on the Better Auth handler", async () => {
		const { createApp } = await import("./index");
		const response = await createApp().request("http://localhost:3001/api/auth/session");

		await expect(response.json()).resolves.toEqual({ route: "auth" });
		expect(mocks.handleAuth).toHaveBeenCalledTimes(1);
		expect(mocks.handleOAuth).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run failing tests**

```bash
pnpm --filter server test -- src/handlers/auth.test.ts src/index.test.ts
```

Expected: tests fail because the implementation still uses `/auth/oauth`.

- [ ] **Step 4: Update server route order**

In `apps/server/src/index.ts`, register the custom route before Better Auth catch-all:

```ts
app.get("/api/auth/oauth", (c) => handleOAuth(c.req.raw));
app.on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw));
```

Remove:

```ts
app.get("/auth/oauth", (c) => handleOAuth(c.req.raw));
```

- [ ] **Step 5: Update callback preservation**

In `apps/server/src/handlers/auth.ts`, change:

```ts
loginUrl.searchParams.set("callbackURL", `/auth/oauth?${oauthParams.toString()}`);
```

to:

```ts
loginUrl.searchParams.set("callbackURL", `/api/auth/oauth?${oauthParams.toString()}`);
```

- [ ] **Step 6: Update Better Auth OAuth provider pages**

In `packages/auth/src/config.ts`, change:

```ts
oauthProvider({
	loginPage: "/api/auth/oauth",
	consentPage: "/api/auth/oauth",
```

- [ ] **Step 7: Remove old dev proxy**

In `apps/web/vite.config.ts`, remove the `"/auth/oauth"` proxy entry. `/api/auth/oauth` is covered by the existing `"/api"` proxy.

- [ ] **Step 8: Verify and commit**

```bash
pnpm --filter server test -- src/handlers/auth.test.ts src/index.test.ts
pnpm --filter server typecheck
pnpm --filter @reactive-resume/auth typecheck
```

Expected: all pass.

```bash
git add apps/server/src/handlers/auth.test.ts apps/server/src/index.test.ts apps/server/src/index.ts apps/server/src/handlers/auth.ts packages/auth/src/config.ts apps/web/vite.config.ts
git commit -m "fix(auth): move OAuth bridge under api auth routes"
```

---

## Task 4: Make `/schema.json` Static

**Files:**
- Create: `packages/scripts/schema/generate.ts`
- Create: `packages/scripts/schema/generate.test.ts`
- Modify: `packages/scripts/package.json`
- Modify: `apps/web/package.json`
- Create: `apps/web/public/schema.json`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/src/handlers/metadata.ts`

- [ ] **Step 1: Write generator test first**

Create `packages/scripts/schema/generate.test.ts`:

```ts
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateResumeSchemaJson } from "./generate";

describe("generateResumeSchemaJson", () => {
	it("writes identical resume JSON Schema to every target", async () => {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "resume-schema-"));
		const firstTarget = path.join(directory, "schema-a.json");
		const secondTarget = path.join(directory, "nested", "schema-b.json");

		await generateResumeSchemaJson([firstTarget, secondTarget]);

		const first = await fs.readFile(firstTarget, "utf-8");
		const second = await fs.readFile(secondTarget, "utf-8");

		expect(JSON.parse(first)).toEqual(JSON.parse(second));
		expect(JSON.parse(first)).toHaveProperty("properties.basics");
		expect(first.endsWith("\n")).toBe(true);
	});
});
```

- [ ] **Step 2: Add script package entries**

In `packages/scripts/package.json`, add:

```json
"schema:generate": "tsx schema/generate.ts",
"test": "vitest run --passWithNoTests"
```

Add missing dev dependencies:

```json
"@reactive-resume/schema": "workspace:*",
"vitest": "^4.1.6",
"zod": "^4.4.3"
```

- [ ] **Step 3: Run failing generator test**

```bash
pnpm --filter @reactive-resume/scripts test -- schema/generate.test.ts
```

Expected: fails because `generate.ts` does not exist.

- [ ] **Step 4: Implement generator**

Create `packages/scripts/schema/generate.ts`:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import z from "zod";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";

const defaultTargets = [
	new URL("../../schema/schema.json", import.meta.url),
	new URL("../../../apps/web/public/schema.json", import.meta.url),
];

function toPath(target: string | URL) {
	return target instanceof URL ? fileURLToPath(target) : target;
}

export async function generateResumeSchemaJson(targets: Array<string | URL> = defaultTargets) {
	const schema = z.toJSONSchema(resumeDataSchema);
	const contents = `${JSON.stringify(schema, null, "\t")}\n`;

	await Promise.all(
		targets.map(async (target) => {
			const targetPath = toPath(target);
			await fs.mkdir(path.dirname(targetPath), { recursive: true });
			await fs.writeFile(targetPath, contents);
		}),
	);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	await generateResumeSchemaJson();
}
```

- [ ] **Step 5: Wire generation into web build**

In `apps/web/package.json`, add:

```json
"prebuild": "pnpm --filter @reactive-resume/scripts schema:generate"
```

Keep:

```json
"build": "rm -rf dist && vite build"
```

- [ ] **Step 6: Remove backend runtime schema route**

In `apps/server/src/index.ts`, remove the `handleSchemaJson` import and:

```ts
app.get("/schema.json", () => handleSchemaJson());
```

In `apps/server/src/handlers/metadata.ts`, remove:

```ts
import z from "zod";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
```

and delete `handleSchemaJson()`.

- [ ] **Step 7: Remove web dev proxy for schema**

In `apps/web/vite.config.ts`, remove the `"/schema.json"` proxy entry.

- [ ] **Step 8: Generate and verify**

```bash
pnpm --filter @reactive-resume/scripts schema:generate
pnpm --filter @reactive-resume/scripts test -- schema/generate.test.ts
pnpm --filter @reactive-resume/scripts typecheck
pnpm --filter server typecheck
pnpm --filter web build
test -f apps/web/dist/schema.json
cmp packages/schema/schema.json apps/web/public/schema.json
```

Expected: all commands pass.

- [ ] **Step 9: Commit**

```bash
git add packages/scripts/schema packages/scripts/package.json apps/web/package.json apps/web/public/schema.json apps/web/vite.config.ts apps/server/src/index.ts apps/server/src/handlers/metadata.ts packages/schema/schema.json
git commit -m "feat(web): serve resume schema as static asset"
```

---

## Task 5: Split Server App Composition Into Backend-Only And Monolith

**Files:**
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/app.test.ts`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json`

- [ ] **Step 1: Add tests for deployment mode behavior**

Create `apps/server/src/app.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("./handlers/auth", () => ({
	handleAuth: () => Response.json({ route: "auth" }),
	handleOAuth: () => Response.json({ route: "oauth" }),
}));
vi.mock("./handlers/health", () => ({ handleHealth: () => Response.json({ ok: true }) }));
vi.mock("./handlers/mcp", () => ({ handleMcp: () => new Response("mcp") }));
vi.mock("./handlers/metadata", () => ({
	handleMcpServerCard: () => Response.json({}),
	handleOAuthAuthorizationServer: () => Response.json({}),
	handleOAuthProtectedResource: () => Response.json({}),
	handleOpenIdConfiguration: () => Response.json({}),
	handleWellKnownFallback: () => new Response("OK"),
}));
vi.mock("./handlers/openapi", () => ({ handleOpenApi: () => Response.json({}) }));
vi.mock("./handlers/rpc", () => ({ handleRpc: () => Response.json({}) }));
vi.mock("./handlers/uploads", () => ({ handleUpload: () => new Response("upload") }));

describe("server app deployment modes", () => {
	it("returns 404 for frontend routes in backend-only mode", async () => {
		const { createBackendApp } = await import("./app");
		const response = await createBackendApp().request("http://localhost:3001/dashboard");

		expect(response.status).toBe(404);
	});

	it("keeps backend routes available in backend-only mode", async () => {
		const { createBackendApp } = await import("./app");
		const response = await createBackendApp().request("http://localhost:3001/api/auth/oauth");

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({ route: "oauth" });
	});
});
```

- [ ] **Step 2: Run failing tests**

```bash
pnpm --filter server test -- src/app.test.ts
```

Expected: fails because `app.ts` does not exist.

- [ ] **Step 3: Extract backend app composition**

Create `apps/server/src/app.ts`:

```ts
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { handleAuth, handleOAuth } from "./handlers/auth";
import { handleHealth } from "./handlers/health";
import { handleMcp } from "./handlers/mcp";
import {
	handleMcpServerCard,
	handleOAuthAuthorizationServer,
	handleOAuthProtectedResource,
	handleOpenIdConfiguration,
	handleWellKnownFallback,
} from "./handlers/metadata";
import { handleOpenApi } from "./handlers/openapi";
import { handleRpc } from "./handlers/rpc";
import { handleUpload } from "./handlers/uploads";

const staticRoot = fileURLToPath(new URL("../../web/dist", import.meta.url));
const indexHtmlPath = fileURLToPath(new URL("../../web/dist/index.html", import.meta.url));

function registerBackendRoutes(app: Hono) {
	app.all("/api/rpc", (c) => handleRpc(c.req.raw));
	app.all("/api/rpc/*", (c) => handleRpc(c.req.raw));
	app.all("/api/openapi", (c) => handleOpenApi(c.req.raw));
	app.all("/api/openapi/*", (c) => handleOpenApi(c.req.raw));
	app.get("/api/auth/oauth", (c) => handleOAuth(c.req.raw));
	app.on(["GET", "POST"], "/api/auth/*", (c) => handleAuth(c.req.raw));
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
	app.get("/.well-known/*", () => handleWellKnownFallback());
	app.on(["HEAD"], "/.well-known/*", () => handleWellKnownFallback());
}

export function createBackendApp() {
	const app = new Hono();
	registerBackendRoutes(app);
	app.all("/*", () => new Response("Not Found", { status: 404 }));
	return app;
}

export function createMonolithApp() {
	const app = new Hono();
	registerBackendRoutes(app);

	app.use("/*", serveStatic({ root: staticRoot, precompressed: true }));
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
```

- [ ] **Step 4: Make index choose mode**

In `apps/server/src/index.ts`, replace inline app creation with:

```ts
import { pathToFileURL } from "node:url";
import { serve } from "@hono/node-server";
import { env } from "@reactive-resume/env/server";
import { createBackendApp, createMonolithApp } from "./app";
import { runStartupChecks } from "./lib/startup";

export function createApp() {
	return process.env.SERVER_MODE === "backend-only" ? createBackendApp() : createMonolithApp();
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
```

- [ ] **Step 5: Verify**

```bash
pnpm --filter server test -- src/app.test.ts src/index.test.ts
pnpm --filter server typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/app.ts apps/server/src/app.test.ts apps/server/src/index.ts apps/server/package.json
git commit -m "feat(server): split backend and monolith app modes"
```

---

## Task 6: Preserve Docker Monolith Contract

**Files:**
- Modify: `Dockerfile`
- Modify: `compose.yml`
- Modify: `compose.dev.yml` only if needed
- Modify: `docs/deployment/architecture.mdx`

- [ ] **Step 1: Make Docker default explicit**

In `Dockerfile`, add:

```dockerfile
ENV NODE_ENV="production" \
    SERVER_MODE="monolith" \
    PORT=3000 \
    LOCAL_STORAGE_PATH=/app/data
```

- [ ] **Step 2: Document backend-only override**

In `docs/deployment/architecture.mdx`, add:

```mdx
## Server Mode

`SERVER_MODE=monolith` is the default Docker mode.

`SERVER_MODE=backend-only` disables static serving and SPA fallback. Use this behind an external static host or edge frontend.
```

- [ ] **Step 3: Verify Docker build path at least compiles**

Run:

```bash
pnpm build
```

Expected: build passes. If full repo build is too noisy due unrelated dirty work, run:

```bash
pnpm --filter web build
pnpm --filter server build
```

Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docs/deployment/architecture.mdx
git commit -m "chore(docker): keep monolith server mode as default"
```

---

## Task 7: Final Verification And Stale Reference Search

**Files:** no new files.

- [ ] **Step 1: Run focused tests**

```bash
pnpm --filter @reactive-resume/server test
pnpm --filter server test -- src/handlers/auth.test.ts src/index.test.ts src/app.test.ts
pnpm --filter @reactive-resume/scripts test -- schema/generate.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run focused typechecks**

```bash
pnpm --filter @reactive-resume/server typecheck
pnpm --filter server typecheck
pnpm --filter @reactive-resume/scripts typecheck
pnpm --filter @reactive-resume/auth typecheck
pnpm --filter web typecheck
```

Expected: all pass.

- [ ] **Step 3: Verify static schema build**

```bash
pnpm --filter @reactive-resume/scripts schema:generate
pnpm --filter web build
test -f apps/web/dist/schema.json
cmp packages/schema/schema.json apps/web/public/schema.json
```

Expected: all pass.

- [ ] **Step 4: Search stale route references**

```bash
rg '"/auth/oauth"|/auth/oauth|handleSchemaJson|app\\.get\\("/schema\\.json"|SERVER_MODE|backend-only|monolith' apps packages docs Dockerfile AGENTS.md
```

Expected:
- No runtime `/auth/oauth` references remain.
- No `handleSchemaJson` references remain.
- `SERVER_MODE`, `backend-only`, and `monolith` appear only in app composition, Docker, and docs.

- [ ] **Step 5: Run non-mutating formatting/lint check on touched files**

Use the repo's Biome config without writing:

```bash
pnpm exec biome check apps/server/src apps/web/vite.config.ts packages/auth/src/config.ts packages/scripts packages/server docs/deployment AGENTS.md Dockerfile
```

Expected: no errors. If formatting errors appear, run Biome write only on touched source/doc files, then rerun this non-mutating check.

---

## Self-Review

- Spec coverage:
  - Preserve single Docker image: Tasks 1 and 6.
  - Enable edge/S3/static frontend plus Node backend: Tasks 1, 2, 5, and 6.
  - Keep backend Node-first: Tasks 5 and 6.
  - Return 404 from backend for unknown split-mode routes: Task 5.
  - Move `/auth/oauth` to `/api/auth/oauth`: Task 3.
  - Make `/schema.json` static: Task 4.
  - Keep `/.well-known/*` backend-owned: Tasks 1 and 5.
- Placeholder scan:
  - No TBD/TODO/fill-in steps remain.
- Type consistency:
  - Route ownership terms are consistently `backend`, `static`, and `spa`.
  - Server modes are consistently `monolith` and `backend-only`.
  - The OAuth bridge route is consistently `/api/auth/oauth`.
  - Static schema targets are consistently `packages/schema/schema.json` and `apps/web/public/schema.json`.
