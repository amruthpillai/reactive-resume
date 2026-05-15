# Monorepo Architecture Reorg Handoff

This handoff is the coordination entrypoint for the Reactive Resume architecture reorganization. It intentionally references the implementation plan instead of duplicating it.

## Primary Plan

- Plan: `docs/superpowers/plans/2026-05-14-monorepo-architecture-reorg.md`
- Worklog: `docs/superpowers/worklogs/2026-05-14-monorepo-architecture-reorg.md`
- Branch at start: `feat/explore-hono-orpc-migration`

## Current Operating Rules

- Preserve existing unrelated local changes:
  - `apps/server/package.json`
  - `package.json`
  - `packages/api/package.json`
  - `packages/env/package.json`
  - `packages/utils/package.json`
  - `pnpm-lock.yaml`
- Do not use `git reset --hard` or destructive checkout commands.
- Use green internal commits if committing is requested/appropriate.
- Use root `AGENTS.md` as the final normative architecture source of truth.
- Do not create local package READMEs for architecture rules unless a package has unavoidable operational constraints.

## Suggested Skills for Future Agents

- `subagent-driven-development` for executing one task slice with review gates.
- `executing-plans` for sequential execution from the plan.
- `documentation-writer` for `AGENTS.md`, ADR, and public architecture docs.
- `handoff` when pausing or delegating a task outside Codex.
- `turborepo` when editing `turbo.json`, package tags, or task graph rules.
- `context7-mcp` if checking current docs for library/framework behavior.

## Delegation Guidance

External agents should be handed exactly one task from the plan plus this handoff path. They should report:

- Status: `DONE`, `DONE_WITH_CONCERNS`, `BLOCKED`, or `NEEDS_CONTEXT`
- Files changed
- Tests/commands run
- Any plan deviations
- Follow-up tasks needed

## Task Ownership Status

- Task 0 Coordination Artifacts: done
- Task 1 Pure Resume Domain Package: done
- Task 2 DOCX Package: done
- Task 3 PDF Package Browser/Server Generation Surface: done
- Task 4 MCP Package and Shared Tool Contracts: done
- Task 5 API Feature Reorganization: done
- Task 6 Server Adapter Reorganization: done
- Task 7 Domain-First Web Reorganization: done
- Task 8 Dialog Registry Rework: done
- Task 9 Boundary Enforcement: done
- Task 10 Documentation and Source of Truth: done
- Task 11 Final Validation and Handoff: done

## Architecture Decisions Already Locked

- `@reactive-resume/schema` is Zod/types only.
- `@reactive-resume/resume` owns pure resume-domain behavior.
- `@reactive-resume/ai` owns model contracts, not DB-backed agent runtime.
- Agent runtime remains in `packages/api/features/agent`.
- MCP uses an in-process oRPC `RouterClient`.
- MCP tools move to canonical unprefixed snake_case names, no old aliases.
- `@reactive-resume/pdf` owns PDF generation helpers but not PDF.js viewer UI.
- `apps/web` uses domain-first features and generic-only `src/components`.
- `packages/db` remains centralized.

## Latest Task 1 Result

- Created `@reactive-resume/resume` with source-consumed exports:
  - `@reactive-resume/resume/patch`
  - `@reactive-resume/resume/icons`
- Moved JSON Patch behavior/tests and social network icon mapping/tests out of `@reactive-resume/utils`.
- Updated consumers in `packages/ai`, `packages/api`, `packages/db`, `packages/import`, and `apps/web`.
- Removed old utils exports for `./resume/patch` and `./network-icons`.
- Removed `fast-json-patch` from `@reactive-resume/utils` and `@reactive-resume/ai`; it now belongs to `@reactive-resume/resume`.
- Task 2 later removed `@reactive-resume/schema` from `@reactive-resume/utils` after moving DOCX code into `@reactive-resume/docx`.

## Latest Task 2 Result

- Created `@reactive-resume/docx` with source-consumed root export `@reactive-resume/docx`.
- Moved the DOCX builder, HTML conversion, link utilities, section renderers, and colocated tests from `packages/utils/src/resume/docx` to `packages/docx/src`.
- Updated web DOCX export callers and the export-section test mock to import from `@reactive-resume/docx`.
- Removed the old `@reactive-resume/utils/resume/docx` export and removed `docx` plus `@reactive-resume/schema` from `@reactive-resume/utils`.
- Validation passed for `@reactive-resume/docx` tests/typecheck, `@reactive-resume/utils` typecheck, `web` typecheck, focused web export test command, and focused Biome check.

