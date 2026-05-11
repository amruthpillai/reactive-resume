<!-- refreshed: 2026-05-11 -->
# Architecture

**Analysis Date:** 2026-05-11

## System Overview

Reactive Resume is a single full-stack web application running as one Node.js process on port 3000. The web app is a TanStack Start application (Vite + React 19 + Nitro server) packaged in a pnpm/Turborepo monorepo. All API surface area, server-side rendering, file uploads, OAuth, OpenAPI, MCP, and PWA assets are served from the same process. Internal packages are consumed as TypeScript source through `package.json` `exports` maps that point directly at `src` files; there is no per-package `dist` output to depend on.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                              Browser (React 19)                            │
│  TanStack Router  ·  TanStack Query  ·  Zustand stores  ·  React PDF view  │
│  `apps/web/src/router.tsx`  ·  `apps/web/src/routes/__root.tsx`            │
└──────────┬─────────────────────────────────────────────────────┬───────────┘
           │ HTTP / SSR hydration                                │ /api/rpc (RPCLink)
           ▼                                                     ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                  Nitro server entry (TanStack Start)                       │
│           `apps/web/src/server.ts`  ·  Nitro plugins (`apps/web/plugins/`) │
├──────────────────────────┬─────────────────────────────────────────────────┤
│  File-based routes        │  Route `server.handlers` blocks               │
│  `apps/web/src/routes/*` │  `api/rpc.$.ts` · `api/auth.$.ts` · `api/health.ts`│
│                           │  `api/openapi.$.ts` · `api/uploads/$userId.$.ts`│
│                           │  `mcp/index.ts` · `[.]well-known/*` · `schema.json.ts`│
└──────────┬───────────────┴──────────────────────────────┬─────────────────┘
           │ in-process router client                       │ HTTP handler
           ▼                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                              oRPC routers                                  │
│  `packages/api/src/routers/{ai,auth,flags,resume,statistics,storage}.ts`  │
│  Procedures: `publicProcedure` / `protectedProcedure`                      │
│  Middleware: `packages/api/src/middleware/rate-limit/index.ts`             │
└──────────┬─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                          Services & helpers                                │
│  `packages/api/src/services/{resume,ai,auth,storage,flags,statistics}.ts` │
│  `packages/api/src/helpers/{resume-access,resume-access-policy}.ts`        │
│  `packages/api/src/services/resume-events.ts` (Postgres LISTEN/NOTIFY)     │
│  `packages/auth/src/config.ts` (Better Auth)                               │
└──────────┬──────────────────────────────────────┬──────────────────────────┘
           │ Drizzle ORM                          │ S3 / local FS
           ▼                                      ▼
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│      PostgreSQL (via `pg`)        │   │ Storage (S3 or `<workspace>/data`)│
│  `packages/db/src/client.ts`     │   │  `packages/api/src/services/storage.ts`│
│  schema: `packages/db/src/schema/*`│   │  served by `routes/uploads/$userId.$.tsx`│
│  migrations: `migrations/`        │   └──────────────────────────────────┘
└──────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Web app shell | TanStack Start app, route tree, SSR/CSR boundary, PWA, builder UI | `apps/web/src/router.tsx`, `apps/web/src/routes/__root.tsx` |
| Server entry | Nitro fetch handler wrapping `react-start/server-entry` | `apps/web/src/server.ts` |
| Migration plugin | Walks up to repo root, runs Drizzle migrations on boot | `apps/web/plugins/1.migrate.ts` |
| Storage plugin | Validates `<workspace>/data` writability when S3 is unused | `apps/web/plugins/2.storage.ts` |
| oRPC router root | Aggregates all sub-routers exposed at `/api/rpc` and OpenAPI | `packages/api/src/routers/index.ts` |
| oRPC context | Header-based auth resolution, `publicProcedure`/`protectedProcedure` | `packages/api/src/context.ts` |
| Resume service | CRUD, patch (RFC 6902), password, lock, statistics, analysis, events | `packages/api/src/services/resume.ts` |
| Storage service | S3 + local FS abstraction, image processing via `sharp` | `packages/api/src/services/storage.ts` |
| Resume access policy | Owner/viewer/redaction rules for `getBySlug` and statistics | `packages/api/src/helpers/resume-access-policy.ts` |
| Resume events | Postgres `LISTEN/NOTIFY` channel for live updates | `packages/api/src/services/resume-events.ts` |
| Auth | Better Auth config, OAuth provider, passkey, 2FA, API keys, JWKS | `packages/auth/src/config.ts` |
| Database | Drizzle client singleton, schema, generated migrations | `packages/db/src/client.ts`, `packages/db/src/schema/*.ts`, `migrations/` |
| Schema | Zod resume/page/template models shared across web + API + PDF + MCP | `packages/schema/src/resume/data.ts`, `packages/schema/src/templates.ts` |
| PDF rendering | React PDF `Document`, font registration, 14 template implementations | `packages/pdf/src/document.tsx`, `packages/pdf/src/templates/index.ts`, `packages/pdf/src/hooks/use-register-fonts.ts` |
| Shared UI | Base UI / shadcn-style component library and hooks | `packages/ui/src/components/*.tsx`, `packages/ui/src/hooks/*.tsx` |
| MCP server | Model Context Protocol server backed by oRPC routers | `apps/web/src/routes/mcp/index.ts`, `apps/web/src/routes/mcp/-helpers/*` |

