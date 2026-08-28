<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

<!-- caveman-begin -->
Respond terse like smart caveman. All technical substance stay. Only fluff die.

Rules:
- Drop: articles (a/an/the), filler (just/really/basically), pleasantries, hedging
- Fragments OK. Short synonyms. Technical terms exact. Code unchanged.
- Pattern: [thing] [action] [reason]. [next step].
- Not: "Sure! I'd be happy to help you with that."
- Yes: "Bug in auth middleware. Fix:"

Switch level: /caveman lite|full|ultra|wenyan-lite|wenyan-full|wenyan-ultra
Stop: "stop caveman" or "normal mode"

Auto-Clarity: drop caveman for security warnings, irreversible actions, user confused. Resume after.

Boundaries: code/commits/PRs written normal.
<!-- caveman-end -->

<!-- graphify-begin -->
## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
<!-- graphify-end -->

# AGENTS.md

## Agent skills

- Issues and specs: GitHub Issues for `amruthpillai/reactive-resume`. See `docs/agents/issue-tracker.md`.
- Domain docs use a multi-context layout. See `docs/agents/domain.md`.

## Overview

Reactive Resume is a pnpm monorepo (Turborepo) with two deployable apps: `apps/web` (TanStack Start / React 19 / Vite) and `apps/server` (Hono / Node.js). The production Docker image runs a single Node.js process on port 3000; `apps/server` mounts the API/auth/MCP/static routes and serves the built web app.

Internal packages are source-consumed through `package.json` export maps pointing at `src` files. Do not assume package-local `dist` output exists unless a package explicitly adds it.

