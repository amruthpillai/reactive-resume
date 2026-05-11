# Technology Stack

**Analysis Date:** 2026-05-11

## Languages

**Primary:**
- TypeScript `^6.0.3` — All workspace code under `apps/web/src` and `packages/*/src`. Typechecked with the experimental TS native compiler `@typescript/native-preview` (`7.0.0-dev.20260510.1`) via `tsgo --noEmit`.
- TSX (React 19) — UI components in `apps/web/src`, `packages/ui/src/components`, `packages/pdf/src/templates`, and email templates in `packages/email/src/templates`.

**Secondary:**
- JavaScript (ESM, `"type": "module"`) — A handful of config files such as `commitlint.config.cjs` and `apps/web/postcss.config` style snippets.
- JSON / JSONC — `package.json`, `tsconfig.json`, `biome.json`, `turbo.json`, `knip.json`, `apps/web/components.json`, `packages/schema/schema.json`, locale and webfont metadata.
- SQL — Drizzle-generated migrations under `migrations/` (e.g. `migrations/20260507144406_fast_nova/`).
- YAML — `compose.yml`, `compose.dev.yml`, `lefthook.yml`, `crowdin.yml`, `pnpm-workspace.yaml`.
- Markdown — `AGENTS.md`, `README.md`, `SECURITY.md`, `LICENSE`, docs under `docs/`.

## Runtime

**Environment:**
- Node.js `24` — Pinned in `Dockerfile` via `ARG NODE_VERSION=24`. Single Node process exposes the web app on port `3000`.
- Browser runtime — React 19 SSR + hydration via TanStack Start. PWA service worker registered from `apps/web/vite.config.ts`.

