# 06 — Verify image upload and PDF delivery across storage backends

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05). **Status:** needs_reproduction after historical ACL fix; two distinct failure boundaries.  
**Priority:** P1 diagnosis. **Effort:** 1–2 days controlled storage matrix; 1–2 days per proved defect. **Risk:** Medium/high: public/private object boundaries and external image fetching.  
**Issues:** [#2684](https://github.com/amruthpillai/reactive-resume/issues/2684), [#2778](https://github.com/amruthpillai/reactive-resume/issues/2778).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/api/src/features/storage/service.ts' 'packages/api/src/features/storage/router.ts' 'apps/server/src/static/uploads.ts' 'apps/server/src/http/app.ts' 'packages/api/src/features/resume/export.ts' 'packages/pdf/src/server.tsx' 'packages/pdf/src/browser.tsx' 'packages/pdf/src/templates/shared/primitives.tsx'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Issue-specific evidence and grouping limits

| Issue | Reported symptom and current evidence | Acceptance and closure |
| --- | --- | --- |
| #2684 | Coolify/AWS with Garage S3: browser upload 500 despite health check and successful CLI write. Historical object ACL incompatibility was addressed by merged PR #3432. Current `S3StorageService.write` sends no ACL; public files are read through the application. Exact current Garage failure response is missing. | UI upload using the same key prefix, content type and endpoint policy succeeds; returned app URL serves correct bytes; confirm affected deployment includes the fix. CLI put/health alone are insufficient. |
| #2778 | Early v5/Browserless plus external SeaweedFS/MinIO/nginx: image appears in UI but is missing from PDF. A comment identified historical `getByIdForPrinter` localhost rewriting and unchecked 404 HTML converted to JPEG. Current renderer uses React PDF directly; that old printer path is not current implementation. | Same uploaded picture appears in builder PDF and server/public export through the deployment proxy, with valid image bytes/MIME. Test exact failing image URL topology before closure. |

The shared opportunity is an upload → public delivery → browser/server PDF fixture. A common remaining root cause is **not** proved. Upload authorization and image fetching/rendering are independent phases. Do not fix the obsolete Browserless route or patch built SSR bundles.

## Ownership, dependencies, and exact fixture

`packages/api/src/features/storage/service.ts`: `getStorageService`, `S3StorageService.write/read`, `processImageForUpload`, `uploadFile`, `buildPublicUrl`. `packages/api/src/features/storage/router.ts`: authenticated upload contract. `apps/server/src/static/uploads.ts`: `handleUpload`, public path checks, content type, ETag. `apps/server/src/http/app.ts` mounts both `/api/uploads/*` and `/uploads/*`. `packages/api/src/features/resume/export.ts` creates server export; `packages/pdf/src/server.tsx` and `browser.tsx` feed the same `ResumeDocument`; `packages/pdf/src/templates/shared/primitives.tsx` receives picture URLs. Changes to transport should not alter picture fit/layout.

Controlled image fixture: generate a PNG in the test with installed `fast-png` (available to the PDF package): width 4, height 4, 4 channels, 8-bit RGBA, alternating opaque red `[255,0,0,255]` and blue `[0,0,255,255]` pixels by `(x+y)%2`. Encode via `encode({width:4,height:4,data:new Uint8Array(pixels),channels:4,depth:8})`. Use fake owner ID, MIME `image/png`, and no personal photograph. Also generate a JPEG using installed `sharp` for integration fixtures where real image processing is exercised; existing storage unit tests mock sharp and therefore do not validate native decoding. Serve variants with correct image bytes, 404 HTML, wrong content type, redirect, and truncated bytes from an isolated controlled HTTP server.

For real-backend verification, operator supplies separate disposable buckets for Garage and SeaweedFS/MinIO plus local storage directory. Credential values remain in git-ignored environment files. Health checks use a different operation than application upload, so capture actual operation/key-prefix/content-type metadata, not credentials.

## Diagnostic and conditional implementation steps

1. Build a phase record for each issue: browser upload response, object write outcome, returned app URL path, public GET status/MIME/signature, browser PDF render, server PDF render. For #2684 compare SDK and successful CLI permissions for **the same** prefix/body/MIME; for #2778 fetch from both browser and server network namespaces. Verification: identify the first failing phase, not merely "S3 works" or "PDF blank".
2. Run existing storage and upload handler tests below. Extend `apps/server/src/static/uploads-s3.test.ts` for authenticated S3 reads and `packages/api/src/features/storage/service.test.ts` for exact PutObject parameters. Preserve omission of ACL. Verification: BucketOwnerEnforced/ACL-rejecting fixture accepts current write, response returns app proxy URL, content type remains image/png. A mock SDK does not establish Garage compatibility; label it correctly.
3. Upload the controlled PNG through the actual UI/API with image processing enabled and disabled, then GET both supported app URL forms. Check PNG/JPEG signature, content type, nonzero bytes and decoded dimensions. Test local storage and each available disposable S3 backend. Verification: bytes decode and private `agent` paths remain inaccessible via the public route; path traversal remains rejected and conditional GET still returns 304.
4. Attach the delivered URL to a default synthetic resume and render using both `createResumePdfBlob` and `createResumePdfFile`. Use standard fonts or current bundled fonts to remove network-font noise. Rasterize page 1 with the existing PDF.js test approach and assert visible red/blue picture pixels; do not compare PDF file bytes (metadata can differ). Serve 404 HTML/truncated-image variants and capture the failure behavior. Verification: valid fixture visibly renders in both paths; invalid image never becomes falsely accepted JPEG data.
5. Branch on the first failure. ACL error on a deployment lacking #3432 → deploy existing fix, no new source change. Endpoint/path-style/permission error → narrow deployment configuration guidance. Wrong public route/reverse-proxy bytes → fix URL construction/routing only with a failing current test. Browser-only success/server-only failure → diagnose DNS, TLS, redirect, and reachability before considering a bounded server asset adapter. Any new remote fetch logic must retain URL security, bounded byte/time budgets and existing privacy checks; do not add a global localhost rewrite or unrestricted proxy.
6. Implement only the observed branch when a future operator asks to execute this plan; retain the phase fixture as a red/green regression. Run the exact affected topology on a disposable production build, then have the operator retest the deployed digest. Close #2684 and #2778 independently according to the table, even if one shared transport change fixes both.

## Commands and acceptance matrix

Executed planning baseline: storage service 11 tests and AI service 18 tests passed together; full server suite 105 passed (four DB-gated OAuth tests skipped); API/server typechecks and boundaries passed. The actual Garage/SeaweedFS/nginx topology and PDF picture fixture were not exercised in this planning pass.

```bash
rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/storage/service.test.ts
rtk proxy pnpm --filter server exec vitest run src/static/uploads.test.ts src/static/uploads-s3.test.ts
rtk proxy pnpm --filter @reactive-resume/api --filter server typecheck
rtk proxy pnpm exec turbo boundaries
```

For new renderer delivery integration coverage, proposed file `packages/pdf/src/image-delivery.integration.test.tsx` should use real encoding/rendering and an isolated HTTP fixture; run `rtk proxy pnpm --filter @reactive-resume/pdf exec vitest run src/image-delivery.integration.test.tsx` after creating it. UI end-to-end pattern is `tests/e2e/specs/resume-lifecycle.spec.ts`; keep storage configuration isolated from other E2E workers. If transport code changes, include PDF typecheck: `rtk proxy pnpm --filter @reactive-resume/pdf typecheck`.

Required red/green cases: correct PNG and JPEG, processing toggle, app URL aliases, no ACL request, prefix-limited write, missing object, 404 HTML, malformed bytes, private object denial, traversal denial, 304 cache response, and valid picture visible in browser/server output. Fail only the observed defect on baseline; retain negative security cases unchanged.

## Done, stop conditions, defaults, and maintenance

STOP if no actual current failing operation/response can be captured or a topology cannot be recreated without production credentials. Do not add bucket-public ACLs, relax object privacy, suppress decoding errors into success, fetch arbitrary URLs on behalf of users, or change image geometry. Preserve local-storage fallback, S3 path-style configuration, MIME handling, image-processing default, and public URL compatibility. Any additional dependency needs demonstrated need and correct runtime ownership. Keep request-shape tests alongside storage adapters and visible-output regression alongside rendering; their combination prevents mistaking health/CLI success for application compatibility.

## Exact current source anchors

Line numbers are from the planned base; re-read after any source drift.

`packages/api/src/features/storage/service.ts:254`:

```ts
	async write({ key, data, contentType }: StorageWriteInput): Promise<void> {
		// BucketOwnerEnforced rejects object ACLs. Public files use the application proxy
		// with authenticated S3 reads; private attachments retain their access checks.
		const command = new PutObjectCommand({
			Bucket: this.bucket,
			Key: key,
			Body: data,
			ContentType: contentType,
		});

		await this.client.send(command);
	}
```

`apps/server/src/static/uploads.ts:5`:

```ts
export async function handleUpload(request: Request) {
	const { userId, filePath } = parseRouteParams(request.url);

	if (!userId || !filePath) return new Response("Bad Request", { status: 400 });

	if (!isValidPath(userId) || !isValidPathSegments(filePath)) return new Response("Forbidden", { status: 403 });
	if (isPrivateUploadPath(filePath)) return new Response("Not Found", { status: 404 });

	const storageService = getStorageService();
	const key = `uploads/${userId}/${filePath}`;
	const storedFile = await storageService.read(key);
	if (!storedFile) return new Response("Not Found", { status: 404 });
```

`packages/api/src/features/storage/service.ts:346`:

```ts
export async function uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
	const key = buildFileKey(input.userId, input.contentType);
	await getStorageService().write({ key, data: input.data, contentType: input.contentType });
	return { key, url: buildPublicUrl(key) };
```

`packages/pdf/src/server.tsx:22`:

```ts
	const data = parseResumeData(input);
	const document = createElement(ResumeDocument, {
		data,
		template: template ?? data.metadata.template,
		resolveSectionTitle,
	}) as Parameters<typeof renderToBuffer>[0];
	const buffer = await renderToBuffer(document);
```