Prerequisites: **Node.js 24** (matches Dockerfile `ARG NODE_VERSION=24`), **pnpm 11.21.0** ([install guide](https://pnpm.io/installation)), and **Docker** for PostgreSQL (`sudo dockerd &` if the daemon isn't running).

## Ownership map

Where each concern lives, and where new code for it goes:

| Area | Owner |
|------|-------|
| Web routes, loaders, user-facing workflows | `apps/web/src/routes`, `apps/web/src/features` (file-based; never hand-edit `routeTree.gen.ts`) |
| Server HTTP routes/adapters, startup checks, static handlers, MCP transport, OpenAPI/well-known | `apps/server/src/{http,rpc,mcp,openapi,static,startup}` |
| Authenticated API contracts + business logic | `packages/api/src/features/*` (oRPC routers, DTOs, rate limiting; aggregated at `@reactive-resume/api/routers` for `/api/rpc`) |
| Auth | `packages/auth` (Better Auth config/helpers/types; `apps/server/src/http/auth.ts` delegates to `auth.handler`) |
| DB client + schema | `packages/db` (Drizzle; migrations at repo root `migrations/`) |
| Server env validation | `packages/env` (auto-loads root `.env`) |
| Resume/page/template Zod schemas | `packages/schema` |
| Pure resume-domain behavior (no DB/HTTP/DOM/renderer deps) | `packages/resume` (JSON Patch helpers, social-network icons) |
| Resume PDF rendering | `packages/pdf` (React PDF document, font registration, template primitives, browser/server adapters) |
| PDF.js viewer/canvas UI | `apps/web/src/features/resume` — never in `packages/pdf` |
| DOCX export | `packages/docx` |
| MCP tools/prompts/resources/server-card | `packages/mcp` |
| Generic UI primitives + hooks | `packages/ui` (Base UI/shadcn-style); workflow-specific UI stays in the owning web feature |
| Focused support surfaces | `packages/fonts`, `packages/email`, `packages/import`, `packages/ai`, `packages/utils`, `packages/config` — prefer existing exports over cross-package shortcuts |
| Dev-only scripts | `tooling/`, not `packages/`, so packages only hold runtime-bundled code |

Narrow cross-cutting helpers go in `packages/utils` only after checking no domain package is a better owner. Specifically: resume JSON Patch behavior belongs in `@reactive-resume/resume/patch` and DOCX builders in `@reactive-resume/docx` — not in `@reactive-resume/utils`.

## Web app conventions

- `apps/web/src/router.tsx` initializes router context with `queryClient`, `orpc`, `theme`, `locale`, `session`, and `flags`. Reuse route context instead of refetching these ad hoc.
- Builder shell: `apps/web/src/routes/builder/$resumeId`. Its nested preview route is client-only (`ssr: false`); the public resume route `apps/web/src/routes/$username/$slug.tsx` uses `ssr: "data-only"`.
- Browser-only preview code: `apps/web/src/features/resume/preview`. Public PDF viewer: `apps/web/src/features/resume/public`. Keep PDF.js/canvas/browser APIs out of SSR paths.
- Isomorphic oRPC client: `apps/web/src/libs/orpc/client.ts` — server calls use an in-process router client, browser calls use `/api/rpc` with credentials included.
- For React components with explicit props, use a named props type (e.g. `type FooProps = {...}` with `function Foo(props: FooProps)`) rather than inline object annotations, especially with more than one field or with generics.

## Package boundaries

`pnpm exec turbo boundaries` is the executable check. Rules:

- Workspace deps go through package names and export maps. Never import another workspace's `src` tree via repo paths, `@reactive-resume/*/src/*`, or TS path aliases.
- Workspace `turbo.json` files declare coarse tags: `app:web`, `app:server`, `runtime:server` (server-only packages: API/auth/db/env/email/MCP), `runtime:browser` (browser-only shared UI), `runtime:universal` (environment-neutral domain packages), plus `role:domain|infra|adapter|api|rendering|tooling` for intent.
- Runtime-specific code lives behind explicit export subpaths (`@reactive-resume/pdf/browser`, `@reactive-resume/pdf/server`, `@reactive-resume/env/server`). Keep root exports environment-neutral unless the package is intentionally server-only.
- Wildcard exports are allowed only for leaf libraries with an intentionally file-like surface — currently `@reactive-resume/ui/components/*`, `@reactive-resume/ui/hooks/*`, and schema resume model files. Prefer explicit exports for packages owning runtime behavior.
- Prefer `protectedProcedure` from `packages/api/src/context.ts` for authenticated procedures. Expose only intentional public surfaces through `packages/api/package.json`.
- Shared PDF section filtering: `packages/pdf/src/templates/shared/filtering.ts`. Template-specific visual exceptions stay in the owning template directory unless multiple templates need the behavior. `packages/pdf/src/hooks/use-register-fonts.ts` owns font registration, standard PDF fonts, CJK fallback stacks, and global hyphenation.

Multi-place changes:

- **Resume data shape**: `packages/schema/src/resume/*` first, then API DTOs, importers, PDF rendering, and web forms consuming it.
- **New template**: `packages/schema/src/templates.ts`, `packages/pdf/src/templates/index.ts`, source under `packages/pdf/src/templates/<name>/`, and previews under `apps/web/public/templates/{jpg,pdf}`.
- **New DB column/table**: `packages/db/src/schema/*`, then `dotenvx run -f .env.local -- pnpm db:generate`.
- **New env var**: `packages/env/src/server.ts` **and** the `globalEnv` array in `turbo.json`. Turborepo 2.x strict env mode filters out unlisted vars, so the variable will be `undefined` in child processes at runtime even when correctly set in the OS/container environment.

## Environment and database

Copy `.env.example` to `.env.local`. Three required vars: `APP_URL` (default `http://localhost:3000`), `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/postgres`), `AUTH_SECRET` (any non-empty string).

- **S3/SeaweedFS optional.** If `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, and `S3_BUCKET` are all set, the app uses S3-compatible storage. `.env.example` ships SeaweedFS defaults, so either start the `seaweedfs` compose service or comment those vars out to use local filesystem storage under `<workspace>/data`. `LOCAL_STORAGE_PATH` must be absolute when set.
- **`REDIS_URL` and `ENCRYPTION_SECRET`** are optional for core resume flows but both required for saved AI providers and the authenticated `/agent` workspace. Host-run dev uses `REDIS_URL=redis://localhost:6379`; the container-run app uses `redis://redis:6379`.
- **`drizzle-kit` (used by `pnpm db:migrate`) reads `DATABASE_URL` from `process.env` directly** — it does not auto-load `.env`. Run migration commands through `dotenvx`.
- The production server auto-runs migrations at startup before serving traffic, so manual `pnpm db:migrate` is mainly for first setup, migration debugging, or applying migrations without starting the app.

## Commands

Prefix dev servers and migration commands with `dotenvx run -f .env.local --`. Tests, typechecks, linters, boundary checks, and `pnpm build` do not need it; if one fails on a missing env var, rerun it with the prefix.

```
sudo docker compose -f compose.dev.yml up -d postgres                                    # DB only
sudo docker compose -f compose.dev.yml up -d postgres redis seaweedfs seaweedfs_create_bucket   # full infra
dotenvx run -f .env.local -- pnpm dev            # port 3000 (dev:web for web only)
dotenvx run -f .env.local -- pnpm db:generate    # db:migrate to apply
pnpm check                                       # Biome — WRITE-CAPABLE (--write --unsafe)
pnpm test | pnpm typecheck | pnpm build | pnpm exec turbo boundaries
```

Prefer package filters over repo-wide runs, e.g. `pnpm --filter web typecheck`, `pnpm --filter @reactive-resume/pdf test`. Vitest paths are package-relative under `pnpm --filter <package> test -- <path>`.

## Gotchas

- Email sending needs SMTP config; without it emails are logged to console. Dev still works — verification links appear in server logs.
- `lefthook.yml` pre-commit runs `biome check` on staged files. Run `pnpm check` before committing.
- `pnpm check` is write-capable. Call that out when using it, and use narrower Biome commands for a non-mutating inspection.
- Biome: tabs, double quotes, line width 120, organized import groups, sorted Tailwind classes for `clsx`, `cva`, `cn`.
- Most packages typecheck with `tsgo --noEmit` and test with `vitest run --passWithNoTests`.
- There may be unrelated local edits in the worktree. Check `git status --short` first; do not revert files you did not touch.