## Latest Task 3 Notes

- Added `@reactive-resume/pdf/browser` and `@reactive-resume/pdf/server` exports.
- `createResumePdfBlob({ data, template, resolveSectionTitle })` delegates to `pdf(<ResumeDocument ... />).toBlob()`.
- `createResumePdfFile({ data, filename, template, resolveSectionTitle })` delegates to `renderToBuffer(<ResumeDocument ... />)` and preserves the existing `File` response body shape.
- Lingui locale loading stays in the web-local wrappers under `apps/web/src/features/resume/export`; those wrappers resolve section titles and pass `resolveSectionTitle` into the package helpers.
- The PDF.js viewer/canvas components remain in web. `apps/web/src/features/resume/preview/preview.browser.tsx` now calls the web-local blob wrapper instead of importing `@react-pdf/renderer` directly.
- The authenticated PDF export path now reaches `@reactive-resume/pdf/server` through `packages/api/src/features/resume/export.ts`; `apps/server` consumes the explicit API feature export instead of owning PDF rendering logic directly.
- Validation passed for `@reactive-resume/pdf` tests/typecheck, `web` typecheck, `server` typecheck, focused web PDF export/viewer tests, and focused Biome check.

## Latest Task 4 Notes

- Created `@reactive-resume/mcp` with source-consumed exports for the compact public surface plus direct subpaths for server card, tool names, tools, prompts, and resources.
- Moved MCP tools, prompts, resources, server-card generation, tool annotations, and colocated tests from `apps/web/src/routes/mcp/-helpers` to `packages/mcp/src`.
- `apps/server/src/mcp/handler.ts` and `apps/server/src/openapi/metadata.ts` now import from `@reactive-resume/mcp`; server-side MCP execution still uses the injected in-process oRPC `RouterClient`.
- Canonical MCP tool names are unprefixed snake_case. Key renames: `read_resume` replaces the old get-resume tool name, and `apply_resume_patch` replaces the old patch tool name. No `reactive_resume_*` aliases remain.
- Added `@reactive-resume/ai/tools/resume-tool-contracts` and reused its JSON Patch operations schema from MCP while keeping MCP-specific `id` context in the MCP input schema.
- Validation passed for `@reactive-resume/mcp` tests/typecheck, `server` typecheck, `@reactive-resume/ai` typecheck, focused Biome check, and the app-to-app import scan.

## Latest Task 5 Notes

- `packages/api/src` is now organized by feature/capability under `packages/api/src/features`.
- The root router still exports the same top-level API contract from `packages/api/src/routers/index.ts`, but it imports feature routers from `features/*/router`.
- Agent modules now live under `features/agent`, with separate procedure modules for threads, messages, attachments, and actions; run-state lives in `runs.ts`, tool construction in `tools.ts`, and the remaining shared orchestration stays in `service.ts`.
- Resume modules now live under `features/resume`, with capability procedure modules for CRUD, tags, statistics, analysis, events, sharing, and export. Access helpers and resume update events are feature-owned.
- The authenticated PDF download procedure moved to `packages/api/src/features/resume/export.ts` and calls `@reactive-resume/pdf/server`.
- `@reactive-resume/api` no longer exports `./services/*` or `./helpers/*`; explicit exports now cover routers, context, flags type, resume runtime/export, and storage runtime.
- `apps/server` imports storage and the PDF procedure from explicit API feature exports. `apps/web` API imports remain type-only.
- Follow-up risk: `features/agent/service.ts` and `features/resume/service.ts` are still large DB-backed facades. They are feature-owned now, but further splitting should be handled as behavior-preserving follow-up work with targeted tests around run lifecycle, patch transactions, notifications, and storage cleanup.
- Validation passed for API tests/typecheck, server typecheck, web typecheck, MCP typecheck, focused Biome, and old service/helper import/export scans.

## Latest Task 6 Notes

- `apps/server/src` now reads as a runtime adapter app:
  - `http`: route composition, auth/health HTTP handlers, common header/cookie helpers
  - `rpc`: oRPC fetch handler and request-locale extraction
  - `mcp`: MCP auth, per-request server setup, and streamable HTTP transport handler
  - `openapi`: OpenAPI handler plus OAuth/OpenID/MCP well-known metadata
  - `static`: upload serving, `/schema.json`, and `apps/web/dist` static/SPA fallback serving
  - `startup`: database migrations and local-storage path checks
