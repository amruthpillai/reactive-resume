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

| Task           | Command                                                         |
| -------------- | --------------------------------------------------------------- |
| Dev server     | `pnpm dev` (port 3000)                                          |
| Lint (Oxlint)  | `pnpm lint`                                                     |
| Format (Oxfmt) | `pnpm fmt`                                                      |
| Typecheck      | `pnpm typecheck`                                                |
| DB migrations  | `pnpm db:generate` / `pnpm db:migrate` (auto-runs on dev start) |

### Gotchas

- The Docker daemon needs `fuse-overlayfs` storage driver and `iptables-legacy` in the cloud VM (nested container environment).
- `pnpm.onlyBuiltDependencies` in `package.json` controls which packages are allowed to run install scripts — no interactive `pnpm approve-builds` needed.
- Email verification is optional in dev — after signup, click "Continue" to skip.
- Vite 8 is beta (`^8.0.0-beta.15`); Nitro uses a nightly build. Occasional upstream issues may occur.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ commands take precedence over `package.json` scripts. If there is a `test` script defined in `scripts` that conflicts with the built-in `vp test` command, run it using `vp run test`.
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.

<!--VITE PLUS END-->
