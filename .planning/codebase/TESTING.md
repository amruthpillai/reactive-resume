# Testing Patterns

**Analysis Date:** 2026-05-11

## Test Framework

**Runner:** Vitest 4.x.
- Root devDependency in `package.json`: `"vitest": "^4.1.5"`, `"@vitest/coverage-v8": "^4.1.5"`.
- Every workspace package and `apps/web` has its own `vitest.config.ts` that delegates to the shared factory at `vitest.shared.ts`.

**DOM environment:** `happy-dom` 20.x (migrated from jsdom in commit `7a60a42a0`). Default test environment per `vitest.shared.ts:19` is `"node"`; per-package configs opt into browser-like envs.

**Assertion / testing libraries** (root `package.json` devDependencies):

- `@testing-library/react` ^16.3.2
- `@testing-library/dom` ^10.4.1
- `@testing-library/jest-dom` ^6.9.1 — registered globally in `vitest.setup.ts:1`
- `@testing-library/user-event` ^14.6.1

**Run commands** (root `package.json`):

```bash
pnpm test               # turbo run test → vitest run --passWithNoTests in every package
pnpm test:coverage      # turbo run test:coverage → adds --coverage flag
pnpm test:ci            # adds GitHub Actions, JSON, and JUnit reporters
pnpm test:agent         # agent-friendly reporter + JSON output for agentic runs
```

Per-package commands (uniform across all packages, see `packages/api/package.json:13-19`):

```bash
pnpm --filter @reactive-resume/utils test
pnpm --filter @reactive-resume/api test
pnpm --filter web test
```

Vitest test paths are package-relative when filtering: `pnpm --filter @reactive-resume/utils test -- src/string.test.ts`.

## Shared Vitest Configuration

`vitest.shared.ts` exports `createVitestProjectConfig({ name, dirname, environment, plugins })`. Highlights:

- `root: dirname` — each package runs in isolation.
- `envDir: workspaceRoot` — `.env` at repo root is loaded for every package.
- `resolve: { tsconfigPaths: true }` — TS path aliases resolve from the package's own `tsconfig.json`.
- `setupFiles: [./vitest.setup.ts]` — global hooks applied to all projects.
- `include: ["src/**/*.{test,spec}.?(c|m)[jt]s?(x)"]` — both `.test.*` and `.spec.*` are picked up.
- `exclude: ["node_modules", "dist", ".output", "coverage", "reports"]`.
- `pool: "threads"`, `isolate: false` — fast threaded execution with shared module state inside a worker.
- `passWithNoTests: true` — packages without tests don't fail CI.
- `environmentOptions.happyDOM` disables JS/CSS file loading and navigation for safety.

Coverage is configured directly in `vitest.shared.ts:49-56`:

- Provider: `v8`
- Output: `./coverage` per package
- Reporters: `text`, `text-summary`, `json-summary`, `json`, `lcov`, `html`
- Include: `src/**/*.{ts,tsx}`
- Exclude: `src/**/*.{test,spec}.*`, `src/**/*.d.ts`, `src/routeTree.gen.ts`
- `reportOnFailure: true`

No global coverage thresholds are enforced (no `thresholds: {...}` block). Per-package coverage HTML lives under each package's `coverage/` directory after `pnpm test:coverage`.

## Global Setup (`vitest.setup.ts`)

Applied to every project:

