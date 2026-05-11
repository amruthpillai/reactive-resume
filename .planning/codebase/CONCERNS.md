# Codebase Concerns

**Analysis Date:** 2026-05-11

## TODO / FIXME / HACK / XXX Comments

A repo-wide grep for `TODO`, `FIXME`, `HACK`, and `XXX` markers across `apps/web/src/**` and `packages/**` returned **zero hits** in source code. The team appears to track follow-ups in PRs/issues rather than inline. Two referenced issues remain anchored in inline comments:

- `packages/pdf/src/hooks/use-register-fonts.ts:22` — references issue `#2986` (CJK glyph-level font fallback).
- `packages/pdf/src/hooks/use-register-fonts.ts:103` — references issue `#2986` again for CJK textkit substitution.

These are stable design references, not unresolved debt — included for traceability only.

The remaining inline-comment "concerns" found during exploration sit in the **Anti-debt narrative** below, derived from code shape rather than comment markers.

---

## High Severity

### Security: SMTP-disabled fallback logs full email bodies (incl. verification/reset links)

When `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` are not all set, the email transport logs the entire payload — including `text` and `html` bodies — to `stdout`.

- File: `packages/email/src/transport.ts:59-66`

```ts
console.info("SMTP not configured; skipping email send.", {
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
});
```

**Impact:**
- Password reset, email verification, and email-change confirmation URLs (which are credential-equivalent bearer tokens) are written to server logs whenever SMTP is not fully configured.
- In any shared-log / log-shipping environment (Docker, Kubernetes, journald, cloud logging) this is a credential leak.
- The README and `AGENTS.md:101` describe this as a dev convenience; nothing prevents an operator from running production with partial SMTP config.

**Fix approach:**
1. Add a server-startup assertion that, if `NODE_ENV === "production"`, `isSmtpEnabled()` must be true.
2. Redact `text` / `html` from the `console.info` call — log only `to` and `subject`.
3. Document the production SMTP requirement in `.env.example` alongside `AUTH_SECRET`.

### Security: rate limiting is silently disabled in non-production

Both the oRPC rate-limit middleware and Better Auth's rate-limit config gate on `process.env.NODE_ENV === "production"`. Anything that does not set `NODE_ENV=production` at runtime (default `node` invocation, custom Docker entrypoints that forget to set it, self-hosters running `pnpm start` without `NODE_ENV`) runs with **all rate limiting disabled**, including:
- `/sign-in/email`, `/sign-up/email`, password-reset, OAuth `register`/`authorize`/`token` (`packages/auth/src/config.ts:30, :69-78, :249-251, :388-390`)
- Resume password verification, AI calls, PDF export, storage uploads/deletes, resume mutations (`packages/api/src/middleware/rate-limit/index.ts:5, :75`)

**Impact:** brute-force-friendly. A self-hosted deployment that omits `NODE_ENV=production` is wide open on auth and resume-password endpoints.

**Fix approach:**
- Either default `isRateLimitEnabled = true` and provide a `RATE_LIMIT_DISABLED` opt-out env var, or assert `NODE_ENV === "production"` at boot when not running tests.

### Security: rate limiter is in-process memory only — broken under horizontal scaling

`MemoryRatelimiter` is used for every oRPC rate limit (`packages/api/src/middleware/rate-limit/index.ts:59-66`). Better Auth's `rateLimit` and `apiKey.rateLimit` blocks (`packages/auth/src/config.ts:248-251, :387-391`) similarly do not configure a distributed store.

**Impact:** Running >1 Node instance behind a load balancer multiplies the effective rate limit by the instance count. Brute-force attacks bypass the limit by retrying until they hit a different replica.

**Fix approach:** Swap `MemoryRatelimiter` for a Redis-backed ratelimiter (the package supports it via `@orpc/experimental-ratelimit`) once a redis dependency is acceptable. Until then, document the single-instance constraint in the deployment docs.

### Security: file upload accepts arbitrary MIME with image processing disabled

`uploadFile` (`packages/api/src/routers/storage.ts:42-71`) only runs the sharp image-processing pipeline for files where `isImageFile(file.type)` returns true based on the **client-supplied `file.type`**, and even that pipeline is skipped if `FLAG_DISABLE_IMAGE_PROCESSING=true` (`packages/api/src/services/storage.ts:96-101`).

