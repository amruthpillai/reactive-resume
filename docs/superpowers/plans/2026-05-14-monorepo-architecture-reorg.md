# Monorepo Architecture Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Status note:** This implementation plan has been executed and may contain historical intermediate paths. Use `AGENTS.md`, `docs/contributing/architecture.mdx`, `docs/adr/0001-workspace-boundaries.md`, and `docs/superpowers/handoffs/2026-05-14-monorepo-architecture-reorg.md` for current architecture guidance.

**Goal:** Reorganize Reactive Resume into clear domain/package boundaries so server, web, API, MCP, PDF, resume-domain logic, and documentation are easier to debug and enforce.

**Architecture:** This is one PR with green internal commits. Packages expose role-based explicit public surfaces, web routes become thin shells over domain features, API code is colocated by feature/capability, and boundary rules prevent app-to-app source imports and private package source imports.

**Tech Stack:** pnpm 11, Turborepo 2, TypeScript/tsgo, Vite, React 19, TanStack Router, oRPC, Drizzle, React PDF, PDF.js, MCP SDK, Biome/GritQL, Vitest.

---

## Non-Negotiable Decisions

- Root `AGENTS.md` is the single normative architecture source of truth.
- `docs/adr/0001-workspace-boundaries.md` records rationale only; it must not duplicate the full operational rule set.
- `docs/contributing/architecture.mdx` is a descriptive overview, not a second source of truth.
- Keep one PR and green internal commits; no compatibility wrappers or old import-path shims.
- Preserve existing unrelated user changes in manifests and lockfile. Do not reset or revert them.
- Keep `apps/server` and `apps/web` split. `apps/server` may serve `apps/web/dist`; app-to-app `src` imports are banned.
- `apps/web` may import `packages/api` types only. Runtime imports from `packages/api` in web are banned.
- `apps/server` may import explicit runtime exports from `packages/api`.
- Tests remain colocated with moved code.

## Task 0: Coordination Artifacts

**Files:**
- Modify: `docs/superpowers/plans/2026-05-14-monorepo-architecture-reorg.md`
- Modify: `docs/superpowers/handoffs/2026-05-14-monorepo-architecture-reorg.md`
- Modify: `docs/superpowers/worklogs/2026-05-14-monorepo-architecture-reorg.md`

- [ ] Keep this plan updated when implementation discoveries force refinements.
- [ ] Keep the handoff file focused on current task ownership and next-agent startup context.
- [ ] Keep the worklog append-only with commands, validation results, blockers, and changed ownership decisions.

## Task 1: Pure Resume Domain Package

**Goal:** Create `@reactive-resume/resume` for pure resume-domain behavior, keeping `@reactive-resume/schema` validation-only and `@reactive-resume/utils` generic.

**Files:**
- Create: `packages/resume/package.json`
- Create: `packages/resume/tsconfig.json`
- Create: `packages/resume/vitest.config.ts`
- Move/create: `packages/resume/src/patch.ts`
- Move/create: `packages/resume/src/icons.ts`
- Move tests from `packages/utils/src/resume/patch.test.ts`
- Move tests for `packages/utils/src/network-icons.test.ts`
- Modify importers/callers currently using `@reactive-resume/utils/resume/patch`
- Modify importers/callers currently using `@reactive-resume/utils/network-icons`
- Modify `packages/utils/package.json`
- Modify root workspace manifests/lockfile as needed

- [x] Create the new package using the repo's source-consumed package pattern.
- [x] Move JSON Patch schema/types/application/comparison/error into `@reactive-resume/resume/patch`.
- [x] Move social network to icon-name mapping into `@reactive-resume/resume/icons`.
- [x] Update all runtime and test imports.
- [x] Remove `@reactive-resume/schema` dependency from `@reactive-resume/utils`.
- [x] Run `pnpm --filter @reactive-resume/resume test`.
- [x] Run `pnpm --filter @reactive-resume/resume typecheck`.
- [x] Run targeted typechecks for known consumers: `@reactive-resume/api`, `@reactive-resume/ai`, `web`.

## Task 2: DOCX Package

**Goal:** Create `@reactive-resume/docx` as the dedicated DOCX export package.

**Files:**
- Create: `packages/docx/package.json`
- Create: `packages/docx/tsconfig.json`
- Create: `packages/docx/vitest.config.ts`
- Move: `packages/utils/src/resume/docx/*` to `packages/docx/src/*`
- Modify web export callers currently using `@reactive-resume/utils/resume/docx`
- Modify package dependencies/lockfile

- [x] Create `@reactive-resume/docx` with explicit export `"."` or `"./builder"` as appropriate.
- [x] Move DOCX implementation and tests unchanged except import paths.
- [x] Update web callers to import DOCX export from `@reactive-resume/docx`.
- [x] Remove DOCX dependencies from `@reactive-resume/utils` if no longer used there.
- [x] Run `pnpm --filter @reactive-resume/docx test`.
- [x] Run `pnpm --filter @reactive-resume/docx typecheck`.
- [x] Run focused web export tests/typecheck.

## Task 3: PDF Package Browser/Server Generation Surface