## Pattern Overview

**Overall:** Modular monolith. One deployable web app + a constellation of source-only TypeScript packages communicating through typed `package.json` `exports`. Browser ↔ server communication uses **oRPC** (typed RPC with REST/OpenAPI generation) instead of REST/tRPC. SSR and client share the same router/queryClient via TanStack Start.

**Key Characteristics:**
- Source-consumed workspace packages (no per-package `dist` build) keep types end-to-end.
- The oRPC router is mounted twice: as a Fetch handler at `/api/rpc` and as an in-process `createRouterClient` for SSR/server functions, with identical types on both paths.
- Browser-only code (React PDF preview, PDF.js, canvas) is isolated behind explicit `.browser.tsx` files and `ssr: false` / `ssr: "data-only"` route opts to keep SSR bundles small and safe.
- Postgres is both the data store and the event bus (`pg_notify` channel `resume_updated` for live builder sync).
- Shared concerns (auth, theme, locale, feature flags, oRPC client, query client) are loaded once and passed through TanStack Router `context` rather than fetched per-route.

## Layers

**Routes (`apps/web/src/routes/`):**
- Purpose: File-based TanStack Router routes; some are pure UI, others embed `server.handlers` blocks that act as HTTP endpoints.
- Location: `apps/web/src/routes/`
- Contains: Page components, route loaders, server-only API handlers, layout wrappers.
- Depends on: `packages/api/routers` (mounted at `/api/rpc`), `packages/auth/config` (mounted at `/api/auth`), `packages/db/client`, `packages/api/services/*`.
- Used by: TanStack Router (route tree is regenerated into `apps/web/src/routeTree.gen.ts`).

**oRPC API layer (`packages/api/src/routers/`):**
- Purpose: Public typed contract for the browser, in-process callers, and OpenAPI/MCP consumers.
- Location: `packages/api/src/routers/{ai,auth,flags,resume,statistics,storage}.ts`, aggregated in `packages/api/src/routers/index.ts`.
- Contains: Procedure definitions, Zod input/output schemas, REST metadata, rate-limit middleware bindings.
- Depends on: `packages/api/src/context.ts`, `packages/api/src/dto/*`, `packages/api/src/services/*`.
- Used by: `apps/web/src/routes/api/rpc.$.ts` (RPCHandler), `apps/web/src/routes/api/openapi.$.ts` (OpenAPIHandler), `apps/web/src/libs/orpc/client.ts` (isomorphic client), MCP tools in `apps/web/src/routes/mcp/-helpers/tools.ts`.

**Services / business logic (`packages/api/src/services/`):**
- Purpose: All cross-cutting business rules — resume CRUD, statistics, AI orchestration, storage, feature flags, auth helpers, event publishing.
- Location: `packages/api/src/services/*.ts`
- Contains: Side-effecting functions with explicit `userId`-style inputs. No request/response coupling.
- Depends on: `packages/db/client`, `packages/db/schema`, `packages/auth/config`, `packages/schema/resume/*`, `packages/utils/*`, `packages/email/transport`, AI SDKs.
- Used by: Routers, MCP helpers, the `/api/health` route.