**Impact:**
- A client can claim `content-type: text/html` (or any non-image MIME) on a 10 MB upload, and the file is stored verbatim into `uploads/{userId}/pictures/...` with the user-claimed content type.
- Served back from `apps/web/src/routes/uploads/$userId.$.tsx`. `X-Content-Type-Options: nosniff` is set (`:159`) and the storage route forces `application/octet-stream` only for `.pdf` (`:39, :148-153`), so a stored HTML body could be served as HTML if the inferred extension matches. The picture key always ends in `.jpeg` (`storage.ts:60`), which mitigates this in the picture path, but there is no MIME allow-list enforced at upload time.
- With `FLAG_DISABLE_IMAGE_PROCESSING` on, the same applies to genuine images (no resize/strip-metadata path), so EXIF data is preserved unredacted.

**Fix approach:**
1. Add a strict allow-list at the router boundary (`packages/api/src/routers/storage.ts:9`) — `z.file().mime(["image/png", "image/jpeg", "image/webp", "image/gif"])` plus magic-byte validation.
2. Reject upload if claimed MIME does not match the sharp-detected MIME; do not fall back to client claim.
3. Surface a startup warning when `FLAG_DISABLE_IMAGE_PROCESSING=true` so it is not enabled in production unknowingly.

### Tech Debt: web app has near-zero test coverage

- `apps/web/src` has **11 test files** across **~224 source files** (~5%) — `find apps/web/src -name "*.test.*"`.
- `apps/web/src/routes` has **1 test file** across **125 route files** (`apps/web/src/routes/builder/$resumeId/-components/donation-toast.test.tsx`).
- Total repo: ~93 test files / ~385 source files (~24%). Most coverage lives in `packages/ui`, `packages/utils`, `packages/pdf/src/templates/shared`, and `packages/api` (5 tests).

**Impact:**
- Refactors to routes, builder shell, sidebar forms, resume preview wiring, MCP tools, and uploads handler land without a regression net.
- Particularly thin: `apps/web/src/routes/api/**` (rpc, auth, openapi, mcp, uploads) and `apps/web/src/routes/builder/$resumeId/**`.

**Fix approach:** Phase-by-phase, add server-handler integration tests for `api/health.ts`, `api/auth.$.ts` (registration-validation path), `uploads/$userId.$.tsx` (path traversal), and at least smoke tests around the builder store in `apps/web/src/components/resume/builder-resume-draft.ts`.

---

## Medium Severity

### Fragile: PDF.js / canvas SSR boundary is enforced by convention only

The SSR/CSR split for the resume preview is hand-maintained:

- `apps/web/src/components/resume/preview.tsx:14` returns `null` until `useIsClient()` resolves and then lazy-loads the browser bundle.
- `apps/web/src/components/resume/preview.browser.tsx:2` imports `@react-pdf/renderer` (`pdf`).
- `apps/web/src/components/resume/pdf-canvas.tsx:1, :4, :9` imports PDF.js types/runtime and sets a module-level `GlobalWorkerOptions.workerSrc`.
- `apps/web/src/routes/templates/$.tsx:1` imports `PDFViewer` at the **top level** but the route component itself bails on `!isClient`. Top-level import means the bundle reaches the SSR chunk; correctness relies on the import being tree-shaken away when SSR runs.
- `apps/web/src/routes/dashboard/resumes/-components/cards/resume-thumbnail.tsx` uses dynamic `await import("pdfjs-dist")` — a different convention from `pdf-canvas.tsx`'s static import.
- SSR mode hints: `apps/web/src/routes/builder/$resumeId/index.tsx:4` (`ssr: false`), `apps/web/src/routes/$username/$slug.tsx` (`ssr: "data-only"`).

**Impact:** A future contributor adding a static PDF.js import inside a SSR-rendered route component will break SSR with a `window is not defined` error at build/run time. There is no lint rule or build-time guard enforcing this.

**Fix approach:**
1. Document the boundary explicitly at the top of `apps/web/src/components/resume/preview.tsx` and `pdf-canvas.tsx` (currently only described in `AGENTS.md:35`).
2. Consider a Vite SSR-externals config that aborts the build if `pdfjs-dist` / `@react-pdf/renderer` is reachable from an SSR-eligible route.
3. Switch `apps/web/src/routes/templates/$.tsx:1` to a dynamic `import("@react-pdf/renderer")` inside the `useIsClient()` branch for consistency with the rest of the preview pipeline.

