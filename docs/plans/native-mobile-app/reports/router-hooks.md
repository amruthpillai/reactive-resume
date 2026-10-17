# Component router root correction

Branch: `mobile/router-hooks`. Base: `720215d26` on `mobile/native-app`.
Worktree: `/Users/amruth/Projects/reactive-resume/.worktrees/mobile-router-hooks`.

## Change

Android activity recreation can leave the process-global Expo router unbound after an old root cleans up. Mounted callers now obtain navigation from public `useRouter()`, which captures the current root queue independently of the global bridge.

- Converted every assigned global-router import across 36 production files: auth screens/callback, tab/editor/workspace shells, document and application workflows, Write, Check, Share, letters, and Page.
- Standalone server continuation and Check fix helpers receive the owning component's router explicitly. Both Check screen and page-pin callers pass it through; navigation targets and field parameters are unchanged.
- Callback mount navigation and tablet pane redirect effects include the captured router in their dependencies. Other captured navigation callbacks are created inside their owning component.
- Updated four existing harness mocks to expose their existing navigation spies through `useRouter()`. Check helper scenarios pass the spy explicitly; existing navigation and mutation assertions remain.
- Only the three excluded chat-owned files still import global `router`: `assistant-screen.tsx`, `page-marks.tsx`, and `provider.tsx`. SessionGate was already corrected in the base and is unchanged here.

No native internals, config, dependencies, catalogs, or ledger changes. Existing installed dependencies were linked into this isolated checkout; pnpm dependency preflight was disabled for checks. The initial Check harness lacked web dependency links in this checkout; it passed after linking the existing web dependencies, with no dependency installation or source workaround.

## Validation

- Mobile typecheck: pass.
- All 16 existing `reports/*/verify.mjs` harnesses: pass, including Check navigation (17 scenarios), settings sign-out/server switch, and Assistant completion (17 transport plus 19 integration scenarios).
- Repository `lint:agent` and `format:check`: pass.
- Package boundaries: pass, 1458 files / 23 packages.
- Diff whitespace and ownership/singleton-import inventory: pass.

Test-audit scope: mock updates preserve existing behavior checks after replacing an ambient dependency with the public hook or an explicit argument. No duplicate lifecycle suite or test-only production seam was added. Parent owns the real-React SessionGate/router-root regression; Android worker owns release recreation verification. No native build, simulator, server, publication, push, or external service was run. Hindsight lookup failed and contributed no facts.
