# 07 — Record declined AIO packaging and improve separate-PostgreSQL setup docs

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** AIO request declined by maintainer; bounded documentation plan ready. **Category:** docs.  
**Priority:** P2 documentation. **Effort:** 0.5–1 day. **Risk:** Low; deployment commands must remain accurate.  
**Issues:** [#2722](https://github.com/amruthpillai/reactive-resume/issues/2722).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'Dockerfile' 'compose.yml' 'docs/self-hosting/docker.mdx' 'docs/self-hosting/examples.mdx' 'apps/server/src/startup/checks.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Explicit maintainer decision and issue disposition

The user explicitly decided: "No, postgres must be separate. There is no benefit to providing an AIO image."

Therefore the app-plus-PostgreSQL AIO image requested in #2722 is **declined**, not fixed. PostgreSQL remains a separate service. Do not ask again whether to embed it, preserve an executable embedded-image alternative, or require reporter acceptance before recording the maintainer's disposition. This plan adds only bounded documentation improvements that make the supported separate-database setup clearer for Compose and Unraid/homelab operators.

No implementation or external issue mutation is authorized by this planning pass. A future request to execute the documentation plan covers the ordinary docs/PR work; it does not authorize changing a user's running containers or closing/posting on GitHub unless included in that request.

## Current evidence and architecture

Issue #2722 asks for a convenient one-container app+database deployment. Current official image already runs one Node.js process for the web app and API; PostgreSQL remains external to that process/image. `Dockerfile` uses Node24, non-root `node`, port 3000, `/app/data`, a health probe at `/api/health`, and starts generated artifact `apps/server/dist/index.mjs`. `apps/server/src/index.ts` runs migrations/startup checks before serving. `compose.yml` defines PostgreSQL and optional Redis/storage services separately.

`docs/self-hosting/docker.mdx` already documents local upload persistence, external storage options, update and backup responsibilities. `docs/self-hosting/examples.mdx` contains proxy/deployment examples. The improvement is to state the supported topology and minimal path clearly, not ship new runtime behavior or imply the declined AIO feature exists.

## Exact scope and preserved defaults

Modify only `docs/self-hosting/docker.mdx` and `docs/self-hosting/examples.mdx`. Do not edit Dockerfile, Compose services, application startup, dependency versions or environment defaults for this documentation task. No supervisor, bundled database, image variant, official Unraid template or one-click deployment service is included.

Keep application and PostgreSQL upgrades independent. Explain that PostgreSQL data and app uploads require separate persistence/backup, and that the app connects through DATABASE_URL. Do not publish credential values or advise using an unsecured database across a public network. Preserve existing local-storage fallback and optional Redis/S3 requirements for features that need them. Do not imply the default full Compose file is a minimal two-service bundle if optional services are still present.

## Concrete documentation action plan

1. Add a short architecture paragraph near the start of the Docker guide: one app container serves web/API; PostgreSQL must be separate; no AIO image is planned. Link the existing setup instructions rather than creating a competing compose fragment. **Verify:** `rtk proxy rg -n 'PostgreSQL|container|DATABASE_URL' docs/self-hosting/docker.mdx` finds the clear separation and connection guidance. Cross-check Dockerfile entrypoint below; this is a policy statement backed by the explicit decision, not a bug claim.
2. Present the smallest supported setup as an ordered checklist: provide a separate healthy PostgreSQL service; prepare APP_URL, DATABASE_URL and AUTH_SECRET in a private env file; mount persistent app uploads when S3 is disabled; attach app and database to the intended private network; launch using the existing documented Compose instructions; wait for migrations and health before opening the UI. Reference existing service names exactly. **Verify:** `rtk proxy docker compose -f compose.yml config --quiet` exits 0 without printing interpolated secrets. Do not run `up`, restart or recreate the user's existing stack during documentation validation.
3. Add an Unraid/homelab subsection using generic container configuration fields: official app image, app port 3000, private database host/service name reachable from the app, required env names, app upload volume, and a separately managed PostgreSQL data volume. Explain that `localhost` inside the app container identifies the app container, so it does not reach a separate database container. Avoid inventing exact Unraid UI labels/version-specific clicks or publishing an untested Community Applications template. **Verify:** `rtk proxy rg -n 'Unraid|localhost|3000|DATABASE_URL|/app/data' docs/self-hosting/docker.mdx` locates these specific requirements; compare the mapping with the current existing example, not guessed platform behavior.
4. In the examples guide, add a short cross-reference to that subsection and explain reuse of an already managed PostgreSQL service instead of embedding another server. Include a boundary note that Redis/S3 are separate optional feature dependencies where documented. Do not remove working full-stack examples to make the topology appear simpler. **Verify:** `rtk proxy rg -n 'PostgreSQL|self-hosting/docker|Unraid' docs/self-hosting/examples.mdx` finds the guidance and valid internal link.
5. Make update/backup instructions explicit: back up the separate database and upload storage; app container recreation must preserve both; perform PostgreSQL major upgrades according to that deployment's database procedure. Do not add destructive database reset/migration shortcuts. **Verify:** `rtk proxy rg -n 'Back up|backup|persistent|PostgreSQL' docs/self-hosting/docker.mdx` locates both data resources and update sequence.
6. Direct-lint only the two edited docs, validate links and review the diff. **Verify:** `rtk proxy pnpm exec markdownlint-cli2 --no-globs docs/self-hosting/docker.mdx docs/self-hosting/examples.mdx` and `rtk proxy git diff --check` exit 0. `rtk proxy git diff --name-only` contains only these two docs. A synthetic platform smoke test is useful if an Unraid test host exists, but lack of that platform is reported as a validation limit rather than blocking factual topology documentation.

## Acceptance and verification record

The documentation clearly tells a new operator that PostgreSQL is separate, gives an existing supported path to connect it, describes persistent storage/backup, and avoids suggesting an AIO image or tested official Unraid template. The issue's desired packaging is declined by maintainer; documentation completion does not mean its AIO request was implemented.

Planning baseline: server suite 105 passed, four DB-gated OAuth tests skipped; server/DB/API/auth types and boundaries clean. `rtk proxy docker compose -f compose.yml config --quiet` passed with exit 0 during this revision. No Docker image was built or Unraid host operated for this plan. Existing checks are sufficient source evidence for topology; documentation changes do not need new unit tests mirroring text. Run the exact config/lint commands above and record whether the optional platform smoke test was available.

## Stop conditions and maintenance

STOP if current docs/Compose names no longer match the described setup, if a proposed fix needs runtime/packaging edits, or if real credentials/running infrastructure are required for validation without authorization. Do not reopen the embedded-database decision. Ordinary wording and structure choices within these two docs do not need further confirmation. Keep the setup instructions aligned with Dockerfile runtime paths, supported PostgreSQL deployment guidance and feature-specific optional dependencies when those change.

## Exact current source anchors

`Dockerfile:70`:

```dockerfile
USER node

EXPOSE 3000/tcp
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT ?? 3000}/api/health`).then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1));"]

CMD ["node", "apps/server/dist/index.mjs"]
```

`apps/server/src/index.ts:6`:

```ts
export async function main() {
	await runStartupChecks();

	// OAuth resource seeding starts when auth is imported, so load the app only
	// after migrations have created the provider tables.
	const { createApp } = await import("./http/app");
```

