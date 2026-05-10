# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Reactive Resume is a pnpm monorepo (Turborepo) with a single full-stack web app at `apps/web` (TanStack Start / React 19 / Vite) and ~15 internal packages under `packages/`. It runs as a single Node.js process on port 3000.

### Prerequisites

- **Node.js 24** (matches Dockerfile `ARG NODE_VERSION=24`). Use `nvm install 24 && nvm use 24` if needed.
- **Docker** is required to run PostgreSQL. Start it with `sudo dockerd &` if the daemon isn't running.
- **pnpm 11** is managed via corepack (`corepack enable`).

### Database

PostgreSQL runs via Docker Compose:

```
sudo docker compose -f compose.dev.yml up -d postgres
```

The dev default connection string is `postgresql://postgres:postgres@localhost:5432/postgres`.

**Important**: `drizzle-kit` (used by `pnpm db:migrate`) reads `DATABASE_URL` from `process.env` directly — it does **not** auto-load the `.env` file. You must `export DATABASE_URL=...` before running migration commands, or set it in your shell profile.

### Environment

Copy `.env.example` to `.env`. The three required variables are:

- `APP_URL` (default `http://localhost:3000`)
- `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/postgres`)
- `AUTH_SECRET` (any non-empty string)

S3/SeaweedFS is optional — if S3 vars are omitted or commented out, the app uses local filesystem storage under `<workspace>/data`.

### Common commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install` |
| Run migrations | `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" pnpm db:migrate` |
| Dev server | `pnpm dev` (starts on port 3000) |
| Lint/format | `pnpm check` (Biome) |
| Tests | `pnpm test` (Vitest) |
| Build | `pnpm build` |
| Typecheck | `pnpm typecheck` |

### Gotchas

- The dev server (`pnpm dev`) auto-runs migrations on startup via Nitro, so `pnpm db:migrate` is only strictly needed for first-time setup or after pulling new migration files.
- Email sending requires SMTP config; without it, emails are logged to console. This is fine for dev — the app still functions, but email verification links appear in server logs.
- The `lefthook.yml` pre-commit hook runs `biome check` on staged files. Run `pnpm check` before committing to avoid hook failures.