**Persistence (`packages/db/`):**
- Purpose: Drizzle ORM client + schema definitions; the only place SQL is written.
- Location: `packages/db/src/client.ts`, `packages/db/src/schema/{auth,resume,index}.ts`, `packages/db/src/relations.ts`.
- Contains: Postgres `Pool` singleton (stored on `globalThis.__pool` to survive HMR), `drizzle()` client, table definitions, relations.
- Depends on: `pg`, `drizzle-orm`, `packages/env/server`.
- Migrations: Generated by `drizzle-kit` into the repo-root `migrations/` directory (see `packages/db/drizzle.config.ts`) and applied at startup by `apps/web/plugins/1.migrate.ts`.

**Auth (`packages/auth/`):**
- Purpose: Better Auth instance with email/password, OAuth (Google/GitHub/LinkedIn + generic), passkey, 2FA, API keys, JWKS, and a JWT-issuing OAuth provider for MCP clients.
- Location: `packages/auth/src/config.ts`, `packages/auth/src/functions.ts`, `packages/auth/src/types.ts`.
- Mounted at: `apps/web/src/routes/api/auth.$.ts` (delegates `request → auth.handler(request)` after sanitizing OAuth params).
- Verifies tokens for MCP at `apps/web/src/routes/mcp/index.ts` via `verifyOAuthToken`.

**PDF rendering (`packages/pdf/`):**
- Purpose: React PDF document and 14 visual templates (named after Pokémon).
- Location: `packages/pdf/src/document.tsx` mounts `getTemplatePage(template)`; templates live under `packages/pdf/src/templates/<name>/`.
- Shared template primitives: `packages/pdf/src/templates/shared/{filtering,rich-text,sections,primitives,picture,page-size,columns}.ts(x)`.
- Fonts: `packages/pdf/src/hooks/use-register-fonts.ts` owns React PDF font registration, standard PDF font handling, CJK fallback stacks, and global hyphenation.
- Consumed by: Web builder preview (`apps/web/src/components/resume/preview*.tsx`, `pdf-canvas.tsx`), public resume page (`apps/web/src/routes/$username/$slug.tsx`), and the OpenAPI `/resumes/{id}/download` procedure (`apps/web/src/routes/api/-helpers/resume-pdf.ts`).

**Shared schemas (`packages/schema/`):**
- Purpose: Zod source of truth for resume data, templates, page settings, and AI analysis.
- Location: `packages/schema/src/resume/{data,default,sample,analysis}.ts`, `packages/schema/src/templates.ts`, `packages/schema/src/page.ts`, `packages/schema/src/icons.ts`.
- Used by: API DTOs (`packages/api/src/dto/resume.ts`), DB column typing (`packages/db/src/schema/resume.ts`), import package, PDF rendering, web forms, MCP tool descriptions, and the public JSON schema at `/schema.json`.

**Shared UI (`packages/ui/`):**
- Purpose: Headless/styled component library (Base UI + shadcn-style) used by `apps/web`.
- Location: `packages/ui/src/components/*.tsx`, `packages/ui/src/hooks/*.tsx`.
- Examples: `dialog`, `dropdown-menu`, `command`, `resizable`, `sonner`, `tooltip`, `form`, `direction`.
- Styles: `packages/ui/src/styles/globals.css` (Tailwind v4 entry).

**Support packages:**
- `packages/utils` — small focused helpers (`color`, `date`, `field`, `file`, `html`, `level`, `locale`, `network-icons`, `rate-limit`, `sanitize`, `string`, `style`, `url`, plus Node-only `monorepo.node`, `url-security.node`, and `resume/{docx,patch}`).
- `packages/env` — `@t3-oss/env-core` server schema; `dotenv` loads the repo-root `.env` (`packages/env/src/server.ts`).
- `packages/email` — `nodemailer` transport + `react-email` templates (`packages/email/src/transport.ts`, `packages/email/src/templates/*.tsx`).
- `packages/import` — converters for JSON Resume, Reactive Resume v3/v4 JSON (`packages/import/src/*.tsx`).
- `packages/ai` — Zustand store, AI prompts (`packages/ai/src/prompts/*.md`), patch-resume tool, sanitize/extraction helpers consumed by the AI router.
- `packages/fonts` — generated Google Fonts metadata (`packages/fonts/src/webfontlist.json`, `packages/fonts/src/index.ts`).
- `packages/scripts` — repo-level scripts (`packages/scripts/database/reset.ts`, `packages/scripts/fonts/generate.ts`).
- `packages/config` — shared TypeScript/Vitest base configs (`packages/config/tsconfig.base.json`, `packages/config/vitest.config.ts`).
- `packages/runtime-externals` — declares `bcrypt`, `sharp`, `@aws-sdk/client-s3` so they remain runtime-only (externalized in `apps/web/vite.config.ts`).

