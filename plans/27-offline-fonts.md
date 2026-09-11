# Plan 27: Measure all font network paths before choosing an offline distribution

## Selected direction and authority

Agent judgment: configurable administrator-hosted font sources for self-hosted deployments, including all required fallback families and picker previews. Keep hosted/default source behavior unchanged. A bundled full catalog is out of scope. Local mode must not fall back to external URLs; missing configured assets must produce an actionable error or an explicitly configured local fallback.

Inventory current source owners and define one source manifest consumed by preview and PDF registration. License/source validation and cold-network tests remain technical gates.

## Status

- **Issue:** [#3377](https://github.com/amruthpillai/reactive-resume/issues/3377).
- **Planned at:** `7a98f6662`, 2026-09-05. Priority P2, effort L, risk high for download size, licensing, and missing glyphs.
- **Readiness:** Direction selected above. Ready for later execution after the technical verification gates; this task remains documentation-only.
- **Evidence:** Self-hosted user requests operation without Google font access. Blocking Google alone is not equivalent to being offline: the current catalog includes other CDNs too. Confidence is high for remote catalog/fallback paths, unmeasured for a fully cold offline browser/server run.

## Current state

Drift check: `rtk proxy git diff --stat 7a98f6662..HEAD -- packages/fonts packages/pdf/src/hooks/use-register-fonts.ts apps/web/src/routes/builder apps/web/src/features/resume/export apps/server`.

- `packages/fonts/src/index.ts` defines standard PDF fonts Helvetica, Courier, Times-Roman, plus a web font catalog. `webfontlist.json` contains remote file/preview URLs, including jsDelivr as well as Google sources.
- `packages/pdf/src/hooks/use-register-fonts.ts` registers font variants with a module-level cache and falls back from unknown family/legacy alias to IBM Plex Serif. Primary standard-font use does not prove the entire document is network-free.
- `packages/fonts/src/index.ts:92` defines punctuation Noto fallbacks; script-specific Noto families cover CJK, Arabic, Hebrew, Thai, and emoji. `use-register-fonts.ts` registers needed fallback weights. Removing these to avoid requests can produce missing glyphs.
- `packages/pdf/src/hooks/use-register-fonts.test.ts` already tests script/weight fallback and punctuation. Preserve those contracts.

## Scope and dependencies

Scope includes a cold-network diagnostic and the selected local-source manifest. Code owners are `packages/fonts` source resolution, PDF registration, browser font preview loading, and deployment/static asset configuration. If source discovery shows a server configuration variable is needed, update both `packages/env/src/server.ts` and root `turbo.json` globalEnv; never send server-only env imports into browser code. No unlicensed bulk font download or arbitrary file path access. Coordinate plan 30's standard-font evaluation, but a Latin ATS fixture cannot validate multilingual offline support.

## Steps and gates

1. **Capture all cold requests.** Generate fixtures with Latin punctuation, CJK, Arabic, Hebrew/Thai, and emoji using sample data. In a fresh browser context with empty caches, block external requests and log hostname/path only. Exercise font picker previews, builder PDF, download, and server PDF separately. Restart server between relevant controls to remove module cache effects. Never rely on previously cached fonts.

   **Gate:** Add a diagnostic `tests/e2e/specs/offline-fonts.spec.ts` with explicit allowed same-origin hosts. Its output lists which fixture/surface requested which external font, and distinguishes unsupported glyphs from network errors. Baseline `rtk proxy pnpm --filter @reactive-resume/fonts test` and `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/hooks/use-register-fonts.test.ts` pass.

2. **Specify the administrator-hosted manifest.** For each candidate bundled family record source, license, weights/styles, scripts, compressed size, and build/runtime path. Use a versioned manifest mapping family/style/weight and preview to administrator-hosted same-origin assets; no bundled full catalog. Consult primary font licenses/documentation at execution time. Record missing-family behavior and what happens when a imported resume names an unavailable font. This step produces evidence; it does not download the entire catalog.

   **Gate:** The manifest schema, loading owners, license obligations, and asset size inventory are concrete. Reject missing required fallback mappings in local mode with an actionable message. Do not reinterpret no-Google as permission to contact another CDN.

3. **Implement the shared source resolver.** Centralize configured source resolution so browser preview and PDF registration select the same permitted family/weight. Retain script fallbacks and stable alias behavior. Standard fonts continue requiring no primary font file; configured local fallback assets must remain available for symbols/scripts. Fail clearly or apply the explicitly configured local fallback when an asset is absent; do not silently retry remote URLs in offline mode.

   **Gate:** Unit tests cover every chosen weight/style, unavailable source, alias, standard font, and each script fallback. Browser bundles contain no server-only filesystem imports; boundaries passes. If environment options are added, a production build/server test verifies they survive Turbo strict env filtering.

4. **Prove actual offline behavior.** Build production, run the cold browser and restarted server matrix with all outbound networking denied, and inspect PDF text/glyph rendering. Record image sizes and asset-cache headers if assets are served locally. Test imported unknown-family data and a missing local asset using the specified local-only error/fallback behavior.

   **Gate:** `rtk proxy pnpm build` and the offline E2E matrix pass with zero unexpected external font requests; every supported-script token remains legible in raster output and extractable where the renderer supports it. Keep supported script limits explicit.

## Done criteria and STOP conditions

- [ ] Local-source manifest, licenses, size limits, and missing-font behavior are documented and tested.
- [ ] All claimed browser/server surfaces pass from cold caches with outbound requests denied.
- [ ] Script and punctuation fallback behavior is preserved; no false success from cached assets.
- [ ] Deployment includes every required configured asset and source resolution is shared consistently.

Stop if required font licensing is unknown, safe browser/server manifest loading requires an unresolved deployment redesign, glyph loss is used as a network workaround, or the solution needs unbounded catalog downloads.

## Executor rules and final gates

This remains documentation-only planning. The selected direction above may guide a later explicitly dispatched implementation; it does not authorize source changes during the present planning task. Agent judgments are not maintainer approvals. Follow recorded maintainer decisions when they differ. Use a fresh `codex/` worktree, leave other owners’ changes untouched, and never merge. The coordinator maintains the index. Do not post GitHub issue comments.

Before future code edits, run `rtk proxy git status --short` and `rtk proxy pnpm dlx @tanstack/intent@latest list`; load the most specific matching installed skill. Use package exports for cross-package imports. Resume schema changes start in `packages/schema`; pure resume behavior belongs in `packages/resume`; PDF code belongs in `packages/pdf`; editor controls belong in `apps/web`. Use `useUpdateResumeData` for builder mutations so undo and autosave participate. New visible strings use Lingui.

Run the focused commands, affected package typechecks, `rtk proxy pnpm exec turbo boundaries`, and `rtk proxy git diff --check`; each must exit 0. Use read-only Biome inspection on changed files, or explicitly acknowledge that `rtk proxy pnpm check` writes files and inspect its entire diff. Missing fixtures, failed commands, and unavailable checkers remain unresolved gates. Stop for contradicting source drift, unsafe data behavior, required scope expansion, or the same verification failure twice. Keep synthetic fixtures/generators in the repository and generated artifacts in test outputs, without secrets or temporary-path prerequisites.