- `apps/server/src/index.ts` now only re-exports `createApp`, runs startup checks, computes the port, and starts the Hono server.
- The route order and public paths from the previous `index.ts` were preserved, including `/api/rpc`, `/api/openapi`, `/api/auth/*`, `/api/health`, `/uploads/*`, `/schema.json`, `/auth/oauth`, `/mcp`, `/.well-known/*`, and the web-dist fallback.
- Server-side API imports remain on explicit runtime exports only; no `@reactive-resume/api/services/*` or `apps/web/src` imports were introduced.
- Validation passed for server test/typecheck during implementation. Final Task 6 validation commands should still be listed in the worklog/final response after the executing agent's last run.

## Latest Task 7 Slice 1 Notes

- Resume-owned web code now starts under `apps/web/src/features/resume`:
  - `builder/draft.ts` owns the builder resume draft store/hooks.
  - `preview/*` owns the builder preview shell, PDF.js canvas renderer, shared preview helpers/tests, and dashboard thumbnail PDF rendering helpers.
  - `export/pdf-document*.tsx` owns web-local PDF document/blob/file wrappers around `@reactive-resume/pdf`.
  - `public/*` owns the public resume view, public PDF.js viewer, CSS, and tests.
- The old generic resume component folder and public-route private component folder were removed after their files moved.
- Direct `pdfjs-dist` imports are expected only under `apps/web/src/features/resume`; do not move them into `packages/pdf`.
- The public resume route remains responsible for loader/error/head composition, keeps `ssr: "data-only"`, and lazy-loads `@/features/resume/public/public-resume`.
- The builder preview route keeps `ssr: false` and lazy-loads the preview page composition.
- Remaining Task 7 work should continue moving non-resume web domains out of generic `components`/routes. Task 8 still owns dialog registry decomposition beyond import updates caused by the draft-store move.

## Latest Task 7 Slice 2 Notes

- App-shell code now starts under feature folders:
  - `apps/web/src/features/command-palette` owns the command palette implementation and tests.
  - `apps/web/src/features/theme` owns the theme provider, combobox, toggle button, and tests.
  - `apps/web/src/features/locale` owns the locale combobox and tests.
  - `apps/web/src/features/user` owns the user dropdown.
- Auth route UI now lives under `apps/web/src/features/auth`; route files under `apps/web/src/routes/auth` keep redirects/search validation and compose the feature pages.
- Settings page UI now lives under `apps/web/src/features/settings`; route files under `apps/web/src/routes/dashboard/settings` keep dashboard header composition and redirects. `job-search.tsx` remains route-only because it is already just a redirect shim.
- The old `@/components/{command-palette,theme,locale,user}` import paths should not be reintroduced; current consumers import from `@/features/*`.
- `apps/web/src/components` now contains remaining generic primitive/screen folders only.
- Task 8 still owns dialog registry decomposition; this slice did not decompose dialog definitions.

## Latest Task 8 Notes

- `apps/web/src/dialogs/store.ts` remains the single global dialog runtime and still exports `useDialogStore` plus `DialogProps<T>` for existing callers.
- Dialog schemas now compose through `apps/web/src/dialogs/schemas.ts` from domain-owned schema entries in `dialogs/auth/schema.ts`, `dialogs/api-key/schema.ts`, and `dialogs/resume/schema.ts`.
- Dialog rendering now composes through `apps/web/src/dialogs/renderers.tsx` from domain-owned renderer registries in `dialogs/auth/registry.tsx`, `dialogs/api-key/registry.tsx`, and `dialogs/resume/registry.tsx`.
- `apps/web/src/dialogs/manager.tsx` only imports the dialog shell, `renderDialog`, and the global store; it no longer imports every dialog implementation directly.
- No settings/auth-specific dialog tests existed beyond the shared dialog store and resume template tests.

## Latest Task 9 Notes

- `turbo.json` now has executable `boundaries` config:
  - Global dependencies deny `web` and `server`, preventing package-to-app and app-to-app dependency edges.
  - Root test tools are explicit `implicitDependencies`: `vitest`, `@testing-library/jest-dom`, `@testing-library/react`, and `@testing-library/user-event`.
  - Tag rules cover app, server, browser, universal, domain, and UI layers.
- Workspace `turbo.json` files now exist for both apps and every package. Each extends root config with `extends: ["//"]` and declares tags used by the root boundaries.
- Every workspace `vitest.config.ts` keeps its legitimate root shared config import with `// @boundaries-ignore root shared Vitest config` immediately above `import { createVitestProjectConfig } from "../../vitest.shared";`.
- `biome.json` now enables `style.noRestrictedImports` for forbidden cross-workspace source/path imports:
  - `@reactive-resume/*/src/**`
  - `apps/**`
  - `packages/**`