### Fragile: `getStorageService()` is captured at module load in router

`packages/api/src/routers/storage.ts:7` calls `getStorageService()` at module top level. Because `apps/web/src/routes/api/rpc.$.ts` constructs a new `RPCHandler` on every request, the router's storage reference is fixed for the lifetime of the Node process.

**Impact:** Switching backends (e.g. flipping S3 vars on at runtime) requires a process restart, which is normally fine — but the singleton is also held inside Nitro's HMR boundary in dev, so config changes during `pnpm dev` need a full restart (not just a save).

**Fix approach:** Call `getStorageService()` inside each handler instead, or invalidate the cached service when env values change.

### Fragile: `RPCHandler` instantiated per-request

`apps/web/src/routes/api/rpc.$.ts:8-16` creates a new `RPCHandler` (with plugins) for every incoming request. Each instance re-walks the router tree and re-constructs plugin pipelines.

**Impact:** Measurable per-request cost on high-RPS dashboards; not catastrophic but unnecessary.

**Fix approach:** Move `new RPCHandler(...)` out of the handler and reuse a module-level instance; only `getLocale()` should run per-request.

### Performance: PDF preview regenerates entire PDF on every change

`apps/web/src/components/resume/preview.browser.tsx:103-131` debounces PDF generation by 100ms and calls `pdf(resumeDocument).toBlob()` on every resume change. For multi-page resumes with images, this re-renders the full document and re-loads it into PDF.js.

**Impact:** Builder feels sluggish on slower hardware when typing into fields; CPU spikes on each keystroke after debounce.

**Mitigation in place:** `UPDATE_DEBOUNCE_MS = 100`, crossfade between staged/active layers (`:20-80`).

**Fix approach:** Long-term, switch to incremental rendering or page-level memoization keyed by section hash. Short-term, raise debounce to 200–300 ms while typing.

### Performance: font registration cost

`packages/pdf/src/hooks/use-register-fonts.ts:18, :86` keeps a module-level `registeredFontVariants` Set keyed by `family:weight:style`. Per-resume registration calls `Font.register` once per (family × weight × italic × CJK-fallback) combination, with web-font fetches resolved through `getWebFontSource`. This Set never expires — if many resumes with different typography are previewed in one session, the registered-font count grows for the page lifetime.

**Impact:** Memory grows in the builder for sessions that switch typography frequently. Not a leak in the GC sense, but bounded only by the size of the registered-font universe.

**Fix approach:** Acceptable for current usage. Document the cap and reconsider if typography switching becomes more common.

### Performance: large source files hint at oversized modules

Top offenders by line count (excluding generated/test fixtures):

| Lines | File |
|------:|------|
| 1535 | `packages/schema/src/icons.ts` (static data) |
| 1088 | `apps/web/src/routes/builder/$resumeId/-components/assistant.tsx` |
|  900 | `packages/pdf/src/templates/shared/sections.tsx` |
|  789 | `apps/web/src/components/input/rich-input.tsx` |
|  785 | `packages/import/src/reactive-resume-v4-json.tsx` |
|  685 | `packages/ui/src/components/sidebar.tsx` |
|  556 | `apps/web/src/routes/builder/$resumeId/-sidebar/left/sections/picture.tsx` |
|  543 | `packages/api/src/services/resume.ts` |

`assistant.tsx` (1088 lines) and `sections.tsx` (900 lines) are particularly likely to accumulate further complexity without splitting. `rich-input.tsx` (789 lines) is the rich-text editor — likely justifies its size but has zero direct tests.

**Fix approach:** Split `assistant.tsx` along tool boundaries; extract per-section renderers from `sections.tsx` if any individual section grows further.

### Security: `verifyPassword` rate limit keyed by `username:slug:ip`

`packages/api/src/middleware/rate-limit/index.ts:77-83` keys the resume-password limiter on `resume-password:{username}:{slug}:{clientKey}` where `clientKey` is the client IP. The window/max is 5 attempts per 10 minutes (`packages/utils/src/rate-limit.ts:43`). This is reasonable, but the global Better Auth global rule for `/two-factor/verify-otp` is also 5 per 600s. An attacker on a botnet (different IPs) is not blocked at the resource level — each IP gets its own 5/10min budget against the same resume.