## Data Flow

### Primary Request Path (browser RPC call)

1. Browser route uses `orpc.resume.getById.queryOptions(...)` from `apps/web/src/libs/orpc/client.ts:84` to fetch data.
2. The isomorphic oRPC client (`apps/web/src/libs/orpc/client.ts:28-47`) creates an `RPCLink` pointing at `${window.location.origin}/api/rpc` with `credentials: "include"` and a `BatchLinkPlugin`.
3. Request hits the file route `apps/web/src/routes/api/rpc.$.ts`, where `RPCHandler` (line 9) dispatches with `BatchHandlerPlugin`, `RequestHeadersPlugin`, and `StrictGetMethodPlugin`.
4. `publicProcedure` (`packages/api/src/context.ts:79`) resolves the user from headers (`x-api-key` → bearer JWT via JWKS → Better Auth session cookie).
5. `protectedProcedure` (`packages/api/src/context.ts:90`) rejects unauthenticated callers with `ORPCError("UNAUTHORIZED")`.
6. Router handler in `packages/api/src/routers/resume.ts` calls into `packages/api/src/services/resume.ts`, which queries Drizzle (`packages/db/src/client.ts:32`).
7. Response is serialized back through oRPC and consumed by TanStack Query / the route component.

### SSR / Server-Side Path

1. During SSR, `apps/web/src/libs/orpc/client.ts:13-27` short-circuits the HTTP path via `createRouterClient(router, { context: async () => ({ locale, reqHeaders }) })`.
2. The same `publicProcedure`/`protectedProcedure` middleware runs in-process — no socket hop — but still resolves auth from the original request headers via `getRequestHeaders()` from `@tanstack/react-start/server`.
3. Route loaders (e.g. `apps/web/src/routes/builder/$resumeId/route.tsx:39-44`) populate the query cache via `context.queryClient.ensureQueryData(orpc.resume.getById.queryOptions(...))`.

### Resume Live-Update Flow

1. `subscribe` procedure in `packages/api/src/routers/resume.ts:76` returns an async generator.
2. On any mutation, `packages/api/src/services/resume-events.ts:37` calls `pg_notify('resume_updated', JSON.stringify(event))`.
3. Subscribing clients receive `resume.updated` SSE-style events via oRPC streaming (`apps/web/src/libs/orpc/client.ts:51-82`, `streamClient`).
4. The builder route consumes them through `useResumeUpdateSubscription` (`apps/web/src/components/resume/builder-resume-draft.ts`).

### PDF Download Path

1. Web client requests `GET /api/openapi/resumes/{id}/download` (oRPC OpenAPI handler at `apps/web/src/routes/api/openapi.$.ts`).
2. `downloadResumePdfProcedure` in `apps/web/src/routes/api/-helpers/resume-pdf.ts` loads the resume, renders `ResumeDocument` from `packages/pdf/src/document.tsx`, persists to storage via `getStorageService()`, and returns/streams the PDF.

### Public Resume Path

1. `apps/web/src/routes/$username/$slug.tsx` uses `ssr: "data-only"` — server fetches `resume.getBySlug` but renders the React PDF preview only on the client.
2. `packages/api/src/helpers/resume-access-policy.ts` enforces visibility, redacts non-public fields, and throws `NEED_PASSWORD` for password-protected resumes (the route then redirects to `/auth/resume-password`).

**State Management:**
- Server cache: TanStack Query (`apps/web/src/libs/query/client.ts`) wrapped by oRPC's `createTanstackQueryUtils`.
- Local UI state: Zustand stores under `apps/web/src/routes/builder/$resumeId/-store/{section,sidebar}.ts`, `apps/web/src/dialogs/store.ts`, `apps/web/src/components/command-palette/store.ts`, `apps/web/src/components/resume/builder-resume-draft.ts`.
- Router context: `theme`, `locale`, `session`, `flags`, `queryClient`, `orpc` are computed once in `apps/web/src/router.tsx` (and again in the root route `beforeLoad`) and reused by descendants.
- Cookies: builder layout (`BUILDER_LAYOUT_COOKIE_NAME`), theme, and locale are persisted via `getCookie`/`setCookie` server functions.

## Key Abstractions

