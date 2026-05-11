# Codebase Structure

**Analysis Date:** 2026-05-11

## Directory Layout

```text
reactive-resume/
├── apps/
│   └── web/                            # Sole deployable application (TanStack Start / Vite / Nitro)
│       ├── plugins/                    # Nitro startup plugins (run on `pnpm dev` / `pnpm start`)
│       ├── public/                     # Static assets (PWA, opengraph, templates, screenshots)
│       ├── locales/                    # Lingui `.po` translation catalogs (~40 locales)
│       ├── src/
│       │   ├── components/             # Reusable web components grouped by feature
│       │   ├── dialogs/                # Global dialog system + dialog implementations
│       │   ├── hooks/                  # App-level React hooks
│       │   ├── libs/                   # Browser/server glue (auth, orpc, query, resume, theme, locale, pwa)
│       │   ├── routes/                 # File-based TanStack Router routes (UI + `server.handlers`)
│       │   ├── router.tsx              # Router factory (builds query client, context, SSR query integration)
│       │   ├── routeTree.gen.ts        # GENERATED — do not hand-edit
│       │   ├── server.ts               # Nitro fetch entry (wraps `react-start/server-entry`)
│       │   └── index.css               # Tailwind v4 entry
│       ├── components.json             # shadcn config
│       ├── lingui.config.ts            # i18n extract config
│       ├── vite.config.ts              # Vite + TanStack Start + Nitro + PWA + Lingui
│       └── vitest.config.ts
├── packages/
│   ├── ai/                             # AI prompts, Zustand store, patch-resume tool
│   ├── api/                            # oRPC routers, services, helpers, DTOs, rate-limit middleware
│   ├── auth/                           # Better Auth config and helpers
│   ├── config/                         # Shared tsconfig + vitest base configs
│   ├── db/                             # Drizzle client + schema (Postgres)
│   ├── email/                          # Nodemailer transport + react-email templates
│   ├── env/                            # `@t3-oss/env-core` server env (auto-loads root `.env`)
│   ├── fonts/                          # Google Fonts metadata
│   ├── import/                         # JSON Resume / Reactive Resume v3/v4 importers
│   ├── pdf/                            # React PDF document, fonts, 14 templates, shared primitives
│   ├── runtime-externals/              # Declares bcrypt, sharp, @aws-sdk/client-s3 as runtime-only
│   ├── schema/                         # Zod schemas (resume data, templates, page, analysis, icons)
│   ├── scripts/                        # Standalone tsx scripts (db reset, font generation)
│   ├── ui/                             # Shared Base UI + shadcn-style components
│   └── utils/                          # Small focused helpers (color, date, html, sanitize, etc.)
├── migrations/                         # Drizzle-generated SQL + snapshots (one folder per migration)
├── docs/                               # Project documentation
├── skills/                             # Internal agent skill definitions
├── data/                               # Local-FS storage root (when S3 is unset) — gitignored runtime data
├── .vite-hooks/                        # Lefthook-managed git hooks (commit-msg, pre-commit)
├── .github/                            # GitHub Actions / issue templates
├── .claude/                            # Project-local Claude/Codex agent assets
├── .codex/
├── .planning/                          # GSD planning + codebase maps (this directory)
├── .vscode/
├── compose.dev.yml                     # Postgres + SeaweedFS for local dev
├── compose.yml                         # Production-shaped compose
├── Dockerfile                          # Node 24 multi-stage build
├── AGENTS.md                           # Canonical agent guide (symlinked from CLAUDE.md)
├── README.md
├── SECURITY.md
├── LICENSE
├── package.json                        # Root scripts (turbo run …) + workspace devDeps
├── pnpm-workspace.yaml                 # `apps/*` + `packages/*`
├── pnpm-lock.yaml
├── turbo.json                          # Pipeline + globalEnv allowlist
├── biome.json                          # Biome (lint + format) config
├── knip.json                           # Dead-code/dep analysis config
├── lefthook.yml                        # Git hooks
├── commitlint.config.cjs
├── crowdin.yml                         # Translation sync config
├── tsconfig.json                       # Root TS solution config
├── vitest.shared.ts / vitest.setup.ts  # Shared vitest config and global setup
├── .ncurc.cjs                          # npm-check-updates ignore list
├── .env.example                        # Documented env vars
└── .gitignore / .dockerignore
```

## Directory Purposes

**`apps/web/`:**
- Purpose: The only deployed app — TanStack Start / React 19 / Vite / Nitro.
- Contains: Routes, components, dialogs, hooks, libs, server entry, build config.
- Key files: `apps/web/vite.config.ts`, `apps/web/src/router.tsx`, `apps/web/src/server.ts`, `apps/web/src/routes/__root.tsx`, `apps/web/plugins/1.migrate.ts`, `apps/web/plugins/2.storage.ts`.

**`apps/web/src/routes/`:**
- Purpose: TanStack Router file-based route tree. Each file is either a UI route, a server-only endpoint (`server.handlers`), or both.
- Notable subtrees:
  - `__root.tsx` — global HTML shell, providers, head/meta, PWA scripts.
  - `_home/` — public marketing layout (`route.tsx`, `index.tsx`, `-sections/{hero,features,faq,testimonials,...}.tsx`).
  - `auth/` — login/register/2FA/password flows and OAuth callback (`oauth.ts`).
  - `dashboard/` — authenticated dashboard (`route.tsx`, `index.tsx`, `resumes/`, `settings/{profile,preferences,api-keys,authentication,integrations,job-search,danger-zone}.tsx`, `-components/{header,sidebar,functions}.{ts,tsx}`).
  - `builder/$resumeId/` — resume builder (`route.tsx` shell, `index.tsx` browser-only preview, `-components/`, `-sidebar/{left,right}/`, `-store/{section,sidebar}.ts`).
  - `$username/$slug.tsx` — public/shared resume route (`ssr: "data-only"`).
  - `api/` — server-only endpoints (`rpc.$.ts`, `auth.$.ts`, `health.ts`, `openapi.$.ts`, `uploads/$userId.$.ts`, `-helpers/resume-pdf.ts`).
  - `mcp/` — Model Context Protocol server (`index.ts`, `-helpers/{tools,resources,prompts,mcp-server-card,mcp-tool-names,tool-annotations}.ts`).
  - `[.]well-known/` — OAuth/OIDC/MCP discovery documents.
  - `uploads/$userId.$.tsx` — etag/security-validated file serving.
  - `templates/$.tsx` — template preview/download.
  - `schema[.]json.ts` — `/schema.json` endpoint.

**`apps/web/src/components/`:**
- Purpose: Reusable, app-scoped components organized by domain.
- Subdirectories:
  - `animation/` — Motion-driven UI (`comet-card`, `count-up`, `spotlight`, `text-mask`).
  - `command-palette/` — Cmd-K UI (`index.tsx`, `store.ts`, `pages/`).
  - `input/` — Custom inputs (`chip-input`, `color-picker`, `github-stars-button`, `icon-picker`, `rich-input`, `url-input`).
  - `layout/` — Error/loading/not-found screens, breakpoint indicator.
  - `level/`, `locale/`, `theme/`, `typography/` — combobox/toggle utilities for those concerns.
  - `resume/` — Builder preview surface (`preview.tsx`, `preview.browser.tsx`, `preview.shared.tsx`, `pdf-canvas.tsx`, `builder-resume-draft.ts`).
  - `ui/` — App-level UI extensions (`combobox.tsx`, `copyright.tsx`).
  - `user/` — User dropdown menu.

**`apps/web/src/libs/`:**
- Purpose: Glue between UI and external systems.
- Contents:
  - `auth/{client.ts,session.ts}` — Better Auth browser client + SSR session getter.
  - `orpc/client.ts` — Isomorphic oRPC client (in-process server + RPCLink browser).
  - `query/client.ts` — TanStack Query client factory.
  - `resume/` — Section, PDF, and ordering helpers (`make-section-item.ts`, `move-item.ts`, `section-actions.ts`, `section-title.ts`, `section-title-locale.ts`, `pdf-document.tsx`, `pdf-document.server.tsx`, `section.tsx`).
  - `theme.ts`, `locale.ts`, `pwa.ts`, `error-message.ts`, `tanstack-form.tsx` — direct app utilities.

**`apps/web/src/dialogs/`:**
- Purpose: Global imperative dialog system.
- Contents: `manager.tsx` (renders open dialogs), `store.ts` (Zustand store), then domain dialogs under `auth/`, `resume/{sections,template,index.tsx,import.tsx}`, `api-key/`.

**`apps/web/src/hooks/`:**
- Purpose: Web-app hooks. (Shared cross-package hooks live in `packages/ui/src/hooks/`.)
- Contents: `use-confirm.tsx`, `use-controlled-state.tsx`, `use-form-blocker.tsx`, `use-mobile.tsx`, `use-prompt.tsx`, `use-sync-form-values.ts`.

**`apps/web/plugins/`:**
- Purpose: Nitro startup plugins.
- Contents: `1.migrate.ts` (runs Drizzle migrations on boot), `2.storage.ts` (validates the local data dir when S3 isn't configured).

**`apps/web/public/`:**
- Purpose: Static assets served at the site root.
- Notable subdirs: `templates/{jpg,pdf}/` (per-template previews), `screenshots/` (PWA + marketing), `opengraph/`, `icon/`, `logo/`, `fonts/`, `photos/`, `sounds/`, `videos/`. Top-level files include `favicon.{ico,svg}`, `apple-touch-icon-180x180.png`, `manifest.webmanifest`, `pwa-{64,192,512}x.png`, `maskable-icon-512x512.png`, `robots.txt`, `sitemap.xml`, `funding.json`.

**`apps/web/locales/`:**
- Purpose: Lingui `.po` translation catalogs (~40 languages, `en-US` is source).
- Synced via `crowdin.yml` and `pnpm lingui:extract`.

**`packages/ai/`:**
- Purpose: AI prompt assets, patch-resume tool, sanitize/extraction helpers.
- Key paths: `packages/ai/src/prompts/{chat,analyze-resume,docx-parser,pdf-parser}-*.md`, `packages/ai/src/store.ts`, `packages/ai/src/tools/{patch-resume,patch-proposal}.ts`, `packages/ai/src/resume/{extraction-template,sanitize}.ts`.

**`packages/api/`:**
- Purpose: Server-side business logic exposed over oRPC. The only place oRPC procedures live.
- Key paths: `packages/api/src/context.ts` (auth context + `publicProcedure`/`protectedProcedure`), `packages/api/src/routers/{ai,auth,flags,resume,statistics,storage,index}.ts`, `packages/api/src/services/{resume,resume-events,storage,ai,auth,flags,statistics}.ts`, `packages/api/src/dto/resume.ts`, `packages/api/src/helpers/{resume-access,resume-access-policy}.ts`, `packages/api/src/middleware/rate-limit/index.ts`.

**`packages/auth/`:**
- Purpose: Better Auth instance and types reused by web routes and API context.
- Key paths: `packages/auth/src/config.ts` (Drizzle adapter, OAuth/passkey/2FA/api-key/JWT/MCP OAuth provider), `packages/auth/src/functions.ts`, `packages/auth/src/types.ts`.

**`packages/config/`:**
- Purpose: Shared tsconfig and vitest base configs consumed via workspace devDep.
- Key paths: `packages/config/tsconfig.base.json`, `packages/config/vitest.config.ts`.

**`packages/db/`:**
- Purpose: Drizzle client and schema. Migration tooling but **migrations live in repo-root `migrations/`** (`packages/db/drizzle.config.ts` → `out: "../../migrations"`).
- Key paths: `packages/db/src/client.ts` (singleton `pg.Pool` + `drizzle()` on `globalThis`), `packages/db/src/schema/{auth,resume,index}.ts`, `packages/db/src/relations.ts`.

**`packages/email/`:**
- Purpose: SMTP transport + react-email templates.
- Key paths: `packages/email/src/transport.ts`, `packages/email/src/templates/{auth,reset-password,verify-email,verify-email-change}.tsx`.

**`packages/env/`:**
- Purpose: Type-safe server environment variables. Auto-loads the repo-root `.env` for app/server callers (drizzle-kit must export `DATABASE_URL` manually).
- Key paths: `packages/env/src/server.ts`.

**`packages/fonts/`:**
- Purpose: Generated Google Fonts metadata used by the typography combobox and React PDF font registration.
- Key paths: `packages/fonts/src/index.ts`, `packages/fonts/src/webfontlist.json` (regenerated by `packages/scripts/fonts/generate.ts`).

**`packages/import/`:**
- Purpose: Importers that convert external resume formats into the shared `ResumeData` schema.
- Key paths: `packages/import/src/{json-resume,reactive-resume-json,reactive-resume-v4-json}.tsx`.

**`packages/pdf/`:**
- Purpose: React PDF rendering — the same code paths used by the browser preview and the server-side PDF download.
- Key paths: `packages/pdf/src/document.tsx`, `packages/pdf/src/context.tsx`, `packages/pdf/src/section-title.ts`, `packages/pdf/src/hooks/use-register-fonts.ts`, `packages/pdf/src/templates/index.ts`, `packages/pdf/src/templates/<name>/<Name>Page.tsx` (14 templates: `azurill`, `bronzor`, `chikorita`, `ditgar`, `ditto`, `gengar`, `glalie`, `kakuna`, `lapras`, `leafish`, `meowth`, `onyx`, `pikachu`, `rhyhorn`), shared primitives under `packages/pdf/src/templates/shared/` (`filtering.ts`, `rich-text.tsx`, `sections.tsx`, `primitives.tsx`, `picture.ts`, `page-size.ts`, `columns.ts`, `metrics.ts`, `meta-line.tsx`, `contact.ts`, `contact-item.tsx`, `level-display.tsx`, `section-links.ts`, `rich-text-html.ts`, `rich-text-spacing.ts`, `styles.ts`, `types.ts`, `context.tsx`).

**`packages/runtime-externals/`:**
- Purpose: Vendors `bcrypt`, `sharp`, `@aws-sdk/client-s3` so they stay runtime-only (Vite externalizes them in `apps/web/vite.config.ts:55`).
- No `src/` — `package.json` is the entire surface.

**`packages/schema/`:**
- Purpose: Source-of-truth Zod schemas for resume data, templates, page settings, AI analysis, and icon catalog.
- Key paths: `packages/schema/src/resume/{data,default,sample,analysis}.ts`, `packages/schema/src/templates.ts`, `packages/schema/src/page.ts`, `packages/schema/src/icons.ts`.

**`packages/scripts/`:**
- Purpose: Standalone tsx scripts; no exports.
- Key paths: `packages/scripts/database/reset.ts` (`pnpm --filter @reactive-resume/scripts db:reset`), `packages/scripts/fonts/generate.ts` (`pnpm --filter @reactive-resume/scripts fonts:generate`).

**`packages/ui/`:**
- Purpose: Shared component library (Base UI primitives + shadcn-style wrappers, Tailwind v4 styles).
- Key paths: `packages/ui/src/components/{dialog,dropdown-menu,command,resizable,form,tooltip,sonner,…}.tsx`, `packages/ui/src/hooks/{use-confirm,use-controlled-state,use-mobile,use-prompt}.tsx`, `packages/ui/src/styles/globals.css`.

**`packages/utils/`:**
- Purpose: Pure utility functions used everywhere. Each helper has its own export path; do not import internal files.
- Key paths: `packages/utils/src/{color,date,field,file,html,level,locale,network-icons,rate-limit,sanitize,string,style,url}.ts`, Node-only `packages/utils/src/{monorepo.node,url-security.node}.ts`, and `packages/utils/src/resume/{docx/index.ts,patch.ts}`.

**`migrations/`:**
- Purpose: Drizzle-generated migration directories (one per migration), kept at the repo root.
- Layout: each `YYYYMMDDhhmmss_<adjective>_<noun>/` contains `migration.sql` (the SQL Drizzle will apply) and `snapshot.json` (Drizzle's internal state).
- Applied by `apps/web/plugins/1.migrate.ts` on every server boot, and manually by `pnpm db:migrate`. Generated by `pnpm db:generate` (which writes here because of `out: "../../migrations"` in `packages/db/drizzle.config.ts`). Do not hand-edit `migration.sql`/`snapshot.json`.

**`data/` (and `apps/web/data/`):**
- Purpose: Default local-filesystem storage root when S3 vars are unset. `<workspace>/data` is validated/created at boot by `apps/web/plugins/2.storage.ts`. Override with `LOCAL_STORAGE_PATH` (must be absolute).
- `data/statistics/` and `apps/web/data/statistics/` exist as runtime byproducts; treat as gitignored runtime state.

**`.vite-hooks/`:**
- Purpose: Lefthook-managed git hooks (`pre-commit` runs `biome check`, `commit-msg` runs commitlint). Configured by `lefthook.yml` and `commitlint.config.cjs`.

**`.planning/`:**
- Purpose: GSD planning artifacts.
- Subdirectories: `.planning/codebase/` (this directory — analysis docs).

## Key File Locations

**Entry Points:**
- `apps/web/src/server.ts` — Nitro fetch entry.
- `apps/web/src/router.tsx` — Router factory.
- `apps/web/src/routes/__root.tsx` — Root route + global providers.
- `apps/web/plugins/1.migrate.ts` — Migration on boot.
- `apps/web/plugins/2.storage.ts` — Local storage validation on boot.

**Configuration:**
- `apps/web/vite.config.ts` — Vite + TanStack Start + Nitro + PWA + Lingui.
- `turbo.json` — Pipeline + `globalEnv` allowlist.
- `pnpm-workspace.yaml` — Workspaces (`apps/*` + `packages/*`).
- `biome.json` — Lint + format rules.
- `knip.json` — Dead-code analysis config.
- `lefthook.yml` — Git hooks.
- `packages/db/drizzle.config.ts` — Drizzle migration config (writes to `../../migrations`).
- `packages/env/src/server.ts` — Server env schema + `.env` loader.
- `apps/web/lingui.config.ts` — i18n extract config.
- `compose.dev.yml` / `compose.yml` — Postgres + SeaweedFS (dev) and prod-shaped compose.

**Core API:**
- `packages/api/src/routers/index.ts` — Router root.
- `packages/api/src/context.ts` — Auth resolver + procedure factories.
- `packages/api/src/services/resume.ts` — Resume CRUD/patch/lock/password/duplication.
- `packages/api/src/services/storage.ts` — S3 + local FS storage abstraction.
- `packages/api/src/helpers/resume-access-policy.ts` — Visibility/redaction policy.

**Core data:**
- `packages/db/src/schema/resume.ts` — Resume, statistics, analysis tables.
- `packages/db/src/schema/auth.ts` — Better Auth tables.
- `packages/db/src/client.ts` — Singleton `pg.Pool` + `drizzle()` client.
- `packages/schema/src/resume/data.ts` — Canonical Zod schema for `ResumeData`.
- `packages/schema/src/templates.ts` — Enum of template names.

**Core PDF:**
- `packages/pdf/src/document.tsx` — `ResumeDocument` root component.
- `packages/pdf/src/templates/index.ts` — Template registry.
- `packages/pdf/src/hooks/use-register-fonts.ts` — Font registration + CJK fallbacks.
- `packages/pdf/src/templates/shared/filtering.ts` — Shared section filtering.

**Auth:**
- `packages/auth/src/config.ts` — Better Auth instance.
- `apps/web/src/routes/api/auth.$.ts` — `/api/auth/*` handler with OAuth sanitization.
- `apps/web/src/libs/auth/{client.ts,session.ts}` — Browser client + SSR session helper.

**Testing:**
- `vitest.shared.ts`, `vitest.setup.ts` — Repo-wide setup (Testing Library, jest-dom, happy-dom env).
- `packages/config/vitest.config.ts` — Reusable Vitest base.
- `apps/web/vitest.config.ts` — Web app Vitest config.

## Naming Conventions

**Files:**
- Source files: `kebab-case.ts` / `kebab-case.tsx` (e.g. `resume-access-policy.ts`, `command-palette.tsx`).
- Component PascalCase is reserved for component names *inside* files; filenames stay kebab-case (e.g. `Button` exported from `packages/ui/src/components/button.tsx`).
- PDF template components are the one PascalCase exception: `packages/pdf/src/templates/azurill/AzurillPage.tsx` (kept that way because the directory name doubles as the template enum value).
- Tests sit next to their subject: `foo.ts` ↔ `foo.test.ts`, `foo.tsx` ↔ `foo.test.tsx`.
- Browser-only modules use a `.browser.tsx` suffix (e.g. `apps/web/src/components/resume/preview.browser.tsx`).
- Server-only modules use a `.server.tsx` suffix when they live next to browser counterparts (e.g. `apps/web/src/libs/resume/pdf-document.server.tsx`).
- Generated files use `.gen.ts` (e.g. `apps/web/src/routeTree.gen.ts`).
- Node-only utilities use a `.node.ts` suffix (e.g. `packages/utils/src/monorepo.node.ts`, `packages/utils/src/url-security.node.ts`).

**Routes (TanStack Router file conventions):**
- `$param.tsx` — dynamic path segment (e.g. `apps/web/src/routes/$username/$slug.tsx`).
- `$.tsx` — splat (matches the rest of the path; used for `api/rpc/$`, `api/auth/$`, `[.]well-known/$`).
- `_layout/` (underscore prefix) — pathless layout group (e.g. `apps/web/src/routes/_home/`).
- `-folder/` (dash prefix) — colocated, non-route helpers (`-components/`, `-sidebar/`, `-store/`, `-sections/`, `-helpers/`). The router ignores these.
- `[.]well-known` — escaped folder name for paths starting with a dot.
- `name[.]json.ts` — escaped dot in a route filename (used for `/schema.json`).
- `route.tsx` — layout/wrapper route at a directory level; `index.tsx` — index route inside it.

**Directories:**
- `apps/<app>` and `packages/<name>` — kebab-case workspace members.
- `packages/<name>/src/<subdomain>/<file>.ts` — every public path in `package.json` exports points into `src/`.

**Package names:** All workspace packages are scoped under `@reactive-resume/*` (`api`, `auth`, `db`, `ui`, etc.). The web app is just `web`.

## Where to Add New Code

**New oRPC procedure:**
- Define in `packages/api/src/routers/<domain>.ts`, register it on the exported router map, and add corresponding business logic to `packages/api/src/services/<domain>.ts`.
- If authenticated, prefer `protectedProcedure` from `packages/api/src/context.ts`.
- If it mutates resumes, attach `resumeMutationRateLimit` from `packages/api/src/middleware/rate-limit/index.ts`.
- Define input/output Zod schemas in `packages/api/src/dto/<domain>.ts` when reused.

**New database table or column:**
- Add the table/column to `packages/db/src/schema/<file>.ts`, update `packages/db/src/relations.ts` if needed, re-export from `packages/db/src/schema/index.ts`.
- Run `DATABASE_URL=... pnpm db:generate` to write a migration directory under `migrations/`.
- Apply with `DATABASE_URL=... pnpm db:migrate` (or just start the app — `apps/web/plugins/1.migrate.ts` runs them on boot).

**New resume field or section:**
- Update Zod first in `packages/schema/src/resume/data.ts` (and `default.ts` / `sample.ts` if applicable).
- Adjust API DTOs (`packages/api/src/dto/resume.ts`), importers (`packages/import/src/*.tsx`), PDF templates and shared primitives (`packages/pdf/src/templates/...`), and the builder forms under `apps/web/src/routes/builder/$resumeId/-sidebar/`.

**New resume template:**
- Add to the template enum in `packages/schema/src/templates.ts`.
- Implement the page component at `packages/pdf/src/templates/<name>/<Name>Page.tsx` and register it in `packages/pdf/src/templates/index.ts`.
- Drop static previews into `apps/web/public/templates/jpg/<name>.jpg` and `apps/web/public/templates/pdf/<name>.pdf`.

**New web route:**
- Add the file under `apps/web/src/routes/...`. Use `$param.tsx` for dynamic segments, `_layout/` for pathless groups, and `-folder/` for colocated helpers.
- The route tree regenerates into `apps/web/src/routeTree.gen.ts` — do not hand-edit.
- For browser-only sub-routes, set `ssr: false` (see `apps/web/src/routes/builder/$resumeId/index.tsx`) or `ssr: "data-only"` (see `apps/web/src/routes/$username/$slug.tsx`).

**New server-only HTTP endpoint:**
- Add a route file (typically under `apps/web/src/routes/api/`) and export `Route = createFileRoute(...)({ server: { handlers: { GET/POST/ANY: handler } } })`.
- Import server-only deps (`@reactive-resume/db/client`, `@reactive-resume/api/services/*`) only inside the handler module so they stay out of the client bundle.

**New shared component:**
- App-only: `apps/web/src/components/<group>/<name>.tsx` (with colocated test if behaviour is non-trivial).
- Reused across packages: `packages/ui/src/components/<name>.tsx` (export via deep path `@reactive-resume/ui/components/<name>`).

**New shared utility:**
- Add to `packages/utils/src/<topic>.ts` and an explicit `"./<topic>": "./src/<topic>.ts"` entry in `packages/utils/package.json` `exports`. Never import private files across packages.

**New dialog:**
- Implement under `apps/web/src/dialogs/<group>/<name>.tsx`.
- Register with the dialog store and ensure `apps/web/src/dialogs/manager.tsx` renders it.

**New AI prompt or tool:**
- Prompts go in `packages/ai/src/prompts/<name>.md` (re-exported via `packages/ai/src/prompts.ts`).
- Tools go in `packages/ai/src/tools/<name>.ts` and are exposed through the AI router in `packages/api/src/routers/ai.ts`.

**New MCP tool/resource/prompt:**
- Register in `apps/web/src/routes/mcp/-helpers/{tools,resources,prompts}.ts`; reuse existing oRPC services for actual logic.

## Special Directories

**`apps/web/src/routes/`:**
- Purpose: Source for the file-based route tree.
- Generated artifact: `apps/web/src/routeTree.gen.ts`.
- Committed: Yes (the tree file is committed; regenerated by TanStack Router tooling on dev/build).

**`migrations/`:**
- Purpose: Drizzle-generated SQL + snapshots.
- Generated: Yes (by `pnpm db:generate`).
- Committed: Yes — do not hand-edit, but always commit new migration folders.

**`apps/web/.output/`:**
- Purpose: Nitro/Vite production build output (server + client + PWA assets).
- Generated: Yes (by `pnpm build`).
- Committed: No (gitignored).

**`apps/web/locales/`:**
- Purpose: Lingui `.po` catalogs.
- Generated: `en-US.po` is the source; other locales are synced via Crowdin (`crowdin.yml`).
- Committed: Yes.

**`data/` and `apps/web/data/`:**
- Purpose: Default local storage root when S3 is unset (`<workspace>/data`).
- Generated: Yes (at runtime by `apps/web/plugins/2.storage.ts` or service calls).
- Committed: No (gitignored runtime state).

**`.turbo/`, `.pnpm-store/`, `node_modules/`:**
- Purpose: Tool caches and dependency stores.
- Committed: No.

**`.vite-hooks/`:**
- Purpose: Lefthook-installed git hooks (`commit-msg`, `pre-commit`).
- Committed: Yes (so contributors get hooks automatically), but the underlying behavior is defined by `lefthook.yml`.

**`packages/runtime-externals/`:**
- Purpose: Marks `bcrypt`, `sharp`, `@aws-sdk/client-s3` as runtime dependencies that Vite externalizes.
- No source files — package.json is the entire contract.

## Files / Locations to Avoid Hand-Editing

- `apps/web/src/routeTree.gen.ts` — regenerated by TanStack Router tooling.
- `migrations/<timestamp>_<name>/migration.sql` and `snapshot.json` — generated by `drizzle-kit`. Add a new migration via `pnpm db:generate` instead of editing past ones.
- `pnpm-lock.yaml` — managed by pnpm. Update via `pnpm install`.
- `apps/web/.output/`, `apps/web/coverage/`, `packages/*/coverage/`, `packages/*/reports/` — build/test artifacts.
- `apps/web/locales/*.po` (except `en-US.po`) — synced from Crowdin per `crowdin.yml`.
- `apps/web/public/screenshots/`, `apps/web/public/opengraph/`, `apps/web/public/templates/{jpg,pdf}/` — regenerated assets; replace files wholesale rather than diff-editing.

---

*Structure analysis: 2026-05-11*