**Package Manager:**
- pnpm `11.0.9` — Pinned in `package.json` `packageManager` field (with integrity hash). Managed via Corepack (`corepack enable`) per `AGENTS.md`.
- Workspace topology: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`.
- Lockfile: `pnpm-lock.yaml` is present and committed at repo root.
- `allowBuilds` in `pnpm-workspace.yaml`: `bcrypt`, `esbuild`, `lefthook`, `msw`, `sharp`.
- `postcss` is pinned by an override to `^8.5.14` in `pnpm-workspace.yaml`.

**Build Orchestrator:**
- Turborepo `^2.9.12` — `turbo.json` defines tasks (`build`, `dev`, `typecheck`, `test`, `db:generate`, `db:migrate`, `db:studio`, `lingui:extract`) and the `globalEnv` whitelist for cache invalidation.
- The Docker build also pins `turbo@2.9.9` via `pnpm dlx` for the pruner stages.

## Frameworks

**Core (apps/web):**
- React `^19.2.6` with `react-dom ^19.2.6` (from `apps/web/package.json`).
- TanStack Start `^1.167.65` — Full-stack framework wiring Vite, Nitro, and React Router. Server handlers live in route files under `apps/web/src/routes`.
- TanStack Router `^1.169.2` — File-based router. `apps/web/src/routeTree.gen.ts` is generated.
- TanStack React Query `^5.100.9` with SSR bridge `@tanstack/react-router-ssr-query ^1.166.12`.
- TanStack React Form `^1.32.0` and React Hotkeys `^0.10.0`.
- Vite `^8.0.11` (rolldown-based) — `apps/web/vite.config.ts` orchestrates plugins.
- Nitro `3.0.260429-beta` — Server framework used through `nitro/vite`. Plugins at `apps/web/plugins/1.migrate.ts` and `apps/web/plugins/2.storage.ts` run on Nitro startup.
- `srvx ^0.11.15` — HTTP server runtime used by Nitro/TanStack Start.

**RPC / API:**
- oRPC `^1.14.2` family — `@orpc/server`, `@orpc/client`, `@orpc/openapi`, `@orpc/json-schema`, `@orpc/zod`, `@orpc/tanstack-query`, `@orpc/experimental-ratelimit`.
- `@modelcontextprotocol/sdk ^1.29.0` — MCP server exposed at `/mcp` via `apps/web/src/routes/mcp/index.ts`.

**Auth:**
- Better Auth `1.6.10` — Core auth framework configured in `packages/auth/src/config.ts`.
- Better Auth plugins: `@better-auth/api-key ^1.6.10`, `@better-auth/drizzle-adapter ^1.6.10`, `@better-auth/infra ^0.2.6` (dashboard), `@better-auth/oauth-provider ^1.6.10`, `@better-auth/passkey ^1.6.10`, plus built-ins (`admin`, `jwt`, `twoFactor`, `username`, `genericOAuth`).
- `jose ^6.2.3` — JWT verification for OAuth tokens (MCP authentication).
- `bcrypt ^6.0.0` — Password hashing (10 rounds in `packages/auth/src/config.ts`).

**Database & ORM:**
- Drizzle ORM `1.0.0-beta.22` with PostgreSQL driver `pg ^8.20.0` (node-postgres).
- `drizzle-kit 1.0.0-beta.22` — Migration tooling. Config at `packages/db/drizzle.config.ts` (dialect `postgresql`, schema `./src/schema/index.ts`, out `../../migrations`).
- `drizzle-zod 1.0.0-beta.14-a36c63d` — Schema-derived Zod validators in `packages/api`.

**PDF / Rendering:**
- `@react-pdf/renderer ^4.5.1` with types `@react-pdf/types ^2.11.1` — Used by `packages/pdf/src/document.tsx` and all templates under `packages/pdf/src/templates/<name>/`.
- `pdfjs-dist 5.7.284` — Client-side PDF rendering and parsing (browser-only paths).
- `react-pdf-html ^2.1.5`, `node-html-parser ^7.1.0`, `phosphor-icons-react-pdf ^0.1.3`, `cjk-regex ^3.4.0` — PDF helpers and CJK fallback.
- Font registration owned by `packages/pdf/src/hooks/use-register-fonts.ts`; webfont catalog at `packages/fonts/src/webfontlist.json`.

**UI / Styling:**
- Base UI / shadcn-style components — `@base-ui/react ^1.4.1`, `shadcn ^4.7.0` (CLI), components live in `packages/ui/src/components/*.tsx`. Config at `apps/web/components.json` (style `base-nova`, base color `zinc`, icon library `phosphor`).
- Tailwind CSS `^4.3.0` via `@tailwindcss/vite ^4.3.0` and `@tailwindcss/postcss ^4.3.0`. Plugin `@tailwindcss/typography ^0.5.19`. Global stylesheet at `packages/ui/src/styles/globals.css`.
- PostCSS `^8.5.14` and `tw-animate-css ^1.4.0`.
- `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `tailwind-merge ^3.6.0`.
- Icons: `@phosphor-icons/react ^2.1.10`, `@phosphor-icons/web ^2.1.2`.
- Fonts: `@fontsource-variable/ibm-plex-sans ^5.2.8` (shipped with `packages/ui`).
- Theming: `next-themes ^0.4.6`.
- Animation: `motion ^12.38.0`.
- Toasts: `sonner ^2.0.7`.
- Command palette: `cmdk ^1.1.1`.
- Misc UI: `react-resizable-panels ^4.11.0`, `react-window ^2.2.7`, `react-zoom-pan-pinch ^4.0.3`, `qrcode.react ^4.2.0`, `@uiw/color-convert ^2.10.1`, `@uiw/react-color-colorful ^2.10.1`.

**Drag & Drop and Editing:**
- `@dnd-kit/core ^6.3.1`, `@dnd-kit/sortable ^10.0.0`, `@dnd-kit/utilities ^3.2.2`.
- TipTap `^3.23.1` editor with `starter-kit`, `pm`, `react`, plus extensions `color`, `highlight`, `table`, `text-align`, `text-style`.

**State / Validation / Patterns:**
- Zustand `^5.0.13` — Client and AI state stores (`packages/ai/src/store.ts`).
- Immer `^11.1.8`.
- Zod `^4.4.3` — Validators across schema, api, env, ai, import, utils packages.
- `ts-pattern ^5.9.0` — Pattern matching in API services.
- `es-toolkit ^1.46.1` and `fuse.js ^7.3.0`.

**Internationalization (i18n):**
- Lingui `^6.0.1` family — `@lingui/core`, `@lingui/react`, `@lingui/cli`, `@lingui/format-po`, `@lingui/vite-plugin`, `@lingui/babel-plugin-lingui-macro`.
- Babel transformer chain via `@rolldown/plugin-babel ^0.2.3` and `babel-plugin-macros ^3.1.0`.
- Locale config at `apps/web/lingui.config.ts` (source locale `en-US`, ~55 target locales, pseudo-locale `zu-ZA`).
- Translation catalogs at `apps/web/locales/{locale}.po`. Crowdin sync configured in `crowdin.yml`.

**Email:**
- React Email `^6.1.1` with `@react-email/ui ^6.1.1` — Templates in `packages/email/src/templates/auth.tsx`.
- Nodemailer `^8.0.7` SMTP transport — `packages/email/src/transport.ts`.

**AI:**
- Vercel AI SDK `ai ^6.0.177` and `@ai-sdk/react ^3.0.179`.
- Provider SDKs: `@ai-sdk/openai ^3.0.63`, `@ai-sdk/anthropic ^3.0.76`, `@ai-sdk/google ^3.0.71`, `@ai-sdk/openai-compatible ^2.0.47`, `ollama-ai-provider-v2 ^3.5.0`.
- Supported providers enumerated at `packages/ai/src/types.ts`: `openai`, `anthropic`, `gemini`, `vercel-ai-gateway`, `openrouter`, `ollama`.
- JSON patch / repair: `fast-json-patch ^3.1.1`, `jsonrepair ^3.14.0`, `deepmerge-ts ^7.1.5`.

**Storage:**
- AWS SDK v3 — `@aws-sdk/client-s3 ^3.1045.0` used in `packages/api/src/services/storage.ts`. Marked external in the rolldown build (see `apps/web/vite.config.ts`) and isolated into `packages/runtime-externals` for Docker.

**Image Processing:**
- Sharp `^0.34.5` — Used in `packages/api/src/services/storage.ts` `processImageForUpload`. Disabled when `FLAG_DISABLE_IMAGE_PROCESSING` is true.

**Document Generation / Import:**
- `docx ^9.6.1` — DOCX export utilities in `packages/utils/src/resume/docx/`.
- JSON Resume importers in `packages/import` (`json-resume`, `reactive-resume-json`, `reactive-resume-v4-json`).

**HTML Sanitization:**
- `dompurify ^3.4.2` — Used in `packages/utils/src/sanitize.ts`.
- `@sindresorhus/slugify ^3.0.0`, `unique-names-generator ^4.7.1`, `uuid ^14.0.0`.

**PWA:**
- `vite-plugin-pwa ^1.3.0` — Workbox-based service worker, manifest defined in `apps/web/src/libs/pwa`.

**Testing:**
- Vitest `^4.1.5` with `@vitest/coverage-v8 ^4.1.5` (provider `v8`).
- Shared config in `vitest.shared.ts`; per-package configs at `<pkg>/vitest.config.ts`.
- DOM: `happy-dom ^20.9.0` (`disableJavaScriptFileLoading`, `disableCSSFileLoading`, navigation disabled in `vitest.shared.ts`).
- Testing Library: `@testing-library/react ^16.3.2`, `@testing-library/dom ^10.4.1`, `@testing-library/jest-dom ^6.9.1`, `@testing-library/user-event ^14.6.1`.
- Tests are co-located in each package's `src/**/*.{test,spec}.{ts,tsx}` and discovered automatically.

**Lint / Format / Tooling:**
- Biome `^2.4.15` — Sole linter + formatter (`biome.json`: tabs, double quotes, line width 120, organized import groups, `useSortedClasses` for `clsx`/`cva`/`cn`). Pre-commit runs through Lefthook.
- Lefthook `^2.1.6` — Git hooks defined in `lefthook.yml` (`biome check --write --unsafe` on staged JS/TS/JSON files; `commitlint --edit` on commit messages).
- Commitlint `^21.0.0` with `@commitlint/config-conventional` (see `commitlint.config.cjs`).
- Knip `^6.12.2` — Dead-code/unused-deps detection (`knip.json`).
- `npm-check-updates ^22.1.1`.
- `tsx ^4.21.0` — Used by `packages/scripts` for ad hoc TS scripts.

## Key Dependencies

**Critical:**
- `@tanstack/react-start ^1.167.65` — App framework boundary; route server handlers depend on it.
- `@orpc/server ^1.14.2` — Type-safe RPC; backbone of `/api/rpc` and `/api/openapi`.
- `better-auth 1.6.10` — Identity, sessions, OAuth provider, MCP auth.
- `drizzle-orm 1.0.0-beta.22` + `pg ^8.20.0` — All DB access.
- `@react-pdf/renderer ^4.5.1` — Resume PDF generation.
- `@aws-sdk/client-s3 ^3.1045.0` — S3-compatible object storage.
- `@modelcontextprotocol/sdk ^1.29.0` — MCP server endpoint.
- `ai ^6.0.177` + `@ai-sdk/*` — Resume AI features (analysis, parsing, chat).

**Infrastructure:**
- `vite ^8.0.11` + `nitro 3.0.260429-beta` — Build and server runtime.
- `turbo ^2.9.12` — Workspace task graph and caching.
- `dotenv ^17.4.2` — Loaded by `packages/env/src/server.ts` for app/server code (drizzle-kit does NOT auto-load).
- `@t3-oss/env-core ^0.13.11` — Server env validation in `packages/env/src/server.ts`.

## Configuration

**TypeScript:**
- Root `tsconfig.json` extends `@reactive-resume/config/tsconfig.base.json` (`packages/config/tsconfig.base.json`).
- Each package has its own `tsconfig.json` and runs `tsgo --noEmit`.
- Apps/packages export source from `src/*.ts` via package.json `exports` — no `dist/` artifacts unless explicitly built (e.g. `apps/web/.output`).

**Build:**
- `apps/web/vite.config.ts` orchestrates `tailwindcss`, `tanstackStart`, `viteReact`, `lingui`, `babel` (Lingui macro preset), `nitro` (with `1.migrate.ts` and `2.storage.ts` plugins), and `VitePWA`.
- Rolldown externals: `bcrypt`, `sharp`, `@aws-sdk/client-s3` (kept out of the client/server bundle and provided by `packages/runtime-externals` in Docker).
- Output: `apps/web/.output/server/index.mjs` (Nitro), public assets in `apps/web/.output/public`.

**Database:**
- Drizzle config: `packages/db/drizzle.config.ts` — `dialect: "postgresql"`, schema in `packages/db/src/schema/index.ts`, migrations written to repo-root `migrations/`.
- Client: `packages/db/src/client.ts` exposes singleton `db` plus `Pool` via `pg`, using `env.DATABASE_URL`.
- Startup auto-migration: `apps/web/plugins/1.migrate.ts` runs `drizzle-orm/node-postgres/migrator` against the resolved `migrations/` folder.

**Environment:**
- Server env contract validated by Zod in `packages/env/src/server.ts` (via `@t3-oss/env-core`).
- `dotenv` auto-loads root `.env` from `packages/env/src/server.ts` using `findWorkspaceRoot()`.
- Required: `APP_URL`, `DATABASE_URL`, `AUTH_SECRET`.
- Cache invalidation env vars listed in `turbo.json` `globalEnv`.
- `.env.example` present at repo root; `.env.local` and `.env.production` exist locally (contents not read — may contain secrets).

**Linting / Formatting:**
- `biome.json` — Tabs, 120-col, double quotes, sorted Tailwind classes for `clsx|cva|cn`, organized import groups (`type` imports first, then Node built-ins, test packages, third-party, `@reactive-resume/**`, then aliases/relative).
- `lefthook.yml` — Pre-commit Biome on staged files; commit-msg Commitlint.
- `commitlint.config.cjs` — Conventional commits.
- `knip.json` — Workspace-level ignores for `runtime-externals` external deps.

**Container / Compose:**
- `Dockerfile` (multi-stage): `base` (Node 24 slim + corepack), `pruner` (turbo prune), `builder` (frozen lockfile install + `pnpm turbo run build --filter=web --force`), `runtime-pruner` + `runtime-deps` (deploy `@reactive-resume/runtime-externals` with native deps), final `runtime` image running `node .output/server/index.mjs`, HEALTHCHECK on `/api/health`.
- `compose.dev.yml` — Dev `postgres:latest` + `seaweedfs:latest` (S3 emulator) + `seaweedfs_create_bucket` init container using `quay.io/minio/mc:latest`.
- `compose.yml` — Same services plus the app container `reactive_resume` built from `Dockerfile`, with `data_network`/`storage_network` and S3 env defaults pointing at SeaweedFS.

## Platform Requirements

**Development:**
- Node.js 24, pnpm 11.0.9 (via Corepack), Docker (for Postgres / SeaweedFS).
- Repo-local `data/` directory for local-storage mode (auto-created by `apps/web/plugins/2.storage.ts`).
- `LOCAL_STORAGE_PATH` must be absolute when set.
- SMTP optional; without it `packages/email/src/transport.ts` logs the email to console.

**Production:**
- Single Node 24 process on port 3000 (`apps/web/.output/server/index.mjs`).
- Official Docker image listed in `Dockerfile` labels (`org.opencontainers.image.url=https://rxresu.me`).
- Production uses S3-compatible storage when all three of `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` are set; otherwise falls back to local filesystem under `/app/data` (per Dockerfile `ENV LOCAL_STORAGE_PATH=/app/data`).
- HEALTHCHECK polls `GET /api/health` (handler at `apps/web/src/routes/api/health.ts` checks DB and storage with a 1.5s timeout).
- Rate limiting only active when `NODE_ENV=production` (see `packages/auth/src/config.ts` and `packages/api/src/middleware/rate-limit/index.ts`).

---

*Stack analysis: 2026-05-11*