- `biome.json` also registers `tooling/grit/no-cross-workspace-src-imports.grit`, which flags import/export/dynamic import sources that reach into another workspace's `src` tree.
- `apps/web/tsconfig.json` no longer maps `@reactive-resume/ui/*` directly to `../../packages/ui/src/*`; the web app uses `@reactive-resume/ui` package exports instead.
- Files changed by Task 9:
  - `turbo.json`
  - `apps/*/turbo.json`
  - `packages/*/turbo.json`
  - `biome.json`
  - `tooling/grit/no-cross-workspace-src-imports.grit`
  - `apps/web/tsconfig.json`
  - `apps/server/vitest.config.ts`
  - `apps/web/vitest.config.ts`
  - `packages/*/vitest.config.ts`
  - `docs/superpowers/worklogs/2026-05-14-monorepo-architecture-reorg.md`
  - `docs/superpowers/handoffs/2026-05-14-monorepo-architecture-reorg.md`
- Validation passed:
  - `pnpm exec turbo boundaries`
  - `pnpm exec biome check biome.json turbo.json tooling/grit/no-cross-workspace-src-imports.grit apps/web/tsconfig.json apps/server/turbo.json apps/web/turbo.json packages/*/turbo.json`
  - `pnpm --filter web typecheck`
  - `pnpm --filter @reactive-resume/api typecheck`
  - `pnpm --filter server typecheck`
- Remaining risks:
  - The Turbo tag set is intentionally coarse and may need finer per-package rules as future browser/server package classes settle.
  - The GritQL plugin only inspects code import/export sources; keep the package export-map and tsconfig scans in the final validation list.
  - The root shared Vitest config remains an intentional boundary ignore; moving it behind a package export would be a separate test-infra cleanup.

## Latest Task 10 Notes

- `AGENTS.md` is now the operational source of truth for package roles, runtime tags, import rules, placement decisions, and validation commands.
- `docs/contributing/architecture.mdx` is now a public contributor overview of the current monorepo layout instead of the removed single-`src` architecture.
- `docs/adr/0001-workspace-boundaries.md` records the rationale for domain-first packages, explicit export maps, `turbo boundaries`, and Biome/Grit import enforcement.
- MCP user docs already list canonical unprefixed tool names from Task 4. AI Agent tool docs already list `read_resume` and `apply_resume_patch`; no Task 10 changes were needed there.
- Follow-up documentation audit on 2026-05-15 reconciled AGENTS and public docs with the final `apps/server` Hono adapter shape, current Node/pnpm prerequisites, Base UI wording, provider-native web research behavior, and the current env schema.
- Docs validation available in-repo is limited:
  - Stale-text scan passed except expected `ORPCClient` diagram labels.
  - Biome ignored Markdown/MDX and reported that no files were processed for the docs paths.
  - No dedicated docs build/check script exists in `package.json`.

## Latest Task 11 Notes

- Final cleanup after `pnpm knip`:
  - Removed stale app dependencies from `apps/server/package.json` and `apps/web/package.json`.
  - Deleted the unused web server PDF wrapper at `apps/web/src/features/resume/export/pdf-document.server.tsx`.
  - Removed unnecessary exported markers from internal helper functions/constants.
  - Added `pdfExportRateLimit` to `packages/api/src/features/resume/export.ts`.
  - Removed unused jobs rate-limit middleware entries that no current router uses.
- Final validation commands passed:
  - `pnpm install --lockfile-only`
  - `pnpm install`
  - `pnpm exec biome check .`
  - `pnpm exec turbo boundaries`
  - `pnpm knip`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
- `pnpm knip` still prints a non-failing configuration hint: `src/server.ts apps/web knip.json Refine entry pattern (no matches)`.
- Useful review anchors:
  - Architecture rules: `AGENTS.md`, `docs/contributing/architecture.mdx`, `docs/adr/0001-workspace-boundaries.md`.
  - Boundary enforcement: `turbo.json`, workspace `turbo.json` files, `biome.json`, `tooling/grit/no-cross-workspace-src-imports.grit`.
  - API feature tree: `packages/api/src/features`.
  - Server adapter tree: `apps/server/src/{http,rpc,mcp,openapi,static,startup}`.
  - Web feature tree: `apps/web/src/features`.
