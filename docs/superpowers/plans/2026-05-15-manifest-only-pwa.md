# Manifest-Only PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Reactive Resume's service-worker and Workbox PWA behavior while keeping install metadata.

**Architecture:** Keep the manifest link and install meta tags in the web root route. Keep manifest data in
`apps/web/public/manifest.webmanifest`, keep head meta tags in `apps/web/src/libs/pwa.ts`, and remove the
service-worker registration export plus the `vite-plugin-pwa` build plugin.

**Tech Stack:** TanStack Start, Vite, TypeScript, pnpm, Vitest, Workbox removal.

---

### Task 1: Remove service-worker wiring

**Files:**
- Modify: `apps/web/index.html`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/src/libs/pwa.ts`
- Modify: `apps/web/src/routes/__root.tsx`
- Delete: `apps/web/src/libs/pwa.test.ts`

- [x] **Step 1: Remove `vite-plugin-pwa` imports and plugin usage**

In `apps/web/vite.config.ts`, remove:

```ts
import { VitePWA } from "vite-plugin-pwa";
import { pwaManifest } from "./src/libs/pwa";
```

Delete the local `pwa()` helper and remove `pwa()` from the `plugins` array.

- [x] **Step 2: Add install metadata to static HTML**

In `apps/web/index.html`, add the manifest link, icon links, theme color, and Apple/mobile install meta tags inside
`<head>` so install metadata is present without plugin HTML injection.

- [x] **Step 3: Remove dead manifest export and runtime service-worker registration**

In `apps/web/src/libs/pwa.ts`, remove the `pwaManifest` and `pwaServiceWorkerRegistrationScript` exports so the
module only owns head meta tags.

In `apps/web/src/routes/__root.tsx`, change the PWA import to:

```ts
import { pwaHeadMetaTags } from "@/libs/pwa";
```

Remove the `scripts` entry that injects `pwaServiceWorkerRegistrationScript` in production.

- [x] **Step 4: Delete obsolete PWA unit test**

Delete `apps/web/src/libs/pwa.test.ts`, because the remaining PWA surface is static manifest/head metadata.

### Task 2: Remove unused dependency graph

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [x] **Step 1: Remove direct web dependency**

Remove this dependency from `apps/web/package.json`:

```json
"vite-plugin-pwa": "^1.3.0"
```

- [x] **Step 2: Refresh lockfile narrowly**

Run:

```sh
pnpm install --lockfile-only --offline --ignore-scripts
```

Expected: the lockfile no longer contains `vite-plugin-pwa` or unused Workbox packages required only by that
plugin. If the offline lockfile refresh is unavailable, edit the lockfile narrowly and verify with git diff.

### Task 3: Validate manifest-only behavior

**Files:**
- Inspect: `apps/web/.output` or `apps/web/dist`

- [x] **Step 1: Run focused checks**

Run:

```sh
pnpm --filter web typecheck
pnpm --filter web build
```

Expected: both commands complete successfully.

- [x] **Step 2: Inspect build output for service-worker artifacts**

Run:

```sh
find apps/web/.output apps/web/dist -name 'sw.js' -o -name 'workbox-*' -o -name 'registerSW.js'
```

Expected: no service-worker or Workbox files are printed. If one output directory does not exist, the command may
print a find warning for that path; inspect the directory that exists.

- [x] **Step 3: Inspect source for removed service-worker registration**

Run:

```sh
rg -n "serviceWorker|register\\(\"/sw\\.js\"|VitePWA|vite-plugin-pwa|workbox" apps/web/src apps/web/vite.config.ts apps/web/package.json
```

Expected: no matches for the removed PWA service-worker path.