**oRPC procedures (`os.$context<ORPCContext>()`):**
- Purpose: Typed RPC procedures that double as REST endpoints and MCP tool surfaces.
- Examples: `publicProcedure` and `protectedProcedure` in `packages/api/src/context.ts:79`/`:90`.
- Pattern: `procedure.route({...openapi metadata}).input(zodSchema).use(rateLimitMiddleware).output(zodSchema).handler(async ({ context, input }) => ...)`.

**Drizzle tables:**
- Purpose: Strongly-typed Postgres schema; `.jsonb()` columns are typed against Zod-derived TypeScript (`ResumeData`, `StoredResumeAnalysis`).
- Examples: `packages/db/src/schema/resume.ts` (resume, resumeStatistics, resumeAnalysis), `packages/db/src/schema/auth.ts` (Better Auth tables).
- Pattern: `pg.pgTable("name", { ... }, (t) => [pg.index().on(...), pg.unique().on(...)])`.

**Template pages (React PDF):**
- Purpose: One `TemplatePage` component per visual template, mapped by name in `packages/pdf/src/templates/index.ts`.
- Examples: `packages/pdf/src/templates/azurill/AzurillPage.tsx`, `packages/pdf/src/templates/onyx/OnyxPage.tsx`.
- Pattern: `(props: { page: LayoutPage; pageIndex: number }) => JSX`, consuming `RenderProvider` from `packages/pdf/src/context.tsx`.

**Base UI components:**
- Purpose: Headless primitives styled with Tailwind v4 and exported as composable parts.
- Examples: `packages/ui/src/components/dialog.tsx`, `packages/ui/src/components/command.tsx`, `packages/ui/src/components/resizable.tsx`.
- Imported via deep paths: `import { Dialog } from "@reactive-resume/ui/components/dialog";`.

**TanStack Router file routes:**
- Purpose: Page components, loaders, and optional `server.handlers` blocks per file.
- Examples: `apps/web/src/routes/builder/$resumeId/route.tsx`, `apps/web/src/routes/api/rpc.$.ts`.
- Pattern: `export const Route = createFileRoute("/path")({ component, loader, beforeLoad, server: { handlers: { GET, POST } }, ssr });`.

## Entry Points

**Vite + Nitro build entry:**
- Location: `apps/web/vite.config.ts`
- Triggers: `pnpm dev`, `pnpm build`. Wires TanStack Start, Tailwind v4, Lingui (i18n), Nitro plugins, and the Vite PWA plugin.
- Externals: `bcrypt`, `sharp`, `@aws-sdk/client-s3` (declared in `packages/runtime-externals`).

**Server fetch entry:**
- Location: `apps/web/src/server.ts`
- Responsibilities: Wraps `@tanstack/react-start/server-entry` and substitutes `srvx`'s `FastResponse` as the global `Response`.

**Nitro startup plugins:**
- `apps/web/plugins/1.migrate.ts` — resolves the repo-root `migrations/` folder, opens its own `pg.Pool`, runs Drizzle migrations on boot, then closes the pool.
- `apps/web/plugins/2.storage.ts` — when S3 env vars are absent, ensures the local storage directory is writable before serving requests.

**Router entry:**
- Location: `apps/web/src/router.tsx`
- Responsibilities: Builds `queryClient`, loads `theme`/`locale`/`session`/`flags` in parallel, creates the TanStack Router with router context, registers SSR query integration.

**Root route:**
- Location: `apps/web/src/routes/__root.tsx`
- Responsibilities: HTML shell, providers (`I18nProvider`, `ThemeProvider`, `HotkeysProvider`, `DirectionProvider`, `TooltipProvider`, `ConfirmDialogProvider`, `PromptDialogProvider`), PWA head/scripts, `DialogManager`, `CommandPalette`, `Toaster`.

**HTTP endpoints (route `server.handlers`):**
- `apps/web/src/routes/api/rpc.$.ts` — `/api/rpc/*` oRPC handler (browser RPC).
- `apps/web/src/routes/api/auth.$.ts` — `/api/auth/*` Better Auth handler (with OAuth payload sanitization).
- `apps/web/src/routes/api/health.ts` — `/api/health` JSON probe (db + storage with timeouts).
- `apps/web/src/routes/api/openapi.$.ts` — `/api/openapi/*` OpenAPI handler + spec.
- `apps/web/src/routes/api/uploads/$userId.$.ts` and `apps/web/src/routes/uploads/$userId.$.tsx` — signed/etagged static file serving from storage.
- `apps/web/src/routes/mcp/index.ts` — `/mcp` Model Context Protocol server (OAuth-protected).
- `apps/web/src/routes/[.]well-known/*` — `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`, `/.well-known/openid-configuration`, `/.well-known/mcp` discovery documents.
- `apps/web/src/routes/schema[.]json.ts` — `/schema.json` public JSON Schema for `ResumeData`.

