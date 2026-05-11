# Coding Conventions

**Analysis Date:** 2026-05-11

This document is the canonical short-form reference for code style, structure, and feature-boundary rules in the Reactive Resume monorepo. The authoritative long-form reference lives in `AGENTS.md` at the repo root — when in doubt, defer to it.

## Tooling Stack

- **Formatter + linter:** Biome 2.x (`biome.json`). Pre-commit hook (`lefthook.yml`) runs `biome check --write --unsafe` on staged JS/TS/JSON files.
- **Type checker:** `tsgo --noEmit` (the `@typescript/native-preview` TS implementation) in every workspace package and `apps/web`. Use `pnpm typecheck` at the root or `pnpm --filter <pkg> typecheck` per package.
- **TypeScript base config:** `packages/config/tsconfig.base.json`, consumed by `tsconfig.json` at root and per-package `tsconfig.json` files.
- **Commit hook:** commitlint with `@commitlint/config-conventional` (`commitlint.config.cjs`). `body-max-line-length` is disabled.
- **Internal CLI:** `pnpm check` is **write-capable** (`biome check --write --unsafe .`). Use `biome check .` (no `--write`) for read-only inspection.

## Biome Configuration (`biome.json`)

**Formatter:**
- `lineWidth: 120`
- `indentStyle: "tab"`
- `javascript.formatter.quoteStyle: "double"`
- CSS parser has `tailwindDirectives: true`

**Linter rules (notable):**
- `recommended: true`
- `suspicious.noExplicitAny: "error"` — `any` is forbidden
- `suspicious.noArrayIndexKey: "off"`
- `correctness.useExhaustiveDependencies: "info"` (not an error)
- `style.useImportType: { level: "on", options: { style: "separatedType" } }` — `import type` is required when an import is type-only and must be on its own line (not inlined per-specifier)
- `style.noInferrableTypes: "error"` — drop redundant annotations like `const x: number = 1`
- `style.noUselessElse: "error"`
- `style.useSelfClosingElements: "error"`
- `style.useSingleVarDeclarator: "error"`
- `style.noParameterAssign: "error"`
- `style.useDefaultParameterLast: "error"`
- `nursery.useSortedClasses: { level: "warn", fix: "safe", functions: ["clsx", "cva", "cn"] }` — Tailwind class strings inside these wrappers are sorted automatically

**Import organization:** Biome's `assist.actions.source.organizeImports` is `on`, grouped in this order (`biome.json` lines 32-39):

1. Type-only imports (`{ "type": true }`)
2. Node built-ins (`":NODE:"`, excluding Bun)
3. Vitest + Testing Library (`vitest`, `vitest/**`, `@testing-library/**`)
4. External npm packages (`:PACKAGE:`, excluding `@reactive-resume/**`)
5. Internal workspace packages (`@reactive-resume/**`)
6. App-local aliases / relative paths (`:ALIAS:`, `:PATH:`)

A representative file that demonstrates the order: `packages/api/src/services/resume.ts` (type imports → node-free externals → `@reactive-resume/*` → relatives).

**Biome ignores:** `**/.turbo`, `**/.output`, `**/.vercel`, `**/.wrangler`, `**/coverage`, `**/reports`, `**/routeTree.gen.ts`.

## TypeScript Conventions

**Strictness flags** in `packages/config/tsconfig.base.json` are intentionally aggressive:

