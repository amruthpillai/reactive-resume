# AGENTS.md

## Overview

Reactive Resume is a single-package full-stack TypeScript app (not a monorepo) built with [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview) (React, Vite, Nitro). It serves both frontend and API on port 3000.

This project uses [Vite+](https://vite.dev/blog/announcing-viteplus), a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. All modules should be imported from the `vite-plus` dependency (e.g., `import { defineConfig } from 'vite-plus'` or `import { expect, test, vi } from 'vite-plus/test'`).

## Key Libraries

| Area                 | Library                                                                  | Docs                               |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Frontend framework   | React                                                                    | https://react.dev                  |
| Full-stack framework | TanStack Start                                                           | https://tanstack.com/start/latest  |
| Router               | TanStack React Router                                                    | https://tanstack.com/router/latest |
| Server state         | TanStack React Query                                                     | https://tanstack.com/query/latest  |
| Client state         | Zustand (+ Zundo for undo/redo, Immer for immutable updates)             | https://zustand.docs.pmnd.rs       |
| Type-safe API        | oRPC                                                                     | https://orpc.unnoq.com             |
| Database ORM         | Drizzle ORM (PostgreSQL)                                                 | https://orm.drizzle.team           |
| Authentication       | Better Auth (+ Drizzle adapter, OAuth provider, API keys, 2FA, Passkeys) | https://www.better-auth.com        |
| Styling              | Tailwind CSS                                                             | https://tailwindcss.com            |
| UI Components        | shadcn/ui (built on Base UI)                                             | https://ui.shadcn.com              |
| Icons                | Phosphor Icons                                                           | https://phosphoricons.com          |
| Forms                | React Hook Form (+ Zod resolvers)                                        | https://react-hook-form.com        |
| Rich text editor     | Tiptap                                                                   | https://tiptap.dev                 |
| Validation           | Zod                                                                      | https://zod.dev                    |
| AI                   | Vercel AI SDK (OpenAI, Anthropic, Google, Ollama providers)              | https://ai-sdk.dev                 |
| MCP                  | Model Context Protocol SDK                                               | https://modelcontextprotocol.io    |
| i18n                 | Lingui                                                                   | https://lingui.dev                 |
| Animations           | Motion (Framer Motion)                                                   | https://motion.dev                 |
| PDF export           | Puppeteer Core (via Browserless)                                         | https://pptr.dev                   |
| Drag and drop        | dnd-kit                                                                  | https://dndkit.com                 |
| Server engine        | Nitro                                                                    | https://nitro.build                |
| PWA                  | Vite PWA Plugin                                                          | https://vite-pwa-org.netlify.app   |
| Unused deps          | Knip                                                                     | https://knip.dev                   |

## Project Structure

```
src/
  components/     UI, resume, layout, animation, theme, locale components
  routes/         File-based routing (TanStack React Router)
  integrations/   Feature modules (auth, drizzle, orpc, ai, email, jobs, mcp, storage)
  schema/         Zod schemas for resume data validation
  utils/          Utility functions (locale, theme, env, resume processing)
  dialogs/        Modal/dialog components
  hooks/          Custom React hooks
  styles/         CSS and Tailwind configuration
  stores/         Zustand stores (resume, AI, dialog, command palette)
migrations/       Drizzle database migrations
locales/          Lingui i18n message catalogs (47+ locales)
```

### Key Config Files

- `vite.config.ts` — Vite + Nitro + TanStack Start + PWA + Tailwind + Lingui
- `drizzle.config.ts` — PostgreSQL dialect, schema at `./src/integrations/drizzle/schema.ts`
- `tsconfig.json` — ES2022, strict mode, path alias `@/*` → `./src/*`
- `lingui.config.ts` — i18n extraction and locale configuration
- `components.json` — shadcn CLI configuration

### API Architecture

- **oRPC API** (`/api/rpc/*`) — Type-safe RPC with routers for: `ai`, `auth`, `resume`, `storage`, `printer`, `jobs`, `statistics`, `flags`. Three procedure types: `publicProcedure`, `protectedProcedure`, `serverOnlyProcedure`.
- **Better Auth API** (`/api/auth/*`) — OAuth, session management, social provider callbacks.
- **MCP Server** (`/mcp/`) — Model Context Protocol with OAuth Bearer tokens and API key auth. Exposes resumes as resources and tools for resume CRUD.

## Infrastructure Services

Before running the dev server, Docker must be running with at least PostgreSQL. Start services via `compose.dev.yml`:

```bash
sudo dockerd &>/var/log/dockerd.log &
sudo docker compose -f compose.dev.yml up -d postgres browserless
```

- **PostgreSQL** (port 5432) — required. The app auto-runs Drizzle migrations on startup via a Nitro plugin.
- **Browserless** (port 4000) — required for PDF export. Maps container port 3000 to host port 4000.

## Environment Variables

Copy `.env.example` to `.env` if not present. Key notes for local dev:

- `APP_URL` — local dev server origin on port 3000.
- `PRINTER_APP_URL` — must use the Docker bridge gateway IP (not localhost) so the Browserless container can reach the app on the host. Get the IP with: `sudo docker network inspect reactive_resume_default --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'`
- `PRINTER_ENDPOINT` — websocket URL to Browserless on host port 4000 with token `1234567890`.
- `DATABASE_URL` — PostgreSQL connection using `postgres:postgres` credentials on localhost:5432.
- S3/Storage and SMTP vars can be left empty — the app falls back to local filesystem and console-logged emails.

## Common Commands

`vp` is the global CLI for Vite+. Do not use pnpm/npm/yarn directly — Vite+ wraps the underlying package manager.

| Task                       | Command                                                         |
| -------------------------- | --------------------------------------------------------------- |
| Install dependencies       | `vp install`                                                    |
| Dev server (port 3000)     | `vp dev`                                                        |
| Lint (Oxlint, type-aware)  | `vp lint --type-aware`                                          |
| Format (Oxfmt)             | `vp fmt`                                                        |
| Check (lint + fmt + types) | `vp check`                                                      |
| Typecheck                  | `pnpm typecheck` (uses tsgo)                                    |
| Run tests                  | `vp test`                                                       |
| DB migrations              | `pnpm db:generate` / `pnpm db:migrate` (auto-runs on dev start) |
| DB studio                  | `pnpm db:studio`                                                |
| i18n extraction            | `pnpm lingui:extract`                                           |
| Add a dependency           | `vp add <package>`                                              |
| Remove a dependency        | `vp remove <package>`                                           |
| One-off binary             | `vp dlx <package>`                                              |
| Build for production       | `vp build`                                                      |
| Preview production build   | `vp preview`                                                    |
| Start production server    | `pnpm start`                                                    |

## Vite+ Pitfalls

- **Do not use pnpm/npm/yarn directly** for package operations — use `vp add`, `vp remove`, `vp install`, etc.
- **Do not run `vp vitest` or `vp oxlint`** — they don't exist. Use `vp test` and `vp lint`.
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly** — Vite+ bundles them.
- **Import from `vite-plus`**, not from `vite` or `vitest` directly (e.g., `import { defineConfig } from 'vite-plus'`).
- **Vite+ commands take precedence** over `package.json` scripts. If there's a naming conflict, use `vp run <script>`.
- **Use `vp dlx`** instead of `npx` or `pnpm dlx`.
- **Type-aware linting** works out of the box with `vp lint --type-aware` — no need to install `oxlint-tsgolint`.

## Gotchas

- The Docker daemon needs `fuse-overlayfs` storage driver and `iptables-legacy` in the cloud VM (nested container environment).
- `pnpm.onlyBuiltDependencies` in `package.json` controls which packages are allowed to run install scripts — no interactive `pnpm approve-builds` needed.
- Email verification is optional in dev — after signup, click "Continue" to skip.
- Vite and Nitro use beta/nightly builds. Occasional upstream issues may occur.

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