**Impact:** Limited but present brute-force surface on password-protected public resumes.

**Fix approach:** Add a per-resume global cap on top of the per-IP limit (e.g. 50/hour per `username:slug` regardless of IP).

### Security: `as string` cast on password hash

`packages/api/src/services/resume.ts:487` casts `resume.password` to `string` after a `isNotNull(schema.resume.password)` WHERE clause. The cast is correct in context, but if a future refactor drops the `isNotNull` guard the cast silently allows `null` through `bcrypt.compare`.

**Fix approach:** Replace `as string` with a runtime `if (!resume.password) throw new ORPCError(...)` check.

### Security: trust of `TRUSTED_IP_HEADERS` is unconditional

`packages/utils/src/rate-limit.ts:1-7` defines a list of trusted IP headers (`CF-Connecting-IP`, `True-Client-IP`, `X-Forwarded-For`, etc.) that the rate limiter and Better Auth (`packages/auth/src/config.ts:276`) honour from any caller.

**Impact:** If the app is deployed without a proxy that strips client-supplied versions of these headers, any client can spoof their rate-limit identity by setting `X-Forwarded-For: 1.2.3.4`.

**Fix approach:** Document that operators **must** terminate at a trusted proxy (Cloudflare, nginx, Caddy) that strips inbound `X-Forwarded-For` / `X-Real-IP`. Optionally, add a `TRUST_PROXY` env flag and only honour those headers when set.

### Fragile: `cachedTransport` in `email/transport.ts` ignores env mutation

`packages/email/src/transport.ts:21-37` caches the nodemailer transport on first use. If SMTP creds change at runtime (e.g. credential rotation in a deployed instance), the cached transport keeps using the stale credentials until the process restarts.

**Fix approach:** Detect cred changes and rebuild, or document the restart-on-rotation behaviour.

### Storage gotcha: statistics cache is filesystem-bound even with S3 configured

`packages/api/src/services/statistics.ts:21-52` caches user/resume/star counts as files in `getLocalDataDirectory(env.LOCAL_STORAGE_PATH)` regardless of whether S3 is enabled.

**Impact:** When S3 is configured and `LOCAL_STORAGE_PATH` is on ephemeral storage (e.g. container scratch), the cache is recreated on every redeploy — meaning a cold start always queries the DB / GitHub API rather than re-using the cache. Also breaks horizontal scaling — each replica has its own cache file.

**Fix approach:** Cache via the configured storage service (`getStorageService`) instead of raw `fs`, or move to an in-memory + TTL cache.

---

## Low Severity

### Tech Debt: generated file you must not edit

`apps/web/src/routeTree.gen.ts` (983 lines, `eslint-disable`, `@ts-nocheck` at top) is auto-generated by TanStack Router. It is correctly excluded from Biome (`biome.json:14`) and noted in `AGENTS.md:31`.

**Action required of contributors:** Never hand-edit. Regenerate by running `pnpm dev` (TanStack tooling watches `apps/web/src/routes/**`).

### Tech Debt: dev workflow — `pnpm check` is write-capable

`package.json:20` defines `"check": "biome check --write --unsafe ."`. Running `pnpm check` will modify files. The lefthook pre-commit (`lefthook.yml:7-9`) runs the same command on staged files only, and `stage_fixed: true` re-stages them.

**Impact:** Surprise file modifications when a contributor runs `pnpm check` expecting a non-mutating audit.

**Fix approach:** Add a parallel `pnpm check:ci` (no `--write`) for inspection, and document the distinction (already covered in `AGENTS.md:103`).

### Tech Debt: dev gotcha — `drizzle-kit` does not auto-load `.env`

`packages/db/drizzle.config.ts:8` reads `process.env.DATABASE_URL || ""`. The `@reactive-resume/env` package auto-loads `.env` via dotenv (`packages/env/src/server.ts:9-11`), but `drizzle-kit` runs as a separate process that does not import `@reactive-resume/env`.