- `strict: true`
- `verbatimModuleSyntax: true` (pairs with Biome's `useImportType` enforcement)
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`
- `noUncheckedSideEffectImports: true`
- `noUnusedLocals: true`, `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `isolatedModules: true`, `moduleResolution: "bundler"`
- `target: "ESNext"`, `module: "ESNext"`

**Type-only imports:** Always use `import type { … }` on its own line when an import is only used in type positions. See `packages/api/src/services/resume.ts:1-5` and `packages/api/src/context.ts:1-2`.

**`any`:** Banned by Biome (`noExplicitAny: "error"`). Use `unknown` and narrow, or use a discriminated union.

**Path aliases (web app only):** `apps/web/tsconfig.json` declares:
- `@/*` → `./src/*`
- `@reactive-resume/ui/*` → `../../packages/ui/src/*` (build-time alias for direct source resolution)

Internal packages do NOT use `@/*` aliases — they import siblings via relative paths and cross-package code via the `@reactive-resume/*` export maps.

## Package Export Conventions (source-consumed packages)

**Internal packages export `src` files directly via `package.json` `exports`.** There is no per-package build step; consumers pick up the TS source through bundler/vitest resolution. Do not assume any `dist/` output.

Sample (`packages/utils/package.json`):

```json
{
    "name": "@reactive-resume/utils",
    "type": "module",
    "exports": {
        "./color": "./src/color.ts",
        "./date": "./src/date.ts",
        "./resume/docx": "./src/resume/docx/index.ts",
        "./resume/patch": "./src/resume/patch.ts",
        "./url-security.node": "./src/url-security.node.ts"
    }
}
```

**Conventions when adding cross-package exports:**

- Use **explicit subpath exports**, not wildcards in `@reactive-resume/utils`/`@reactive-resume/db`. Some packages (`@reactive-resume/api`) do use wildcards like `"./services/*"` — match the style of the package you're editing.
- Filenames ending in `.node.ts` (e.g. `packages/utils/src/url-security.node.ts`, `packages/utils/src/monorepo.node.ts`) are reserved for Node-only code that must not be imported from the browser bundle.
- Filename suffixes `.browser.tsx` (e.g. `apps/web/src/components/resume/preview.browser.tsx`) mark code that must stay out of SSR paths.

## React & Web App Conventions

**Routing:** TanStack Router with file-based routes under `apps/web/src/routes`.
- Each route file calls `createFileRoute("/path")({ … })` and exports `Route`. Example: `apps/web/src/routes/auth/login.tsx:18`.
- `apps/web/src/routeTree.gen.ts` is generated — never hand-edit it (also Biome-ignored).
- Server-only handlers live in `server.handlers` blocks on routes like `apps/web/src/routes/api/rpc.$.ts`, `apps/web/src/routes/api/auth.$.ts`, `apps/web/src/routes/api/health.ts`.
- Public resume route `apps/web/src/routes/$username/$slug.tsx` is `ssr: "data-only"`; nested builder preview is `ssr: false`.

**Router context** (`apps/web/src/router.tsx`) provides `queryClient`, `orpc`, `theme`, `locale`, `session`, and `flags`. Read them via `Route.useRouteContext()` rather than refetching.

**Components:**
- Functional components only. React 19.
- File naming: **kebab-case** for files and directories (e.g. `apps/web/src/components/command-palette/`, `packages/ui/src/components/alert-dialog.tsx`, `apps/web/src/dialogs/api-key/create.tsx`).
- Test file: `<name>.test.ts(x)` colocated with the implementation (e.g. `packages/ui/src/components/button.tsx` + `packages/ui/src/components/button.test.tsx`).
- shadcn/Base UI primitive components in `packages/ui/src/components/*.tsx` are exported via the `./components/*` subpath. Hooks via `./hooks/*`.

**Tailwind class strings:** Always wrap in `clsx`, `cva`, or `cn` so Biome's `useSortedClasses` rule can sort them safely.

## oRPC Conventions (`packages/api`)

- **Procedures:** Build new procedures with `publicProcedure` or `protectedProcedure` from `packages/api/src/context.ts:79-99`. `protectedProcedure` adds the authenticated `User` to context and throws `ORPCError("UNAUTHORIZED")` otherwise; prefer it for anything authenticated.
- **Routers** live in `packages/api/src/routers/*.ts` and are composed in `packages/api/src/routers/index.ts` (`ai`, `auth`, `flags`, `resume`, `statistics`, `storage`). Each router file may export sub-routers internally (see `tagsRouter`, `statisticsRouter`, `analysisRouter`, `updatesRouter` in `packages/api/src/routers/resume.ts`).
- **Business logic** belongs in `packages/api/src/services/*.ts`. Handlers must stay thin: validate input, call a service, return its output. Example pattern: `packages/api/src/routers/resume.ts:24-26` calls `resumeService.tags.list(...)`.
- **DTOs / IO schemas** live in `packages/api/src/dto/*.ts` and are imported as `resumeDto.<op>.input` / `resumeDto.<op>.output`.
- **Errors:** Declare typed errors with `.errors({ CODE: { message, status } })` on the procedure (see `packages/api/src/routers/resume.ts:282-291`). Throw `new ORPCError("CODE")` inside services. The web side translates codes to user-facing strings in `apps/web/src/libs/error-message.ts`.
- **Route metadata:** Every procedure declares `.route({ method, path, tags, operationId, summary, description, successDescription })` so the OpenAPI/MCP endpoints stay accurate.
- **Rate limiting:** Apply via `.use(resumeMutationRateLimit)` / `.use(resumePasswordRateLimit)` from `packages/api/src/middleware/rate-limit`.
- **Web exposure:** Routers are mounted at `/api/rpc` by `apps/web/src/routes/api/rpc.$.ts`. The isomorphic client lives at `apps/web/src/libs/orpc/client.ts` — server-side calls use the in-process router client and browser calls hit `/api/rpc` with credentials.

## Drizzle Conventions (`packages/db`)

- **Schema location:** `packages/db/src/schema/*.ts`. Tables exported from `packages/db/src/schema/index.ts`.
- **Client:** `packages/db/src/client.ts`, exported as `@reactive-resume/db/client`.
- **Migrations:** Generated to **`migrations/` at the repo root** by `drizzle-kit generate`. Use `pnpm db:generate` after schema changes.
- **`DATABASE_URL` handling:** `drizzle-kit` does **not** auto-load `.env`. Always export `DATABASE_URL` in the shell (or prefix the command) before running `pnpm db:generate` / `pnpm db:migrate`.
- **Runtime migration:** `apps/web/plugins/1.migrate.ts` runs migrations on Nitro startup, so `pnpm db:migrate` is mostly used for first-time setup or debugging.
- **Patterns observed in `packages/db/src/schema/resume.ts`:**
  - Primary keys use `pg.text("id").$defaultFn(() => generateId())` (UUIDv7 from `@reactive-resume/utils/string`).
  - `createdAt` / `updatedAt` use `withTimezone: true`, `.defaultNow()`, and `$onUpdate(() => new Date())`.
  - JSONB columns get `.$type<T>()` for end-to-end typing.
  - Composite uniques/indexes are declared in the table's tuple callback.
  - Foreign keys use `onDelete: "cascade"`.

## Schema-First Change Workflow

When changing resume data shape, propagate in this order (per `AGENTS.md`):

1. **`packages/schema/src/resume/*.ts`** — Zod schemas and types (entry point).
2. **`packages/api/src/dto/*.ts`** — API DTOs that re-use those schemas.
3. **`packages/import/src/*.tsx`** — importers (`json-resume`, `reactive-resume-json`, `reactive-resume-v4-json`).
4. **`packages/pdf/src/templates/**`** — PDF rendering for every template (`azurill`, `bronzor`, `chikorita`, `ditgar`, `ditto`, `gengar`, `glalie`, `kakuna`, `lapras`, `leafish`, `meowth`, `onyx`, `pikachu`, `rhyhorn`). Shared filtering: `packages/pdf/src/templates/shared/filtering.ts`.
5. **`apps/web/src/`** — builder forms and any consumer hooks.

Adding/renaming a template requires changes in `packages/schema/src/templates.ts`, `packages/pdf/src/templates/index.ts`, the template directory `packages/pdf/src/templates/<name>/`, and static previews under `apps/web/public/templates/{jpg,pdf}/`.

## Error Handling Patterns

- **Services:** Throw `new ORPCError("CODE")` (e.g. `NOT_FOUND`, `UNAUTHORIZED`, custom `RESUME_LOCKED`). Example: `packages/api/src/services/resume.ts:54`.
- **Routers:** Declare expected codes via `.errors({ … })` so callers get typed error narrowing.
- **Auth helpers** in `packages/api/src/context.ts:14-55` catch verification errors and `console.warn(...)` rather than throwing, returning `null` so the caller can fall through to the next auth method.
- **Web side:** `apps/web/src/libs/error-message.ts` exposes `getReadableErrorMessage`, `getOrpcErrorMessage`, and `getResumeErrorMessage` for translating raw errors into UI-safe strings. Pair with `sonner` toasts (see `apps/web/src/routes/auth/login.tsx:45-64`).

## Logging

- No dedicated logging framework. Use `console.warn` / `console.error` for diagnostic output, scoped tightly (see `packages/api/src/context.ts:25`).
- Server logs are also where dev-mode email verification links surface when SMTP is unconfigured.

## i18n & Translations (Lingui)

- **Library:** `@lingui/core`, `@lingui/react` with the babel macro plugin enabled in `apps/web/vitest.config.ts` and Vite config.
- **Config:** `apps/web/lingui.config.ts` — source locale `en-US`, pseudo locale `zu-ZA`, 50+ supported locales. Catalogs live in `apps/web/locales/{locale}.po`.
- **Usage:**
  - Import macros: `import { t } from "@lingui/core/macro"` and `import { Trans } from "@lingui/react/macro"` (`apps/web/src/routes/auth/login.tsx:1-2`).
  - Wrap displayed text in `<Trans>...</Trans>` for JSX or `` t`...` `` / `t({ message, comment })` for strings.
  - Provide `comment:` for ambiguous fallback strings (see `login.tsx:57-60`).
- **Extraction:** `pnpm lingui:extract` (turbo task in `apps/web`). Crowdin sync runs via `.github/workflows/crowdin-sync.yml`.

## Comments Policy

Comments stay short and explain **why**, not what. Patterns observed:

- One-line `//` comments before a non-obvious decision (`vitest.setup.ts:5-7` explains why `cleanup()` is registered manually; `packages/utils/src/monorepo.node.test.ts:11` explains the `realpathSync` call).
- JSDoc/TSDoc only on cross-package public functions where intent matters (e.g. `packages/api/src/context.ts:57-63` documents `resolveUserFromRequestHeaders`).
- Inline `/* @__PURE__ */` annotations on `$onUpdate(() => new Date())` in Drizzle schemas (`packages/db/src/schema/resume.ts:36`).
- No commented-out code in commits.

## Git Hooks & Commit Style

**Lefthook (`lefthook.yml`):**

```yaml
pre-commit:
  parallel: true
  jobs:
    - name: lint and format
      glob: "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}"
      run: pnpm biome check --write --unsafe --no-errors-on-unmatched --files-ignore-unknown=true {staged_files}
      stage_fixed: true

commit-msg:
  jobs:
    - name: commitlint
      run: pnpm commitlint --edit {1}
```

The pre-commit hook **rewrites staged files** with Biome fixes (`stage_fixed: true`). Run `pnpm check` before staging to avoid surprises.

**Commit messages:** Conventional Commits (`commitlint.config.cjs` extends `@commitlint/config-conventional`). Examples from `git log`:

- `feat: implement an AI chat window for agentic resume building`
- `fix(pdf): register CJK fallback font so Chinese/Japanese/Korean text renders correctly`
- `fix(lapras): adjust lapras border color to fixed gray`
- `chore: migrate from jsdom to happy-dom for testing environment`
- `docs: update AGENTS.md with detailed codebase structure`
- `test: add unit and component tests across the monorepo`
- `chore(release): v5.1.2`

Allowed types: `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `perf`, `build`, `ci`, `revert`. Scope is optional and lowercase. `body-max-line-length` is disabled, so long PR bodies are fine.

## CI Workflows

- **`.github/workflows/autofix.yml`** runs on every PR and push to `main`: `pnpm install --frozen-lockfile` → `pnpm knip --fix` (prune unused deps) → `pnpm check` (Biome) → `autofix-ci/action` opens fix commits.
- **`.github/workflows/docker-build.yml`** is `workflow_dispatch` only, builds multi-arch Docker images.
- **`.github/workflows/crowdin-sync.yml`** syncs translation catalogs.
- There is no CI workflow that runs `pnpm test` today. Tests run locally via `pnpm test` / `pnpm test:ci` and through turbo's `test:agent` reporter for agent-driven runs.

## Function & Module Design

- **Function size:** Most service functions stay under ~40 lines. Bigger flows (e.g. `resumeService.patch`) are decomposed into helpers in `packages/api/src/helpers/*` and `packages/api/src/services/resume-events.ts`.
- **Parameters:** Service helpers consistently take a single object argument (`async ({ id, userId })`) rather than positional args. See `packages/api/src/services/resume.ts:27,41,65`.
- **Return values:** Services return plain typed objects; routers shape the response via `.output(schema)` so Zod validates at the boundary.
- **Module boundaries:**
  - Cross-package imports must go through declared `exports` subpaths. Reaching into `packages/<x>/src/internal-file` directly is not allowed.
  - `packages/utils` exports are narrowly scoped — if you need a new helper for another package, add a new explicit subpath in `packages/utils/package.json`.
  - `packages/runtime-externals` and `packages/scripts` are support packages; avoid importing them into runtime code.

---

*Convention analysis: 2026-05-11*