**Goal:** Keep `@reactive-resume/pdf` focused on document/template/font rendering and pure generation adapters. Do not move PDF.js viewer UI into the PDF package.

**Files:**
- Create: `packages/pdf/src/browser.tsx`
- Create: `packages/pdf/src/server.tsx`
- Modify: `packages/pdf/package.json`
- Modify: web PDF generation callers currently using `apps/web/src/libs/resume/pdf-document.tsx`
- Modify: `apps/server`/API PDF download code after Task 5

- [x] Add data-plus-options generation APIs:
  - `createResumePdfBlob({ data, template, resolveSectionTitle })`
  - `createResumePdfFile({ data, filename, template, resolveSectionTitle })`
- [x] Keep Lingui locale loading in `apps/web`; pass `resolveSectionTitle` into PDF helpers.
- [x] Keep `ResumeDocument` as the underlying render surface.
- [x] Add/update tests for the browser/server helpers where practical.
- [x] Run `pnpm --filter @reactive-resume/pdf test`.
- [x] Run `pnpm --filter @reactive-resume/pdf typecheck`.

## Task 4: MCP Package and Shared Tool Contracts

**Goal:** Extract MCP implementation from web route helpers into `@reactive-resume/mcp`; share model-facing tool contracts from `@reactive-resume/ai`.

**Files:**
- Create: `packages/mcp/package.json`
- Create: `packages/mcp/tsconfig.json`
- Create: `packages/mcp/vitest.config.ts`
- Move: `apps/web/src/routes/mcp/-helpers/*` to `packages/mcp/src/*`
- Create/modify: `packages/ai/src/tools/resume-tool-contracts.ts`
- Modify: `packages/ai/package.json`
- Modify: `apps/server/src/handlers/mcp.ts`
- Modify: `apps/server/src/handlers/metadata.ts`
- Remove old web helper imports

- [x] Move MCP tools/prompts/resources/metadata card generation and tests into `@reactive-resume/mcp`.
- [x] Keep MCP execution through an injected/in-process oRPC `RouterClient`.
- [x] Rename MCP tools to canonical unprefixed snake_case names such as `list_resumes`, `read_resume`, `apply_resume_patch`.
- [x] Do not keep old `reactive_resume_*` aliases.
- [x] Use shared base tool contracts from `@reactive-resume/ai`, with MCP-specific schema extensions for explicit context fields such as `resumeId`.
- [ ] Update MCP docs/card version and cache-refresh guidance later in documentation tasks.
- [x] Run `pnpm --filter @reactive-resume/mcp test`.
- [x] Run `pnpm --filter @reactive-resume/mcp typecheck`.
- [x] Run `pnpm --filter server typecheck`.

## Task 5: API Feature Reorganization

**Goal:** Move `packages/api/src` from technical layers into feature/capability modules with explicit public exports.

**Files:**
- Reorganize under `packages/api/src/features/*`
- Modify: `packages/api/src/routers/index.ts`
- Modify: `packages/api/package.json`
- Modify consumers in `apps/server`, `apps/web` type imports, and packages

- [x] Split `features/agent` into `threads`, `messages`, `attachments`, `actions`, `runs`, and `tools`.
- [x] Split `features/resume` by capability: `crud`, `tags`, `statistics`, `analysis`, `access`, `events`, `sharing`, `export`.
- [x] Move authenticated PDF download procedure into `features/resume/export`; it calls `@reactive-resume/pdf/server`.
- [x] Keep Drizzle schema centralized in `packages/db`; API features consume schema but do not own table definitions.
- [x] Remove `./services/*` and `./helpers/*` wildcard exports.
- [x] Add explicit runtime exports required by `apps/server`.
- [x] Preserve `apps/web` API imports as type-only.
- [x] Run `pnpm --filter @reactive-resume/api test`.
- [x] Run `pnpm --filter @reactive-resume/api typecheck`.
- [x] Run `pnpm --filter server typecheck`.
- [x] Run `pnpm --filter web typecheck`.

## Task 6: Server Adapter Reorganization

**Goal:** Make `apps/server` read as a runtime adapter app.

**Files:**
- Reorganize `apps/server/src` into `http`, `rpc`, `mcp`, `openapi`, `static`, `startup`
- Modify: `apps/server/src/index.ts`
- Modify: `apps/server/package.json` if imports/dependencies change

- [x] Move handlers into adapter folders.
- [x] Keep server logic thin: auth/session/HTTP transport/static serving/startup.
- [x] Use explicit API runtime exports only.
- [x] Keep serving `apps/web/dist` allowed.
- [x] Run `pnpm --filter server test`.
- [x] Run `pnpm --filter server typecheck`.

## Task 7: Domain-First Web Reorganization

**Goal:** Move web code into domain/workflow feature trees so routes become thin shells.

**Files:**
- Create/reorganize under `apps/web/src/features/resume/*`
- Create/reorganize under `apps/web/src/features/{command-palette,theme,locale,user,auth,settings,dialogs}/*`
- Modify route imports and tests