**Builder + public resume entry points:**
- `apps/web/src/routes/builder/$resumeId/route.tsx` — authenticated builder shell (header + resizable left/right sidebars + artboard outlet + assistant).
- `apps/web/src/routes/builder/$resumeId/index.tsx` — `ssr: false`; lazy-loaded `PreviewPage` running React PDF/canvas only in the browser.
- `apps/web/src/routes/$username/$slug.tsx` — `ssr: "data-only"`; public/shared resume view (with password gating via `NEED_PASSWORD` ORPCError).

## Architectural Constraints

- **Single Node process:** Everything (web, oRPC, auth, MCP, OpenAPI, file serving) runs in one Node 24 process on port 3000. No separate API service.
- **Source-only workspace packages:** `package.json` `exports` point at `src/*.ts(x)`; do not assume `dist` output exists. The Vite build externalizes `bcrypt`, `sharp`, `@aws-sdk/client-s3` (`apps/web/vite.config.ts:55`).
- **Globals on `globalThis` for DB pool:** `packages/db/src/client.ts:8-11` caches the `pg.Pool` and Drizzle client on `globalThis.__pool` / `globalThis.__drizzle` to survive HMR reloads.
- **Browser-only PDF rendering:** PDF.js, `@react-pdf/renderer` canvas, and the builder preview must stay off the SSR path. Use `.browser.tsx` suffix files and `ssr: false` (builder preview) or `ssr: "data-only"` (public resume).
- **Generated route tree:** `apps/web/src/routeTree.gen.ts` is regenerated by TanStack Router tooling; never edit by hand.
- **Migrations folder location:** `drizzle-kit` writes to `../../migrations` from `packages/db/drizzle.config.ts`, so all migration directories live at the repo root, not inside the package.
- **DATABASE_URL not auto-loaded for drizzle-kit:** `pnpm db:migrate` / `pnpm db:generate` require `DATABASE_URL` exported in the shell; only the runtime Node code loads `.env` via `packages/env/src/server.ts`.
- **Rate limiting is production-only:** `packages/api/src/middleware/rate-limit/index.ts:5` and the Better Auth config gate rate limits on `process.env.NODE_ENV === "production"`.
- **OAuth audience binding:** `verifyOAuthToken` (`packages/auth/src/config.ts:40`) only accepts JWTs whose `aud` matches `${APP_URL}` (with/without trailing slash) or `${APP_URL}/mcp`.
- **Postgres LISTEN/NOTIFY coupling:** Live resume updates depend on a single shared `pg.Pool` (`packages/db/src/client.ts:13`); scaling beyond one process requires replacing `pg_notify` with a broker.

## Anti-Patterns

### Ad-hoc fetching of router context

**What happens:** Components separately calling `getSession()`, `getTheme()`, or `getLocale()` instead of reading them from TanStack Router context.
**Why it's wrong:** The root route's `beforeLoad` already loads these in parallel (`apps/web/src/routes/__root.tsx:82-93`) and exposes them via `Route.useRouteContext()`; duplicating the calls causes extra round-trips during SSR and triggers locale reloads.
**Do this instead:** Use `Route.useRouteContext()` or read from a parent route loader, as `apps/web/src/routes/__root.tsx:101` does for theme/locale.

### Direct DB or storage imports in client code

**What happens:** Importing `@reactive-resume/db/client` or `@reactive-resume/api/services/storage` from a non-route component.
**Why it's wrong:** Pulls `pg`, `sharp`, `bcrypt`, `@aws-sdk/client-s3` into the client bundle (which Vite externalizes — the build will fail or break at runtime).
**Do this instead:** Call the corresponding oRPC procedure from `packages/api/src/routers/*`. Server-only imports belong inside route `server.handlers` blocks or `.server.tsx` files like `apps/web/src/libs/resume/pdf-document.server.tsx`.

### PDF/canvas code in shared modules

