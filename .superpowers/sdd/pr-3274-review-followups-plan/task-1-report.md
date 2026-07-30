# Task 1: Harden public PDF response contract

## Implemented

- Pinned successful public PDF responses to `Content-Type: application/pdf` at the HTTP boundary.
- Kept `Cache-Control: private, no-store` hardcoded at that boundary for successful, validation-error, and service-error responses.
- Removed the unused `cacheControl` member from `createPublicResumePdf` and all affected tests/mocks.
- Updated the route regression to return a `text/plain` file from the service mock while asserting the HTTP response remains `application/pdf`.

## Verification

- `pnpm --filter server test -- src/http/public-resume-pdf.test.ts` — 13 files / 71 tests passed.
- `dotenvx run -f .env.local -- pnpm exec vitest run packages/api/src/features/resume/public-pdf.test.ts` — 1 file / 7 tests passed.
- `pnpm exec biome check apps/server/src/http/public-resume-pdf.ts apps/server/src/http/public-resume-pdf.test.ts packages/api/src/features/resume/public-pdf.ts packages/api/src/features/resume/public-pdf.test.ts` — passed.
- `pnpm --filter server typecheck` and `pnpm --filter @reactive-resume/api typecheck` — passed.

## Note

The API package test script did not scope to the supplied test path and initially ran the package suite, which has two unrelated baseline failures: `src/features/ai/url-policy.test.ts` and `src/features/resume/export.test.ts` (missing required env). The target test was then run directly with `.env.local` and passed.

## Self-review

`git diff --check` passed. The diff is restricted to the public PDF service contract, HTTP response header, and their focused tests.