**Impact:** Fresh `pnpm db:migrate` silently fails with an empty connection string unless `DATABASE_URL` is exported in the shell. Documented in `AGENTS.md:58, :79-80`.

**Fix approach:** Either import the env package from `drizzle.config.ts` to inherit the `.env` load, or wrap the script with a one-liner that exports `DATABASE_URL`.

### Tech Debt: Nitro plugin auto-runs migrations on dev/prod boot

`apps/web/plugins/1.migrate.ts:23-40` runs migrations on every Nitro startup. This is convenient but couples app-boot health to migration health.

**Impact:**
- A bad migration takes down the whole web service on boot, not just future migration runs.
- Two app instances starting concurrently both call `migrate()`; Drizzle's `migrations` table uses transactions to avoid duplicate apply, but the race adds startup latency.
- For prod self-hosters, there is no "boot-without-migrate" knob.

**Fix approach:** Gate on an env flag (e.g. `RUN_MIGRATIONS_ON_BOOT=true`, default true) and document running `pnpm db:migrate` separately in zero-downtime deploys.

### Tech Debt: S3 toggle is all-or-nothing

`packages/api/src/services/storage.ts:336` and `apps/web/plugins/2.storage.ts:7`: storage backend selection requires all three of `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET` to be set. Setting two of three silently falls back to local storage.

**Impact:** Operator misconfigures S3 (e.g. forgets `S3_BUCKET`), app silently writes to local FS — uploads disappear on next container restart on ephemeral disks.

**Fix approach:** Treat "any S3 var set" as "S3 intended" — throw on partial config rather than silently downgrading.

### Security: no global CSP / X-Frame-Options on HTML responses

A repo-wide grep for `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security` finds them only in the uploads route (`apps/web/src/routes/uploads/$userId.$.tsx:159-165`) and the schema JSON route (`apps/web/src/routes/schema[.]json.ts`). The HTML shell (`apps/web/src/routes/__root.tsx`) sets no CSP, no HSTS, no `Permissions-Policy`, no `Referrer-Policy`.

**Impact:**
- No clickjacking protection on the resume builder or public resume pages — they can be framed by any origin.
- No CSP means an XSS through rich-text rendering (`packages/utils/src/sanitize.*`, `packages/pdf/src/templates/shared/rich-text-html.ts`) has no defence-in-depth.