- [x] Move resume domain code into workflow folders:
  - `builder`
  - `preview`
  - `public`
  - `dialogs`
  - `sections`
  - `templates`
  - `export`
  - `pdf-viewer`
- [x] Move PDF.js viewer/canvas UI into web resume feature, not `@reactive-resume/pdf`.
- [x] Keep route files responsible for URL params, loaders, redirects, SSR settings, and composition.
- [x] Leave `apps/web/src/components` with generic app-level primitives/screens only.
- [x] Move app shell concerns into separate features: command palette, theme, locale, user.
- [x] Move auth workflows into `features/auth` and settings sections into `features/settings`.
- [x] Run focused moved tests.
- [x] Run `pnpm --filter web typecheck`.

Slice 1 notes:

- Moved resume builder draft state, builder preview, PDF.js canvas preview, dashboard thumbnail PDF rendering helpers, public resume PDF viewer, and web-local PDF document wrappers under `apps/web/src/features/resume/*`.
- Removed `apps/web/src/components/resume` and `apps/web/src/routes/$username/-components`; the public resume route now lazy-loads from `features/resume/public`.
- Kept PDF.js viewer/canvas code in `apps/web/src/features/resume` and left `@reactive-resume/pdf` limited to PDF generation helpers.
- Broader Task 7 remains open for non-resume web feature moves and deeper dialog registry work owned by Task 8.

Slice 2 notes:

- Moved command palette, theme, locale, and user shell components/tests from `apps/web/src/components/*` to `apps/web/src/features/{command-palette,theme,locale,user}` and updated consumers.
- Moved auth route UI, layout, and social auth component into `apps/web/src/features/auth`, leaving auth route files as guard/search/composition wrappers.
- Moved settings page UI and authentication/integration subcomponents into `apps/web/src/features/settings`, leaving settings route files as dashboard-header/composition wrappers; `job-search` stayed route-only because it is already a redirect shim.
- `apps/web/src/components` now contains only the remaining generic primitive/screen folders.
- Task 8 still owns dialog registry decomposition; this slice only updated imports around existing dialog usage.

## Task 8: Dialog Registry Rework

**Goal:** Keep one central dialog runtime but make domain modules own their dialog definitions/renderers.

**Files:**
- Modify/create under `apps/web/src/features/dialogs`
- Modify/create domain dialog registry modules under relevant features
- Modify root dialog manager import

- [x] Replace the single giant discriminated union/manager import hub with composable domain registries.
- [x] Keep one global dialog store/runtime.
- [x] Each domain exports its schema entries and renderers.
- [x] Preserve existing dialog behavior and tests.
- [x] Run dialog-focused tests.
- [x] Run `pnpm --filter web typecheck`.

## Task 9: Boundary Enforcement

**Goal:** Make architectural rules executable.

**Files:**
- Modify: `turbo.json`
- Modify: `biome.json`
- Create: `tooling/grit/no-cross-workspace-src-imports.grit`
- Modify package manifests/tsconfigs to remove forbidden direct source path aliases

- [x] Add `turbo boundaries` package/runtime rules.
- [x] Add a Biome GritQL plugin/rule for forbidden cross-workspace `src` imports and path aliases.
- [x] Enforce subpath runtime tags: root exports environment-neutral; browser/server code behind explicit subpaths.
- [x] Allow wildcard exports only for role-approved leaf libraries such as UI components/hooks.
- [x] Run `pnpm exec turbo boundaries`.
- [x] Run a focused Biome boundary check.

## Task 10: Documentation and Source of Truth

**Goal:** Document the final architecture without duplicating rules in multiple places.

**Files:**
- Modify: `AGENTS.md`
- Create: `docs/adr/0001-workspace-boundaries.md`
- Modify: `docs/contributing/architecture.mdx`
- Modify: `docs/guides/using-the-mcp-server.mdx` if MCP tool names change
- Modify: `docs/guides/ai-agent-tools.mdx` if shared tool naming changes

- [x] Update root `AGENTS.md` with the normative workspace map, import rules, package roles, runtime tags, validation commands, and placement decision tree.
- [x] Add ADR rationale for boundaries and rejected alternatives.
- [x] Refresh public architecture docs as overview only.
- [x] Update MCP docs to mention canonical unprefixed tool names and client refresh/cache-clear guidance.
- [x] Avoid local package READMEs for architecture rules unless unavoidable.
- [x] Run docs-related checks available in the repo.

## Task 11: Final Validation and Handoff

**Goal:** Finish with a validated branch and external-agent-ready handoff.

**Files:**
- Modify: `docs/superpowers/handoffs/2026-05-14-monorepo-architecture-reorg.md`
- Modify: `docs/superpowers/worklogs/2026-05-14-monorepo-architecture-reorg.md`

- [x] Run focused checks listed in earlier tasks.
- [ ] Run final repo checks:
  - `pnpm install --lockfile-only`
  - `pnpm exec biome check .`
  - `pnpm exec turbo boundaries`
  - `pnpm knip`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- [x] Update the handoff with completed tasks, remaining risks, commands run, and useful file paths.
- [x] Dispatch final review if subagents are available.