1. `import "@testing-library/jest-dom/vitest"` — registers `toBeInTheDocument`, `toHaveAttribute`, etc.
2. `afterEach(() => cleanup())` — explicit RTL cleanup (Vitest doesn't expose `afterEach` globally without `test.globals: true`).
3. Polyfills for jsdom/happy-dom gaps: `ResizeObserver`, `IntersectionObserver`, `Element.prototype.scrollIntoView`, `window.matchMedia` (used by `cmdk`, Base UI, `next-themes`).

## Per-Package Vitest Configs

All `vitest.config.ts` files reuse the shared factory. Notable variants:

- **Node default** (`packages/utils/vitest.config.ts`, `packages/api/vitest.config.ts`, `packages/db/vitest.config.ts`, `packages/schema/vitest.config.ts`, `packages/ai/vitest.config.ts`, `packages/email/vitest.config.ts`, `packages/fonts/vitest.config.ts`, `packages/env/vitest.config.ts`, `packages/auth/vitest.config.ts`, `packages/import/vitest.config.ts`, `packages/pdf/vitest.config.ts`, `packages/config/vitest.config.ts`) — `environment: "node"`.
- **DOM** (`packages/ui/vitest.config.ts:7`) — `environment: "happy-dom"` for component tests.
- **Web app** (`apps/web/vitest.config.ts`) — `environment: "node"` plus Vite plugins to mirror dev: `@tailwindcss/vite`, `@lingui/vite-plugin` (with `linguiTransformerBabelPreset`), and `@rolldown/plugin-babel`. Individual web tests opt into the DOM via the `@vitest-environment happy-dom` file-level comment.

Per-test environment overrides (declared at the top of the file as `// @vitest-environment happy-dom` or in a `/** @vitest-environment happy-dom */` block):

- `packages/utils/src/sanitize.test.ts`
- `packages/utils/src/file.test.ts`
- `apps/web/src/components/resume/preview.browser.test.tsx`
- `apps/web/src/components/resume/preview.shared.test.tsx`
- `apps/web/src/components/typography/combobox.test.tsx`

## Test File Organization

**Location:** Co-located with implementation. `foo.ts` lives next to `foo.test.ts` (or `foo.test.tsx` for React).

**Naming:**
- `<name>.test.ts` — Node/pure logic (e.g. `packages/utils/src/string.test.ts`).
- `<name>.test.tsx` — JSX/component tests (e.g. `packages/ui/src/components/button.test.tsx`).
- `<name>.node.test.ts` — Node-only modules whose implementation is also `.node.ts` (e.g. `packages/utils/src/url-security.node.test.ts`, `packages/utils/src/monorepo.node.test.ts`).
- No `.spec.*` files in the repo today, but the include pattern supports them.

**Test counts (current):** 127 `*.test.ts` files + 98 `*.test.tsx` files across `packages/` and `apps/web/src/`.

**Hot spots (where coverage is densest):**

- `packages/utils/src/*.test.ts` — string, color, html, date, level, locale, sanitize, rate-limit, field, file, network-icons, style, url, url-security.node, monorepo.node, plus `resume/patch.test.ts`.
- `packages/ui/src/components/*.test.tsx` — ~30+ component tests (button, dialog, alert, badge, card, combobox, command, popover, scroll-area, sidebar, switch, tabs, textarea, toggle, tooltip, etc.).
- `packages/pdf/src/templates/shared/*.test.ts` — columns, section-links, rich-text, metrics, picture, filtering.
- `packages/pdf/src/section-title.test.ts` and `packages/pdf/src/hooks/use-register-fonts.test.ts`.
- `packages/api/src/{dto,helpers,services}/*.test.ts` — `dto/resume`, `helpers/resume-access-policy`, `services/ai`.
- `packages/schema/src/{templates,page}.test.ts` and `packages/schema/src/resume/{data,default}.test.ts`.
- `packages/ai/src/{tools,resume}/*.test.ts` — patch-proposal, sanitize, extraction-template.
- `packages/import/src/reactive-resume-v4-json.test.ts`, `packages/fonts/src/index.test.ts`.
- `apps/web/src/libs/{pwa,locale,theme,error-message}.test.ts`, `apps/web/src/dialogs/store.test.ts`, `apps/web/src/components/resume/preview.{browser,shared}.test.tsx`, `apps/web/src/components/typography/combobox.test.tsx`.

## Test Structure Patterns

**Idiomatic skeleton** (from `packages/utils/src/string.test.ts:1-21` and `packages/api/src/helpers/resume-access-policy.test.ts:1-17`):

```typescript
import { describe, expect, it } from "vitest";
import { thingUnderTest } from "./thing";

describe("thingUnderTest", () => {
    it("returns X for Y", () => {
        expect(thingUnderTest(input)).toBe(expected);
    });

    it("returns Z for empty input", () => {
        expect(thingUnderTest("")).toBe("");
    });
});
```

**Patterns observed:**

- Top-level `describe` per exported function; nested `describe` blocks group behaviors.
- One assertion focus per `it` — short, declarative names ("returns X", "throws Y when Z", "does not mutate the input").
- Negative cases are first-class — every helper has tests for `null`, empty string, unknown shapes, etc.
- `it.each([...] as const)("variant=%s renders without throwing", (variant) => {...})` for matrix tests over discriminated union variants (see `packages/ui/src/components/button.test.tsx:55-79`).
- Setup with `beforeEach` / `afterEach` is used only when needed (timers, temp dirs, store reset). Example: `apps/web/src/dialogs/store.test.ts:4-13` resets a Zustand store between tests with `useDialogStore.setState(...)`.
- Temp directories use `fs.mkdtempSync` + `realpathSync` and are torn down in `afterEach` (`packages/utils/src/monorepo.node.test.ts:7-17`).
- Fake timers via `vi.useFakeTimers()` / `vi.advanceTimersByTime(300)` for animation/transition assertions (`apps/web/src/dialogs/store.test.ts:54-65`).

## Mocking

**Library:** Vitest's built-in `vi` (no Jest). Used sparingly — most tests cover pure functions.

**Patterns:**

- `vi.fn()` for callback assertions: `expect(onClick).toHaveBeenCalledOnce()` (`packages/ui/src/components/button.test.tsx:32-37`).
- `vi.fn().mockResolvedValue(true)` for async handlers (`apps/web/src/dialogs/store.test.ts:86-93`).
- `vi.mock("module-path", () => ({ ... }))` for replacing modules. Heaviest example: `apps/web/src/components/resume/preview.browser.test.tsx:25-81` mocks `@react-pdf/renderer`, `@/libs/resume/pdf-document`, `./builder-resume-draft`, and `./pdf-canvas` so the preview component can be exercised without React PDF.
- `vi.hoisted(() => ({ ... }))` to share mutable state with hoisted `vi.mock` factories (`apps/web/src/components/resume/preview.browser.test.tsx:8-12`). This is required because `vi.mock` calls are hoisted above imports.
- Spies via `vi.spyOn` are rare; mock modules are preferred so the real implementation stays out of scope.

**Test data / fixtures:**

- No central `fixtures/` directory. Tests build minimal objects inline or extend canonical defaults from the schema package:
  - `import { defaultResumeData } from "@reactive-resume/schema/resume/default"` (used by `packages/api/src/helpers/resume-access-policy.test.ts:2`).
  - `import { sampleResumeData } from "@reactive-resume/schema/resume/sample"` (used by `apps/web/src/components/resume/preview.browser.test.tsx:5`).
- Local helper builders are inlined per test file (e.g. the `resumeDataWithPageCount` helper at `apps/web/src/components/resume/preview.browser.test.tsx:14-23`).

## React Component Testing

**Render + query** via Testing Library (`packages/ui/src/components/button.test.tsx`):

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

render(<Button onClick={onClick}>Click</Button>);
await userEvent.click(screen.getByRole("button"));
```

**Accessibility-first queries:** `getByRole("button", { name: "..." })` is the default; `aria-label` is asserted explicitly (`packages/ui/src/components/button.test.tsx:81-84`).

**Slot / data-attr conventions:** Components expose `data-slot` for shadcn/Base UI slotting and tests assert it (`button.test.tsx:22-25`).

**Async UI:** Use `waitFor` from `@testing-library/react` and `await userEvent.*`. The `cleanup()` afterEach in `vitest.setup.ts` ensures DOM doesn't leak between tests despite `isolate: false`.

## Reporters

Per-package `package.json` scripts (uniform pattern, e.g. `packages/api/package.json:15-18`):

- `test` → `vitest run --passWithNoTests`
- `test:coverage` → `vitest run --coverage --passWithNoTests`
- `test:ci` → `vitest run --coverage --reporter=default --reporter=github-actions --reporter=json --reporter=junit --outputFile.json=reports/vitest-results.json --outputFile.junit=reports/vitest-junit.xml --passWithNoTests`
- `test:agent` → `vitest run --reporter=agent --reporter=json --outputFile.json=reports/vitest-results.json --passWithNoTests`

The `agent` reporter is a Vitest 4 feature optimized for LLM-driven runs; `pnpm test:agent` is the canonical script to use when an agent needs structured pass/fail data.

JUnit + JSON outputs land in `reports/` inside each package (Biome-ignored).

## CI

- **`.github/workflows/autofix.yml`** — runs on every PR and push to `main`. It runs `pnpm knip --fix` and `pnpm check`. **It does NOT run `pnpm test`.** Tests are not currently gating CI.
- **`.github/workflows/docker-build.yml`** — `workflow_dispatch` only; builds multi-arch images. No test step.
- **`.github/workflows/crowdin-sync.yml`** — translation sync only.

Tests are run locally (`pnpm test`) or by agents via `pnpm test:agent` / `pnpm test:ci`. No PR is currently blocked by a failing test on GitHub Actions.

## Test Types

- **Unit tests** — Dominant. Pure functions in `packages/utils`, `packages/schema`, `packages/pdf/src/templates/shared`, `packages/api/src/{helpers,dto}` are exercised in isolation.
- **Component tests** — `packages/ui/src/components/*.test.tsx` and a handful in `apps/web/src/components/`. Driven by `@testing-library/react` + `happy-dom` (file-level override) or `packages/ui`'s package-level `environment: "happy-dom"`.
- **Integration tests** — None against the live Drizzle client or the running TanStack Start server. `apps/web/src/components/resume/preview.browser.test.tsx` is the closest, mocking React PDF and exercising the preview pipeline end-to-end in happy-dom.
- **E2E / browser tests** — Not present. No Playwright, Cypress, or `vitest --browser` config.

## Common Patterns

**Async error testing:**

```typescript
expect(() => assertCanView({ userId: "u1", isPublic: false }, null)).toThrow();
try {
    assertCanView({ userId: "u1", isPublic: false }, null);
    expect.unreachable();
} catch (error: unknown) {
    expect((error as { code?: string }).code).toBe("NOT_FOUND");
}
```
(See `packages/api/src/helpers/resume-access-policy.test.ts:29-44`.)

**Immutability assertions:**

```typescript
const before = JSON.stringify(resume);
redactResumeForViewer(resume, false);
expect(JSON.stringify(resume)).toBe(before);
```
(See `packages/api/src/helpers/resume-access-policy.test.ts:86-93`.)

**Time-sensitive logic:** UUIDv7 ordering is verified with a `setTimeout` and a string compare instead of mocking time (`packages/utils/src/string.test.ts:15-20`).

## Coverage Gaps Worth Flagging

These areas have implementation but no `*.test.*` files alongside them today — agents adding features here should consider adding tests.

- **`packages/email/src/transport.ts` and templates** — no tests. SMTP transport is untested.
- **`packages/env/src/server.ts`** — no tests for env-var schema validation.
- **`packages/auth/`** — no tests; Better Auth config and helpers are uncovered.
- **`packages/api/src/services/{resume,storage,statistics,auth,flags,resume-events}.ts`** — only `ai.ts` has a service-level test (`ai.test.ts`). Most resume mutation flow logic is exercised only indirectly through `helpers/resume-access-policy.test.ts` and `dto/resume.test.ts`.
- **`packages/api/src/routers/*`** — no router-level tests. End-to-end oRPC procedure behavior (auth + rate limit + service composition) is not asserted.
- **`packages/api/src/middleware/rate-limit/*`** — no tests.
- **`packages/db/src/schema/*`** — no tests (schema correctness is implicit, but no migration roundtrip tests).
- **`packages/scripts/`** — no tests.
- **`packages/runtime-externals/`** — no tests.
- **`apps/web/src/routes/**`** — route handlers (`api/rpc.$.ts`, `api/auth.$.ts`, `api/health.ts`, `uploads/...`, `mcp/...`, `auth/oauth.ts`) and most builder UI under `routes/builder/$resumeId` are uncovered.
- **`apps/web/src/dialogs/**`** — only `store.test.ts` covers the dialog store. Individual dialog components (resume create/update/import, two-factor, api-key) are uncovered.
- **`packages/pdf/src/templates/{azurill,bronzor,...}`** — individual template renderers have no tests; only the shared primitives in `templates/shared/` are covered.

When adding tests in any of these areas, follow the colocation rule (`foo.ts` ↔ `foo.test.ts`) and reuse `defaultResumeData` / `sampleResumeData` from `@reactive-resume/schema/resume/*` instead of inventing new fixtures.

---

*Testing analysis: 2026-05-11*