**Fix approach:** Add a Nitro response hook that sets `Content-Security-Policy`, `Strict-Transport-Security`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN` on all HTML responses. Validate that the CSP allows `pdf.worker.min.mjs`, `@react-pdf/renderer` font fetches, and the configured S3/SeaweedFS origin.

### Security: OAuth dynamic-client registration allows unauthenticated callers

`packages/auth/src/config.ts:395-401` enables `allowDynamicClientRegistration: true` and `allowUnauthenticatedClientRegistration: true` on the oauthProvider plugin. The comment (`:397-399`) explicitly states this is required for MCP onboarding (RFC 7591) and that the phishing vector is closed by the redirect-URI allowlist in `hooks.before` (`:253-271`) and `apps/web/src/routes/api/auth.$.ts:97-111`.

**Impact:** Anyone can register an OAuth client. The protection depends entirely on the redirect-URI allowlist correctness in `parseAllowedHostList(env.OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS)` and `isAllowedOAuthRedirectUri`.

**Fix approach:** Already mitigated in code; the residual risk is operator misconfiguration of `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS`. Add a startup warning when `OAUTH_DYNAMIC_CLIENT_REDIRECT_HOSTS` is empty (i.e. allowlist is APP_URL-only).

### Tech Debt: log noise on auth fallthrough

`packages/api/src/context.ts:25, :37, :53` calls `console.warn` for every failed Bearer / session / API-key validation. In an unauthenticated user flow that hits the same route via Bearer-not-present → session-cookie path, no warning fires, but in an actual token-mismatch path the warning fires on every request.

**Impact:** Log volume in production when API keys expire or rotate. Logs may leak token shape information indirectly via repeated warnings.

**Fix approach:** Drop to `console.debug` (which is no-op in default Node), or rate-limit the warning per token-hash.

### Tech Debt: `getStorageService()` cached service singleton in module-load order

`packages/api/src/services/storage.ts:343-350` caches the service at first call. Combined with the `packages/api/src/routers/storage.ts:7` top-level call, if storage env vars are not present at module-load time (e.g. `.env` not loaded yet) the local backend is wired in permanently for the process.

**Fix approach:** Lazy-validate env on first use, not at module load.

### Anti-pattern: empty catch swallows preview generation errors

`apps/web/src/components/resume/preview.browser.tsx:120`:

```ts
} catch {}
```

A failed PDF generation in the builder preview is silently swallowed. The crossfade machinery keeps showing the previous preview, masking template bugs or runtime errors from contributors during development.

**Fix approach:** At minimum, `console.error` the failure (matching the pattern used in `pdf-canvas.tsx:68`). Better: surface a toast or banner so failed-preview state is visible.

### Anti-pattern: `console.warn`/`error` lacks structure

Every error log in `packages/api/src` uses `console.warn`/`console.error` with positional args (e.g. `services/resume.ts:158, :293, :363`, `context.ts:25, :37, :53`). There is no centralised logger, no structured fields, no request correlation ID.

**Fix approach:** Introduce a minimal logger (pino-light or a thin wrapper) with `level`, `event`, `userId`, `requestId` fields. Already partly done in the healthcheck (`apps/web/src/routes/api/health.ts:65, "[Healthcheck]"`).

### Fragile: in-process pub/sub for resume update events

`packages/api/src/services/resume-events.ts` (the subscribe path consumed by `packages/api/src/routers/resume.ts:99-103`'s `subscribeResumeUpdates`) is in-process. Two web replicas will not see each other's resume update events.

**Impact:** Multi-tab / multi-device builder sync across replicas does not work behind a load balancer.

**Fix approach:** Redis pub/sub or Postgres `LISTEN/NOTIFY` once distributed deployment becomes a target.

---

## Migration & Schema Concerns

### Migration count is small but each is unversioned in app

- 13 migration files in `migrations/` (`migrations/20260114102228_*` through `migrations/20260507144406_*`).
- The Nitro plugin runs every pending migration on every boot (`apps/web/plugins/1.migrate.ts:23-40`).
- There is no "down" / rollback story. Drizzle-kit generates forward-only migrations.

**Action:** Standard for drizzle workflows. Document that downgrade requires manual SQL.

### Schema notes

- `packages/db/src/schema/resume.ts:24` stores `password` as plaintext column type `text`, but content is always bcrypt-hashed at write (`packages/api/src/services/resume.ts:453`). Column name is misleading — should be `password_hash`. Renaming requires a non-trivial migration.

---

## Dependency Risk

### Pre-1.0 / preview dependencies in production critical path

| Package | Version | Risk |
|---|---|---|
| `drizzle-orm` | `1.0.0-beta.22` | Beta. Breaking changes possible until 1.0.0 stable. (`packages/api/package.json`, `packages/auth/package.json`, `packages/db/package.json`, `apps/web/package.json`) |
| `drizzle-kit` | `1.0.0-beta.22` | Beta migrator. Snapshot format may change. (`packages/db/package.json`) |
| `drizzle-zod` | `1.0.0-beta.14-a36c63d` | Beta + specific commit hash — version drift risk. (`packages/api/package.json`) |
| `nitro` | `3.0.260429-beta` | Beta server runtime in the critical path. (`apps/web/package.json`) |
| `@typescript/native-preview` | `7.0.0-dev.20260510.1` | Dev build of `tsgo`. All packages use it for `typecheck`. |
| `typescript` | `^6.0.3` | TS 6 — recent major. |
| `vite` | `^8.0.11` | Vite 8 — recent major. |
| `react` / `react-dom` | `^19.2.6` | React 19. |
| `@orpc/experimental-ratelimit` | `^1.14.2` | Explicitly experimental in the package name. (`packages/api/package.json`) |
| `@tanstack/react-start` | `^1.167.65` | TanStack Start is pre-1.x semver but not labelled beta. |
| `better-auth` | `1.6.10` (exact) | Pinned exact, not `^`. Manual upgrade required for security patches. |

**Impact:** Library upgrades in this stack are high-risk; the team must follow each upstream's release notes closely. The `BETA` / `DEV` versions also affect lockfile churn.

**Fix approach:**
- Set up Renovate / Dependabot for the beta packages specifically, so security patches are caught.
- Run `pnpm knip` and `pnpm dlx npm-check-updates` regularly (both are devDependencies, `package.json:34, :40`).

### Several heavy native dependencies are externalised at build time

`apps/web/vite.config.ts:55-57` externals `bcrypt`, `sharp`, `@aws-sdk/client-s3`. `packages/runtime-externals` is the workspace package that wraps these. Knip is configured to ignore them (`knip.json:14`).

**Risk:** Operators must ensure these are installed at runtime (covered in `Dockerfile`). Self-hosters using a Node base image without build-essentials may hit `bcrypt` build failures.

**Fix approach:** Mostly documented; consider switching `bcrypt` → `bcryptjs` (pure JS) to remove a build dependency.

---

## Cross-Cutting Hard-to-Find Logic

These are non-obvious surfaces that consumers of this map should know about before changing related code:

1. **PDF section filtering** — `packages/pdf/src/templates/shared/filtering.ts:25-60` decides which resume sections render in PDFs based on hidden flags and required title fields. Per-template visual exceptions live in each template directory; cross-template visual changes go here. Noted in `AGENTS.md:44`.

2. **React-PDF font registration & CJK fallback stack** — `packages/pdf/src/hooks/use-register-fonts.ts:68-133`. Owns standard-PDF-font handling (`isStandardPdfFontFamily`), CJK glyph-level fallback (#2986), and global hyphenation callback. Module-level registration cache (`:18`). Noted in `AGENTS.md:45`.

3. **Resume access policy** — `packages/api/src/helpers/resume-access-policy.ts`. Single source of truth for owner-vs-viewer redaction (`name` and `metadata.notes` stripped for non-owners), `NOT_FOUND`-vs-`FORBIDDEN` choice (not-found used to avoid existence disclosure), and self-view statistics exclusion. Owner-only mutations rely on SQL `WHERE userId =` clauses, not this policy — drift between SQL guards and policy is silent.

4. **Resume password cookie** — `packages/api/src/helpers/resume-access.ts`. Cookie name `resume_access_{resumeId}`, signed value is `sha256(resumeId:passwordHash)`, TTL 10 minutes, `httpOnly`, `sameSite: lax`, `secure` only when `APP_URL` starts with `https`. Forgetting to set `APP_URL=https://...` in production drops the secure flag.

