# 08 — Decide root-domain public resume routing

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** agent-selected self-hosted root mode; ready for future implementation. **Category:** feature.  
**Priority:** P2. **Effort:** 2–4 days for optional root mode and production regression. **Risk:** High: private/public boundaries, origin and route handling.  
**Issues:** [#2669](https://github.com/amruthpillai/reactive-resume/issues/2669).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'apps/web/src/routes/_home/index.tsx' 'apps/web/src/routes/$username/$slug.tsx' 'apps/web/src/features/resume/public/public-resume.tsx' 'packages/api/src/features/resume/service.ts' 'apps/server/src/http/app.ts' 'apps/web/src/libs/seo.ts' 'packages/env/src/server.ts' 'turbo.json' '.env.example' 'apps/web/src/routes/_home/route.tsx' 'packages/api/src/features/resume/router.ts' 'packages/api/src/features/flags/router.ts' 'packages/api/src/features/resume/root.ts' 'packages/api/src/features/resume/root.test.ts' 'apps/web/src/features/resume/public/public-resume.test.tsx' 'tests/e2e/specs/root-public-resume.spec.ts' 'docs/self-hosting/docker.mdx'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Selected direction and why

**Agent judgment:** implement one explicitly configured public resume at the root of a self-hosted instance. This matches #2669's root-domain use case without introducing multi-tenant custom domains, DNS verification, certificates or a domain registry. The default instance keeps its existing marketing home. This is a planning selection, not a claim that the maintainer previously approved a broader hosting product.

Use an optional server-only `ROOT_RESUME_ID` setting identifying one resume by its stable ID. Do not accept a request-supplied host, username or resume ID as configuration authority. Keep the ordinary username/slug URL functional. Serve the resume at `/` without redirecting the browser back to the slug route. Canonical metadata for root mode points to the configured APP_URL root; no Host-header inference. Password protection remains supported through existing access cookies, and private/missing targets return a safe unavailable page without revealing target identity. No additional product question is needed for this bounded self-hosted mode.

## Current evidence and source seams

Issue #2669 describes reverse-proxy root rewrites breaking paths or returning to the ordinary public URL. Current `_home/index.tsx` renders marketing content, while `/$username/$slug.tsx` loads the public resume and builds slug-based canonical metadata. The parent `apps/web/src/routes/_home/route.tsx` also renders a marketing header. Replacing only the child component would therefore leave unwanted marketing layout around root mode.

`apps/web/src/features/resume/public/public-resume.tsx#PublicResumeRoute` binds directly to `getRouteApi("/$username/$slug")`, calls `getBySlug`, and constructs the public PDF target from that route's parameters. It cannot simply be mounted under `/`; extract the reusable view/query logic behind named props first. `packages/api/src/features/resume/service.ts#getBySlug` enforces visibility/password checks and visitor statistics. Reuse that authorization path rather than adding a public-by-ID bypass. `apps/server/src/http/app.ts` owns API/auth/uploads/web route ordering and must remain unchanged unless an actual integration failure proves a need.

## Exact implementation scope

- `packages/env/src/server.ts`, `.env.example`, and `turbo.json`: optional server setting, documented default-off behavior and strict env forwarding.
- `packages/api/src/features/resume/root.ts` (new) and `root.test.ts` (new): resolve the configured ID to current username/slug, apply public-only guard, and delegate public access behavior.
- `packages/api/src/features/resume/router.ts`: expose one no-input public root-resume procedure from the new module; add only a non-secret enabled/disabled hint to `packages/api/src/features/flags/router.ts` if the root layout needs it.
- `apps/web/src/features/resume/public/public-resume.tsx` and a colocated new test: extract route-independent `PublicResumePage` with named props for current username/slug and flags. Keep the ordinary route wrapper.
- `apps/web/src/routes/_home/index.tsx`, `_home/route.tsx`, `/$username/$slug.tsx`, and `apps/web/src/libs/seo.ts` only as required for shared metadata: root loader/layout and canonical behavior.
- `docs/self-hosting/docker.mdx`, `tests/e2e/specs/root-public-resume.spec.ts` (new): configuration instructions and complete root-mode regression.

No new database schema, custom-domain table, arbitrary host resolver, reverse-proxy rewrite, account setting, or manual edit to generated `routeTree.gen.ts`. Imports cross packages only through current exports. New helpers belong in their owning feature, not a generic global utility.

## Stepwise implementation with verification gates

1. Add and test configuration resolution. Unset/blank setting means mode disabled; a nonempty value is a resume ID, never a URL. Add the env key to `turbo.json` and `.env.example` together. Tests inject fake configuration and DB rows instead of reading real env values. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/resume/root.test.ts` passes disabled, missing-row, public, private and password-protected fixtures after the new file exists; `rtk proxy pnpm --filter @reactive-resume/api typecheck` exits 0.
2. Implement a no-input public resolver in `root.ts`. Resolve the configured ID to its current owner username/slug; reject missing/private records before returning identity. Then delegate data retrieval and password checks to the existing public service contract, passing current request headers and optional session identity. Avoid double-counting views: only the final `getBySlug` access records the view, and a configuration/identity lookup never does. Add an internal `requirePublic` option defaulting false to the owning service lookup, pass true only from the root procedure, and check current public status in the final lookup so an owner session or privacy change between queries cannot expose a private root. This option is not accepted from public request input. **Verify:** root tests prove private-owner access does not make the root publicly configured, non-owner private lookup stays unavailable, owner visits remain excluded, password failure returns the existing controlled access challenge, and request parameters cannot select another resume.
3. Refactor the public component into a route wrapper plus `PublicResumePage` with named props and stable query key. Keep the existing slug route's API behavior unchanged and let the root wrapper supply the resolved identity. Do not render a PDF browser module during server rendering; preserve current client/public SSR boundaries. Downloads must use current username/slug and current preference. **Verify:** `rtk proxy pnpm --filter web exec vitest run src/features/resume/public/public-resume.test.tsx` covers both wrappers with the same viewer data and download target; `rtk proxy pnpm --filter web typecheck` exits 0.
4. Add the root loader and adjust `_home/route.tsx` so only active root mode omits marketing header/sections. Preserve the root skip-link/main landmark without duplicate IDs, and preserve marketing layout for all unaffected paths. Disabled mode renders exactly the prior home. Enabled but unavailable target renders a safe unavailable page rather than silently reverting to marketing or leaking target details. Root page canonical is APP_URL root; ordinary slug canonical remains its existing path. **Verify:** a component/route test checks disabled/public/private/missing states and the existing SEO tests (`rtk proxy pnpm --filter web exec vitest run src/libs/seo.test.ts`) remain green.
5. Reuse the password challenge and redirect-to-original-page mechanism so a password-gated root returns to `/` after success. Keep access cookie scope bound to the resume, not the route. Change the root-mode "Build your own resume" footer destination to the existing dashboard entry so it does not point to the same public root; ordinary slug viewer stays unchanged. **Verify:** root E2E tests cover failed password, successful password, expiry and full reload; downloads never bypass the access challenge.
6. Document setting/unsetting `ROOT_RESUME_ID`, restart behavior and how to find the ID from the owner's builder URL. State that the configured resume must be public and that self-hosted APP_URL/proxy setup remains normal. Do not tell users to make a private resume public automatically. **Verify:** `rtk proxy rg -n 'ROOT_RESUME_ID' packages/env/src/server.ts turbo.json .env.example docs/self-hosting/docker.mdx` finds all four integration points and `rtk proxy git diff --check` exits 0.
7. Run the production regression matrix below, typechecks and boundaries. **Verify:** all named scenarios pass before claiming the root-domain use case complete. Existing ordinary public URLs, root marketing when unset, auth/API/assets and dashboard remain working.

## Controlled E2E fixture and exact commands

Use a disposable database and two synthetic accounts from existing `tests/e2e/fixtures/auth.ts`. Create one public `Root Fixture`, one private resume and one password-protected resume. Configure the first ID through a git-ignored `.env.root-e2e.local` containing only disposable credentials, unique APP_URL and PORT; the application must restart when switching ROOT_RESUME_ID. Do not use a production origin or reuse another worker's server. Root `playwright.config.ts` starts `pnpm start` and supports APP_URL/PORT.

```bash
rtk proxy pnpm build
rtk proxy dotenvx run -f .env.root-e2e.local -- pnpm exec playwright test tests/e2e/specs/root-public-resume.spec.ts tests/e2e/specs/public-sharing.spec.ts tests/e2e/specs/public-download-preference.spec.ts --project=chromium
rtk proxy pnpm --filter @reactive-resume/api --filter web --filter server typecheck
rtk proxy pnpm exec turbo boundaries
```

These are future implementation commands; root mode does not exist in the planning checkout. Existing API service tests passed in the 93-test combined run; server suite 105 passed with four DB-gated OAuth tests skipped, and API/server/auth/DB types/boundaries passed. Do not claim unimplemented root scenarios are green.

Required red/green cases: unset mode shows marketing; public configured target stays at `/` after reload; root metadata uses configured origin; private/missing target reveals no name or ID; password cookie works and expires; owner traffic excluded; data fetch does not double-count; download preference preserved; ordinary slug route still works; `/api/health`, `/auth/login`, uploads, fonts and assets are reachable; arbitrary Host headers cannot change target/canonical; changing slug keeps stable configured ID working; deleting target fails safely; root component has no slug-route-hook error.

## Done, stop, and maintenance

Done means configured self-hosted root visibly serves the intended public resume with working access/download/asset behavior, while unset mode preserves prior home. STOP if source drift changes route/SSR ownership, a proposed solution requires domain verification or broad auth bypass, or safe password/root continuation cannot be achieved in the stated scope. Do not stop for routine helper/file choices within this design. Any real deployment configuration remains operator-controlled; implementation does not authorize changing DNS or publishing private data. Maintain both route wrappers together when public viewer, password access or metadata behavior changes.

## Exact current source anchors

`apps/web/src/routes/_home/index.tsx:14`:

```ts
export const Route = createFileRoute("/_home/")({
	component: RouteComponent,
	head: () => {
		const appUrl = typeof window !== "undefined" ? window.location.origin : "https://rxresu.me";
		const canonicalUrl = getCanonicalRootUrl(appUrl);
```

`apps/web/src/routes/$username/$slug.tsx:11`:

```ts
export const Route = createFileRoute("/$username/$slug")({
	component: lazyRouteComponent(() => import("@/features/resume/public/public-resume"), "PublicResumeRoute"),
	loader: async ({ context, params }) => {
		const { username, slug } = params;
		const resume = await context.queryClient.ensureQueryData(
			orpc.resume.getBySlug.queryOptions({ input: { username, slug } }),
		);

		return { resume: resume as LoaderData };
```

`packages/api/src/features/resume/service.ts:534`:

```ts
		if (!resume) throw new ORPCError("NOT_FOUND");

		const viewer = input.currentUserId ? { id: input.currentUserId } : null;
		assertCanView(resume, viewer);

		if (resume.hasPassword && !hasResumeAccess(input.requestHeaders, resume.id, resume.passwordHash)) {
			throw new ORPCError("NEED_PASSWORD", {
				status: 401,
				data: { username: input.username, slug: input.slug },
			});
```


`apps/web/src/features/resume/public/public-resume.tsx:14`:

```ts
const publicResumeRoute = getRouteApi("/$username/$slug");

export function PublicResumeRoute() {
	const { username, slug } = publicResumeRoute.useParams();
	const { flags } = publicResumeRoute.useRouteContext();

	const { data: resume } = useQuery(orpc.resume.getBySlug.queryOptions({ input: { username, slug } }));
	const publicResume = useMemo(() => ({ username, slug }), [slug, username]);
```