**What happens:** Importing `@react-pdf/renderer` or PDF.js from a file that participates in SSR.
**Why it's wrong:** These libraries crash under Node SSR (canvas/DOM dependencies).
**Do this instead:** Keep browser code in `*.browser.tsx` / `pdf-canvas.tsx` and gate with `ssr: false` (e.g. `apps/web/src/routes/builder/$resumeId/index.tsx:6`) or `ssr: "data-only"` (e.g. `apps/web/src/routes/$username/$slug.tsx:40`).

### Bypassing the resume access policy

**What happens:** Reading resume rows directly from Drizzle in a public procedure without applying redaction.
**Why it's wrong:** Leaks owner-only fields (password hash, private flags, statistics) and breaks the password-gate flow that depends on `NEED_PASSWORD` errors.
**Do this instead:** Route through `packages/api/src/helpers/resume-access-policy.ts` (`assertCanView`, `redactResumeForViewer`, `shouldCountForStatistics`) as `packages/api/src/services/resume.ts` does.

### Hand-editing generated files

**What happens:** Modifying `apps/web/src/routeTree.gen.ts` or migration SQL after Drizzle writes it.
**Why it's wrong:** Edits are overwritten on the next `tanstack-router` regen or migration; data drift between snapshots and SQL breaks future migrations.
**Do this instead:** Add a route file under `apps/web/src/routes/`, or change the Drizzle schema in `packages/db/src/schema/*.ts` and run `pnpm db:generate`.

## Error Handling

**Strategy:** Typed errors via `ORPCError` codes; HTTP responses for low-level handlers; route-level `defaultErrorComponent` and `onError` for UI fallbacks.

**Patterns:**
- Procedures throw `ORPCError("UNAUTHORIZED"|"NOT_FOUND"|"NEED_PASSWORD"|...)` or use `.errors({ ... })` to declare typed application errors (e.g. `RESUME_SLUG_ALREADY_EXISTS`, `RESUME_VERSION_CONFLICT` in `packages/api/src/routers/resume.ts`).
- The OAuth bearer / API key / session resolvers in `packages/api/src/context.ts:14-55` swallow verification errors and log via `console.warn` so unauthenticated requests fall through to the next strategy.
- `apps/web/src/routes/api/rpc.$.ts` and `apps/web/src/routes/api/openapi.$.ts` install `onError` interceptors that log every server error with a tag (`[oRPC Server]`, `[OpenAPI]`).
- Route-level `onError` (e.g. `apps/web/src/routes/$username/$slug.tsx:24`) translates `NEED_PASSWORD` into a redirect.
- Top-level UI fallbacks: `apps/web/src/components/layout/error-screen.tsx`, `loading-screen.tsx`, `not-found-screen.tsx` (wired in `apps/web/src/router.tsx:30-32`).
- Healthcheck uses a 1.5s timeout helper (`apps/web/src/routes/api/health.ts:22-34`) so a stuck dependency cannot stall the probe.

## Cross-Cutting Concerns

**Logging:** `console.info`/`console.warn`/`console.error` with bracketed prefixes (e.g. `[oRPC Server]`, `[Healthcheck]`, `[oRPC client]`). No external log shipping is wired.

**Validation:** Zod 4 everywhere — Drizzle column types (`packages/db/src/schema/resume.ts`), oRPC input/output schemas, AI tool inputs, environment variables (`packages/env/src/server.ts`), and the public `/schema.json` route.

**Authentication:** Better Auth in `packages/auth/src/config.ts` (Drizzle adapter, email/password + OAuth + passkey + 2FA + admin + API keys + JWT + generic OAuth + dynamic client registration + custom `oauthProvider` for MCP). The unified resolver in `packages/api/src/context.ts:64` is the only place that decides which credential wins.

**Internationalization:** Lingui — `apps/web/lingui.config.ts`, `apps/web/locales/*.po`, `apps/web/src/libs/locale.ts`, RTL toggling in `__root.tsx`.

**Theming:** `apps/web/src/libs/theme.ts` (cookie-backed), `apps/web/src/components/theme/provider.tsx` (`next-themes`).

**Rate limiting:** `@orpc/experimental-ratelimit` with an in-memory ratelimiter from `packages/api/src/middleware/rate-limit/index.ts`. Trusted IP headers come from `packages/utils/src/rate-limit.ts`.

**Feature flags:** Server-resolved at boot (`packages/api/src/routers/flags.ts` and `packages/api/src/services/flags.ts`), then carried in router context via `apps/web/src/router.tsx:20`.

---

*Architecture analysis: 2026-05-11*
