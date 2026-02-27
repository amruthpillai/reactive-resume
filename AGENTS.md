# AGENTS.md

## Cursor Cloud specific instructions

### Overview

Reactive Resume is a single-package full-stack TypeScript app (not a monorepo) built with TanStack Start (React 19, Vite, Nitro). It serves both frontend and API on port 3000.

### Infrastructure services

Before running the dev server, Docker must be running with at least PostgreSQL. Start services via `compose.dev.yml`:

```bash
sudo dockerd &>/var/log/dockerd.log &
sudo docker compose -f compose.dev.yml up -d postgres browserless
```

- **PostgreSQL** (port 5432) — required. The app auto-runs Drizzle migrations on startup via a Nitro plugin.
- **Browserless** (port 4000) — required for PDF export. Maps container port 3000 to host port 4000.

### Environment variables

Copy `.env.example` to `.env` if not present. Key notes for local dev:

- `APP_URL` — local dev server origin on port 3000.
- `PRINTER_APP_URL` — must use the Docker bridge gateway IP (not localhost) so the Browserless container can reach the app on the host. Get the IP with: `sudo docker network inspect reactive_resume_default --format '{{range .IPAM.Config}}{{.Gateway}}{{end}}'`
- `PRINTER_ENDPOINT` — websocket URL to Browserless on host port 4000 with token `1234567890`.
- `DATABASE_URL` — PostgreSQL connection using `postgres:postgres` credentials on localhost:5432.
- S3/Storage and SMTP vars can be left empty — the app falls back to local filesystem and console-logged emails.

### Common commands

See `scripts` in `package.json`. Key ones:

| Task | Command |
|---|---|
| Dev server | `pnpm dev` (port 3000) |
| Lint (Biome) | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| DB migrations | `pnpm db:generate` / `pnpm db:migrate` (auto-runs on dev start) |

### Gotchas

- The Docker daemon needs `fuse-overlayfs` storage driver and `iptables-legacy` in the cloud VM (nested container environment).
- `pnpm.onlyBuiltDependencies` in `package.json` controls which packages are allowed to run install scripts — no interactive `pnpm approve-builds` needed.
- Email verification is optional in dev — after signup, click "Continue" to skip.
- Vite 8 is beta (`^8.0.0-beta.15`); Nitro uses a nightly build. Occasional upstream issues may occur.