5. **OAuth `authorize` request sanitization** — `apps/web/src/routes/api/auth.$.ts:6-51` strips control chars from OAuth parameters and decodes broken-but-decodable redirect URIs before passing to Better Auth. Easy to bypass if a new OAuth flow is added that does not route through this handler.

6. **Dynamic client registration coercion to public client** — `apps/web/src/routes/api/auth.$.ts:53-80` forces `token_endpoint_auth_method = "none"` for unauthenticated registrations (specifically for Claude.ai's MCP onboarding quirk). This is non-standard behaviour buried in a request preprocessor.

7. **Builder draft sync** — `apps/web/src/components/resume/builder-resume-draft.ts:46-100` manages per-resume zustand stores keyed by resume id, with debounced patch-and-resync. Failure to clean up `runtimes` Map on resume close = subscription/timer leaks.

---

## Test Coverage Gaps (Priority Map)

| Area | Source files | Test files | Priority |
|------|-------------:|-----------:|----------|
| `apps/web/src/routes/**` | 125 | 1 | **High** — covers all server handlers and the builder shell |
| `apps/web/src/routes/api/**` (rpc/auth/uploads/openapi/mcp) | ~10 | 0 | **High** — security-sensitive route handlers |
| `apps/web/src/components/resume/**` | 5 | 2 | Medium |
| `apps/web/src/dialogs/**` | ~30 | 1 (`store.test.ts`) | Medium |
| `packages/api/src/routers/**` | 7 | 0 (DTO test only) | **High** — auth-protected procedures |
| `packages/api/src/services/**` | 8 | 1 (`ai.test.ts`) | High |
| `packages/auth/src/**` | 3 | 0 | **High** — central auth config never directly tested |
| `packages/email/src/**` | ~5 | 0 | Medium |
| `packages/import/src/**` | several importers | 1 (v4) | Medium |
| `packages/pdf/src/templates/shared/**` | ~20 | 11 | Low (well covered) |

---

*Concerns audit: 2026-05-11*
