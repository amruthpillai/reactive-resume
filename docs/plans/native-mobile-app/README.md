# Native mobile app for Reactive Resume

- **Status**: Plan. No phase started.
- **Written against**: `7d272a0d8` on `main` (2026-10-17). Re-check every quoted excerpt against HEAD before acting; match by code, not by line number.
- **Owner**: Amruth Pillai. Decisions marked **(owner)** were made by the owner and are not open for re-litigation by agents.
- **Executors**: Claude Code and Codex agents launched through Paseo. Coordinator is a Claude Code session.
- **Companion files** (created during execution, all in this folder):
  - `ledger.md`: task board, written only by the coordinator.
  - `reports/<task-id>.md`: one hand-back report per task, written by the agent that did the task.
  - `decisions.md`: architecture decision record, produced in Phase 1.
  - `mockups/`: Phase 2 deliverables.

This plan has three phases:

1. **Architecture.** Confirm the framework choice with three spikes, then freeze the architecture.
2. **Design.** Mobile mockups of every screen, adapted from the desktop app, in the Desk & Paper look.
3. **Build.** Parallel Claude Code and Codex agents build the app in waves and review each other's work. Reviews and tests are kept minimal at first.

---

## 0. Decisions already made by the owner

| Topic                    | Decision                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Not a WebView            | No WebView for any screen or for the PDF renderer. **(owner)**                                                                                                                             |
| Resume preview           | Rendered on the device. The TypeScript templates run on Hermes, and the Forme engine is compiled from its Rust crate into a native module. **(owner)**                                     |
| v1 scope                 | Full parity with the web app (exclusions listed in §5.10). **(owner)**                                                                                                                     |
| Sign-in                  | OAuth 2.1 authorization code + PKCE in the system browser, against any Reactive Resume server the user enters. Default server is `https://rxresu.me`. **(owner)**                          |
| iOS minimum              | iOS 17.4, because https callbacks in `ASWebAuthenticationSession` need it. Android minSdk 24. **(owner)**                                                                                  |
| Account security screens | Password, 2FA, passkeys, linked accounts and email change open the web settings page in an in-app browser tab. Profile, API keys, data export and account deletion are native. **(owner)** |
| Sign in with Apple       | Add it to the server as an env-gated social provider. **(owner)**                                                                                                                          |
| Rich text                | Native editor (`react-native-enriched`), HTML in and out. Marks it cannot represent are dropped when that field is edited and saved. Extend later. **(owner)**                             |
| Offline                  | Offline edit queue for resumes and letters, with a conflict check on reconnect. **(owner)**                                                                                                |
| Notifications            | Local, on-device reminders only (interviews, follow-ups). No push server. **(owner)**                                                                                                      |
| Devices and distribution | iPhone, iPad, Android phones and tablets. Store-ready: TestFlight and the Play internal track. **(owner)**                                                                                 |
| Code location            | `apps/mobile` in this monorepo. The Rust bridge lives in `packages/forme-native`. **(owner)**                                                                                              |
| Design                   | Desk & Paper look, delivered as interactive HTML mockups with phone and tablet frames, light and dark. **(owner)**                                                                         |
| Orchestration            | Paseo. **(owner)**                                                                                                                                                                         |
| Integration              | Local branches. The coordinator merges into `mobile/native-app`. Nothing is pushed and no PRs are opened unless the owner asks. **(owner)**                                                |

---

## 1. Phase 1: Architecture

### 1.1 What the codebase tells us

These facts decide the framework. Each was checked in the source.

1. **About 14k lines of PDF rendering are TypeScript with no DOM dependency.**
   - 17 templates live in `packages/pdf/src/templates/*`, about 11.3k lines. `templates/shared/sections.tsx` alone is 1,620 lines.
   - They are drawn through a custom `react-reconciler` 0.34 renderer (`packages/pdf/src/forme/reconciler.ts`).
   - They are converted to Forme JSON by `forme/to-forme.tsx` (1,050 lines) and `forme/style.ts` (510 lines).
   - The conversion carries many workarounds for Forme defects. They are listed in the memory note `forme-quirks.md` and in `plans/forme-upstream-simplification-report.md`.
   - The semantic CSS compiler is in `packages/resume/src/stylesheet`.
   - **The engine boundary is small.** `FormeEngine` in `packages/pdf/src/forme/render.ts:27-31` is one async `renderSerializedDocWithLayout(doc)` plus an optional `prepareFont(bytes, text)`. `packages/pdf/src/browser.tsx` (82 lines) is the whole browser adapter.
2. **The Forme engine is Rust.**
   - `@formepdf/core` 0.28.0 ships a 6.9 MB `forme_bg.wasm` built from the crate **`forme-pdf` 0.28.0**, which is on crates.io (repository `github.com/formepdf/forme`).
   - Its API is document JSON in and PDF bytes plus a layout out.
   - Hermes can't run it as WASM. Hermes WebAssembly is an early preview and not production-ready ([announcement](https://x.com/tmikov/status/2023821160241393839)). The crate can be compiled natively for iOS and Android instead.
3. **The shared domain packages are `runtime:universal` TypeScript.**
   - `@reactive-resume/schema` uses zod 4.
   - `@reactive-resume/resume` provides JSON Patch, ATS and section-sort.
   - `@reactive-resume/import` and `@reactive-resume/utils`.
   - They need only small polyfills (`crypto.getRandomValues`, `structuredClone`).
4. **The API is typed end to end.**
   - The web app imports the router type with `import type router from "@reactive-resume/api/routers"` (`apps/web/src/libs/orpc/client.ts:2`).
   - The OpenAPI 3.1 spec (`docs/spec.json`, 191 operations) is a superset of `/api/rpc`. It adds binary exports, `checks`, `pdf-checks` and `file-imports`.
5. **Auth already supports native clients.**
   - The `oauthProvider` plugin is configured in `packages/auth/src/config.ts:396-425`.
   - Dynamic client registration needs no authentication, and PKCE works.
   - Bearer access tokens are accepted by `protectedProcedure` (`packages/api/src/context.ts:76-103`).
   - Custom-scheme redirects are rejected (`packages/utils/src/url-security.node.ts:135-157`). Https redirects are accepted.
6. **Strings already exist in 55 locales.** Catalogs are in `apps/web/locales/*.po` (Lingui 6), and RTL is supported.

### 1.2 Options compared

The work is done by agents, so the cost that matters is how much code must be written, kept in sync and verified, not hours.

| Criterion                                          | React Native (Expo)                                                                                                                                                                                  | Flutter                                                     | Swift + Kotlin                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Reuse of PDF templates and adapter (~14k TS lines) | **Runs as-is on Hermes**, behind a new `./native` adapter                                                                                                                                            | Rewrite in Dart, or embed a JS engine (QuickJS)             | Rewrite twice, or embed JavaScriptCore / QuickJS on each platform |
| Reuse of schema, patch, ATS, import, i18n catalogs | Direct imports                                                                                                                                                                                       | Rewrite, or use generated models only                       | Rewrite twice                                                     |
| API client                                         | Typed oRPC client, same as web                                                                                                                                                                       | OpenAPI-generated Dart; SSE by hand                         | Two OpenAPI generators; SSE by hand twice                         |
| Forme engine                                       | Rust crate → native module (C ABI)                                                                                                                                                                   | Rust crate → `flutter_rust_bridge`                          | Rust crate → C ABI, twice                                         |
| UI performance for this app (forms, lists, sheets) | Fabric + Hermes V1; 60 fps is achievable                                                                                                                                                             | Excellent                                                   | Best                                                              |
| PDF render per edit                                | Native Rust engine; JS tree build (~tens of ms, see the 37–150 ms browser figures in `issue-3593` notes)                                                                                             | Native Rust; but the template logic would have to be ported | Native Rust; same porting problem                                 |
| Install size, hello world                          | Mid. Published numbers conflict: 5–34 MB depending on method ([1](https://tech-insider.org/sv/flutter-vs-react-native-2026/), [2](https://github.com/zero-one-group/flutter-react-native-benchmark)) | Mid. 8–17 MB in the same sources                            | Smallest. Platform UI frameworks are free                         |
| Size added by this app                             | Forme native lib (measure in spike S1) + Hermes bytecode                                                                                                                                             | Forme lib + Dart AOT                                        | Forme lib only                                                    |
| Agent build speed                                  | Highest. Same language, lint and conventions as the repo; one codebase                                                                                                                               | One codebase, new language                                  | Two codebases, every feature built and reviewed twice             |
| Drift risk against web                             | Low. Shared packages enforce one data shape                                                                                                                                                          | Medium                                                      | High                                                              |

**Verdict: React Native with Expo.**

- Native Swift/Kotlin wins on raw size and speed. But its edge over RN is small for a forms app, and it doubles every feature and forces a second and third copy of the template renderer.
- Flutter wins on UI smoothness, but loses all TypeScript reuse, which is the most valuable asset here.
- The heavy work, PDF layout, runs as native Rust in all three options anyway.

**Pins** (re-check when Phase 3 starts):

- Latest stable Expo SDK. As of 2026-10-17 that is SDK 57 on React Native 0.86.3 with React 19.2 ([changelog](https://expo.dev/changelog/sdk-57)).
- SDK 58 is in beta on RN 0.88 RC. Move to it only once it is stable.
- New Architecture is mandatory. Hermes V1 is the default engine.

### 1.3 Target architecture

```
apps/mobile (Expo, expo-router, tag app:mobile)
 ├─ app/                      file routes (mirror of web routes, see §1.5)
 ├─ src/api/                  oRPC RPCLink(fetch = expo/fetch, Bearer) + REST helper for /api/openapi binaries
 ├─ src/auth/                 server picker, DCR, PKCE via expo-auth-session/WebBrowser, token refresh, SecureStore
 ├─ src/draft/                resume/letter draft store (Zustand+Immer), save queue, offline queue, conflict UI
 ├─ src/preview/              render scheduler → @reactive-resume/pdf/native → pages → native rasteriser → overlay
 ├─ src/ui/                   Desk & Paper primitives (tokens from packages/ui globals.css)
 ├─ src/i18n/                 Lingui RN setup, catalogs apps/mobile/locales/*.po (seeded from web msgids)
 └─ modules/pdf-pages/        local Expo module: PDF bytes → page PNGs (PDFKit / android.graphics.pdf.PdfRenderer)

packages/forme-native (tag role:rendering, runtime:native)
 ├─ rust/                     crate wrapping forme-pdf =0.28.0 + font subsetting; C ABI via cbindgen
 ├─ ios/, android/            Expo module (Swift/Kotlin) calling the static lib
 └─ src/index.ts              FormeEngine implementation for packages/pdf

packages/pdf
 └─ src/native.tsx (new export "./native")  ≈ browser.tsx with engine + subsetter + fetch injected

apps/server, packages/auth, packages/api   small server changes, §1.6
```

**Data flow while editing:**

1. A keystroke updates the draft store.
2. The draft store does two things:
   - **Save path:** debounced 500 ms (the web value, `draft.ts:113`) into `resume.update`, including `expectedUpdatedAt` (§1.6 SV3).
   - **Preview path:** debounced 100 ms, or 250 ms while a field is focused (the web values, `preview.browser.tsx:35-38`), into `renderResume(nativeEngine, …)` on the JS thread.
3. The preview path then continues natively:
   - Forme native returns `{pdf, layout}`.
   - The `pdf-pages` module rasterises the visible pages to PNG.
   - `expo-image` crossfades them in.
   - `page-map.ts`, reused, drives the tap-to-edit overlays.
4. When offline, saves go to an `expo-sqlite/kv-store` queue and are replayed on reconnect (§1.4).

### 1.4 Key technical choices (fewest dependencies that cover the need)

| Need                                                      | Choice                                                                                                                    | Why                                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Navigation                                                | `expo-router`                                                                                                             | File routes, mirroring web's TanStack routes; deep links for free   |
| Server state                                              | `@tanstack/react-query` + `@orpc/tanstack-query`                                                                          | Same as web                                                         |
| Local state                                               | `zustand` + `immer`                                                                                                       | Same as web draft store                                             |
| Streaming (SSE: assistant, resume updates, letter drafts) | `expo/fetch` passed to `RPCLink`                                                                                          | Expo's fetch streams; RN's built-in fetch does not                  |
| Secure tokens                                             | `expo-secure-store`                                                                                                       | Keychain / Keystore                                                 |
| Offline queue and drafts                                  | `expo-sqlite/kv-store`                                                                                                    | localStorage-like API; already in Expo                              |
| Sign-in                                                   | `expo-auth-session` + `expo-web-browser`                                                                                  | PKCE, ASWebAuthenticationSession / Custom Tabs                      |
| Account security pages                                    | `expo-web-browser` `openBrowserAsync`                                                                                     | In-app browser tab (owner decision)                                 |
| Rich text                                                 | `react-native-enriched`                                                                                                   | Native, HTML in/out, New Architecture                               |
| Drag to reorder                                           | `react-native-reanimated` + `react-native-gesture-handler` + `react-native-reorderable-list` (or equivalent chosen in M2) | Outline, entries, pages, board                                      |
| Bottom sheets                                             | `@gorhom/bottom-sheet` or Expo UI sheet (decide in M2)                                                                    | Design, Share, entry editor                                         |
| Icons                                                     | `phosphor-react-native`                                                                                                   | Same set as web `Icon` map                                          |
| Fonts                                                     | `expo-font` (Hanken Grotesk, Newsreader)                                                                                  | Desk & Paper UI type                                                |
| Images and pages                                          | `expo-image`                                                                                                              | Crossfade, caching                                                  |
| Files                                                     | `expo-document-picker`, `expo-file-system`, `expo-sharing`                                                                | Import, export, share                                               |
| Audio (practise)                                          | `expo-audio`                                                                                                              | Record m4a ≤ 2 MB for `career.voice.transcribe`; play `voice.speak` |
| Local reminders                                           | `expo-notifications` (local only)                                                                                         | Interviews, follow-ups                                              |
| Charts (application insights)                             | `react-native-svg`, hand-drawn                                                                                            | Funnel/bars only; no chart library                                  |
| QR (share)                                                | `react-native-qrcode-svg`                                                                                                 | Web uses `qrcode.react`                                             |
| Colour picker                                             | Swatches + hex field; `reanimated-color-picker` only if needed                                                            | Keep small                                                          |
| PDF page rasterise                                        | Local `modules/pdf-pages`                                                                                                 | Built into the OS; no Pdfium                                        |
| Build/distribution                                        | EAS Build + Submit                                                                                                        | Store-ready per owner                                               |

**Rule for every agent:** do not add a dependency that is not in this table without a `QUESTION` to the coordinator (§3.4).

**PDF native adapter, `packages/pdf/src/native.tsx`.** Mirror `browser.tsx` with three changes:

- The engine comes from `@reactive-resume/forme-native` (`renderSerializedDocWithLayout`, `subsetFont`).
- Font downloads are persisted to `expo-file-system` cache. Today they are cached per process only (`forme/fonts.ts`). The cache is injected through a `fetchFont` parameter, so `packages/pdf` gains no Expo dependency.
- Two small portable fixes:
  - `images.ts:15`: fall back to `arrayBuffer()` when `response.body?.getReader` is missing.
  - `AbortSignal.timeout`: polyfill it in the mobile entry if Hermes lacks it.

Keep `@reactive-resume/pdf` free of React Native imports. The adapter takes injected functions.

**Offline and conflicts.**

- The draft is saved to kv-store on every change, like web's `reactive-resume:unsaved:<id>`.
- Saves send `expectedUpdatedAt`. On 409 `RESUME_VERSION_CONFLICT`, show a sheet with three choices:
  - "Keep mine" re-sends without `expectedUpdatedAt`.
  - "Use theirs" drops the draft.
  - "Keep both" duplicates the draft as a new resume.
- `resume.updates.subscribe` (SSE) applies remote changes on blur, as web does.

**Rich text loss (owner decision).**

- Only a field the user actually edits is re-serialised.
- Untouched fields keep their original HTML, because the full `ResumeData` is sent with the original strings.

### 1.5 Screen map (web route → mobile route)

| Web                                   | Mobile (`apps/mobile/app`)                                                                                               | Notes                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/auth/*`                             | `(auth)/server.tsx`, `(auth)/sign-in.tsx`                                                                                | Server URL field (default rxresu.me), "Continue in browser". Guest login if `flags.allowGuestLogin` |
| `/dashboard/`                         | `(tabs)/documents/index.tsx`                                                                                             | Library, search, tags, sort, multi-select                                                           |
| `/dashboard/trash`                    | `(tabs)/documents/trash.tsx`                                                                                             |                                                                                                     |
| New document dialog                   | `new.tsx` (modal from centre "+" tab)                                                                                    | Blank, sample, import, copy for job, new letter                                                     |
| `/dashboard/applications`             | `(tabs)/applications/index.tsx`                                                                                          | List on phone; board + calendar + insights on tablet and as phone tabs                              |
| `/dashboard/applications/$id/{-$tab}` | `applications/[id]/[tab].tsx`                                                                                            | Fit, Apply, Prepare, Practise, Debrief, Messages, Saved; coach sheet                                |
| `/dashboard/career/*`                 | `(tabs)/career/{today,coach,knowledge,offers}`                                                                           |                                                                                                     |
| `/dashboard/settings/*`               | `(tabs)/settings/{index,account,preferences,ai}`                                                                         | Security rows open the web page                                                                     |
| `/builder/$resumeId`                  | `builder/[id]/{write,page,design,check}.tsx` + `entry/[section]/[item].tsx`, `share.tsx`, `history.tsx`, `assistant.tsx` | Phone: bottom tabs Write/Page/Design/Check like web. Tablet: panel + page split                     |
| `/builder/letter/$id`                 | `letter/[id]/{write,design}.tsx`                                                                                         |                                                                                                     |
| `/$username/$slug`                    | `r/[username]/[slug].tsx`                                                                                                | Native reflow + download (web phone view); opens from links                                         |
| `/ats-checker`                        | `ats-checker.tsx`                                                                                                        | Uses `POST /pdf-checks` (server) instead of in-browser PDF.js                                       |
| `/templates/$`                        | Inside Design → Template                                                                                                 |                                                                                                     |
| Command palette                       | `search.tsx`                                                                                                             | Documents, conversations, actions                                                                   |

### 1.6 Server changes (all small, in this repo)

| ID  | Change                                                                                                                                                                                                                                                                                                                                                                                       | Where                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| SV1 | Serve `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` from env (`MOBILE_IOS_APP_IDS`, `MOBILE_ANDROID_PACKAGES`, `MOBILE_ANDROID_CERT_SHA256`). Add web route `/auth/native-callback`, a fallback page saying "Open the Reactive Resume app". New env vars follow AGENTS.md: `packages/env/src/server.ts`, `.env.example`, `turbo.json` `globalPassThroughEnv`. | `apps/server/src/http/app.ts` near line 117, `apps/web/src/routes/auth/` |
| SV2 | Sign in with Apple as an env-gated social provider, plus a button in `social-auth.tsx` and `auth.providers.list`.                                                                                                                                                                                                                                                                            | `packages/auth/src/config.ts:348-380`                                    |
| SV3 | `expectedUpdatedAt` on `resume.update` and `coverLetters.update`, returning 409 the same way `patch` does (`features/resume/service.ts:82-97`). Letters already use `expectedRevision`; reuse that.                                                                                                                                                                                          | `packages/api/src/features/resume/*`                                     |
| SV4 | Verify that a mobile access token whose `sid` points to the browser session (`config.ts:45-95`) survives through refresh tokens when the browser session expires. If it does not, issue native-client tokens without `sid` or rely on `offline_access` refresh. Write the finding in `reports/SV4.md` before changing code.                                                                  | `packages/auth`                                                          |
| SV5 | Small oRPC wrappers so profile and API keys work with a bearer token: `auth.updateProfile` (name, username, image), `auth.apiKeys.list` and `auth.apiKeys.delete` (`createApiKey` already exists). Each calls `auth.api.*` server-side.                                                                                                                                                      | `packages/api/src/features/auth/router.ts`                               |
| SV6 | Register `mobile` in turbo boundaries: tag `app:mobile`; deny `app:server`, `runtime:server`, `runtime:browser`, except the type-only `@reactive-resume/api/routers` (copy how web does it). Add tag `runtime:native` for `forme-native`.                                                                                                                                                    | `turbo.json`, `apps/mobile/turbo.json`                                   |

---

## 2. Phase 2: Design

**Goal:** a reviewed, owner-approved mobile design that every Phase 3 builder copies from. Builders must not invent layouts.

### 2.1 Inputs designers must read

- `packages/ui/src/styles/globals.css:19-205`: tokens. Colours (oklch, with hex approximations in comments), radii sm 6 to 4xl 24, shadows e1–e3 and page, motion d1 120 ms / d2 200 ms / d3 320 ms with `cubic-bezier(.2,.8,.2,1)`.
- Fonts: Hanken Grotesk (UI) and Newsreader (display).
- Icons: Phosphor through `packages/ui/src/components/icon.tsx`.
- `docs/guides/editing-on-mobile.mdx` and `plans/011-mobile-surfaces.md`: the web phone layout this app grows from.
  - Write/Page/Design/Check bottom tabs.
  - 5-tab app bar: Documents, Applications, raised "+", Career, Settings.
  - Bottom sheets with an 18 px radius and a grabber.
  - 44 pt touch targets.
- `GLOSSARY.md`: use these exact terms in every label.
- The screen inventory in §1.5, plus §5.

### 2.2 Deliverables

1. **D1: two directions** for three anchor screens (Documents, Builder Write, Builder Page), phone, light and dark.
   - **Direction A, "Paper first":** the page is the hero. Write is a sheet over the page.
   - **Direction B, "Outline first":** mirrors web's phone layout. Outline is the hero, and the page is one tab away.
   - The owner picks one, or mixes them, at gate **G2a**.
2. **D2: full screen set** in the chosen direction.
   - Phone (393×852) for every route in §1.5.
   - Tablet (1180×820 landscape) for Documents, Builder, Applications board, and Application workspace.
   - Every key state: empty, loading, offline banner, save conflict sheet, error, RTL sample (Arabic), large text (200% Dynamic Type) for Builder Write.
3. **D3: interaction notes** under each screen. Gestures, sheet detents, transitions using the motion tokens, keyboard behaviour (rich text toolbar above the keyboard).
4. **D4: `tokens.md`**: the RN token table (colours light and dark, type scale in pt, spacing, radii, shadows mapped to iOS shadow and Android elevation, motion). M1 turns this into `apps/mobile/src/ui/tokens.ts` without changes.

**Format:**

- One interactive HTML page published as a private Artifact, with a phone/tablet toggle and a light/dark toggle.
- The source is saved to `docs/plans/native-mobile-app/mockups/index.html` so worktree agents can read it.
- The design agent must load the `artifact-design` skill before writing.
- Mock content uses `packages/schema/src/resume/sample.ts` data. It must not use real personal data.

### 2.3 Design tasks

| ID  | Harness     | Task                                                                                                                                              | Depends on               |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| DS1 | Claude Code | D1, two directions × 3 screens                                                                                                                    | none (runs alongside M0) |
| DS2 | Codex       | Review D1 against §1.5 and the web inventory. Find every web capability with no home in either direction. Output is a gap list only; no redesign. | DS1                      |
| G2a | Owner       | Pick a direction                                                                                                                                  | DS2                      |
| DS3 | Claude Code | D2, D3, D4                                                                                                                                        | G2a                      |
| DS4 | Codex       | Coverage review of D2. For each web feature in §5, name the mockup screen that hosts it. Check contrast (WCAG AA) of the token pairs in D4.       | DS3                      |
| G2b | Owner       | Approve the mockups                                                                                                                               | DS4                      |

---

## 3. Phase 3: Build. Multi-agent protocol

### 3.1 Roles

- **Coordinator** (one Claude Code session in the main checkout, on branch `mobile/native-app`):
  - Launches agents through Paseo and keeps `ledger.md`.
  - Merges task branches and resolves conflicts.
  - Owns the files every task touches: root `package.json`, `pnpm-lock.yaml`, `turbo.json`, `apps/mobile/package.json`, `apps/mobile/app/_layout.tsx`, catalogs.
  - Runs `pnpm lingui:extract` (or the mobile equivalent) once per wave.
  - Never writes feature code.
- **Builder**: one Paseo agent per task, in its own worktree off `mobile/native-app`, on branch `mobile/<task-id>`. Edits only the paths listed under its task's Ownership.
- **Reviewer**: one agent per task, **always from the other harness**. A Codex builder gets a Claude reviewer, and the reverse. The reviewer reads the diff only and does not edit.
- **Owner**: decides at the gates G0, G1, G2a, G2b, G-store, and answers any `QUESTION` the coordinator cannot settle from this plan.

### 3.2 Harness assignment

Assign by strength, then alternate so that each wave has both harnesses building:

- **Codex:** Rust, Swift and Kotlin native modules (`forme-native`, `pdf-pages`), server changes, the API layer, offline queue logic, data-heavy screens.
- **Claude Code:** UI-heavy screens, design implementation, the design phase, the builder interaction model, assistant streaming UI.

**Before every launch, the coordinator:**

1. Runs Paseo `list_profiles` and copies the provider, model, mode and thinking settings from the profile.
2. Never hard-codes a model name from this plan.

### 3.3 Launching a task

```sh
# Builder: one worktree per task, branched from the integration branch
paseo run -d --title "[M3-T2] Documents library" \
  --provider <profile provider> --mode <profile mode> \
  --new-workspace worktree --worktree-mode branch-off \
  --new-branch mobile/M3-T2 --base mobile/native-app \
  --label plan=native-mobile --label task=M3-T2 \
  --prompt-file docs/plans/native-mobile-app/briefs/M3-T2.md   # or pass the brief inline

# Reviewer: runs in the builder's worktree, read-only
paseo run -d --title "[Review M3-T2]" --provider <other harness> --workspace <builder workspace id> "<review brief>"

# Messages
paseo send <agentId> "<message>"     # coordinator → agent, or reviewer → builder
paseo wait <agentId>                 # coordinator only; prefer finish notifications over polling
```

`paseo.json` already runs `pnpm install` when a worktree is created.

### 3.4 Communication rules

1. **Contracts first.** A task never waits on another task mid-flight.
   - Anything two tasks share (types, hooks, route names, query keys, token names, module APIs) is defined by an earlier wave and merged before the dependent wave starts.
   - The contract files are listed in each wave below.
2. **Message channels.** The coordinator is a Claude Code session outside Paseo. It learns that an agent went idle through `paseo wait <id>`, run in the background, so an agent cannot message it directly. Only these channels exist:
   - **Builder to coordinator:** end your turn. Your last message is either the final report (§3.5) or a `QUESTION:` block with `STATUS: blocked`. The coordinator reads it with `paseo logs <id>` and answers with `paseo send <id>`. You then continue in the same session.
   - **Reviewer to builder, on the same task:** the reviewer ends its turn with its findings. The coordinator forwards them with `paseo send <builderId>`.
   - **Coordinator to anyone:** `paseo send`.
   - Builders never message other builders. Cross-task needs go to the coordinator.
3. **STOP rules.** The agent stops and ends its turn with `QUESTION:` instead of improvising when:
   - a quoted excerpt no longer matches the code;
   - a contract is missing something;
   - the task would need edits outside its Ownership;
   - it would need a new dependency.
4. **The ledger is single-writer.**
   - Only the coordinator edits `ledger.md`.
   - Agents write `reports/<task-id>.md` on their own branch. One file per task, so merges never conflict.
5. **Commits.**
   - Lowercase Conventional Commits (`feat(mobile): …`), one or more per task.
   - No AI attribution, no co-author trailers, no session links (AGENTS.md).
   - Never push.
   - Run `git checkout -- AGENTS.md` if turbo rewrites it.

### 3.5 Task brief template (coordinator fills it in for each task)

```md
# <task-id>: <imperative title>

Base: mobile/native-app @ <sha>. Branch: mobile/<task-id>. Questions: end your turn with QUESTION: (§3.4).
Read first: AGENTS.md, docs/plans/native-mobile-app/README.md §<sections>, mockups/<screens>, decisions.md.

## Target what exists when done, in user terms

## Change concrete steps, with file paths; quote current code where it is modified

## Contracts files you consume (read-only) and files you must create for later waves

## Ownership globs you may edit. Anything else → QUESTION

## Constraints no new deps; GLOSSARY terms; Lingui macros for every string (no extract); tokens only from src/ui/tokens.ts; no WebView

## Acceptance observable checks (see §3.7), screenshots for UI tasks saved to reports/<task-id>/

## Report write reports/<task-id>.md, commit, then finish with the block below
```

**Final report block** (last message of every builder):

```
STATUS: succeeded | failed | blocked
SUMMARY: <≤3 sentences>
FILES: <paths changed>
CONTRACTS: <new or changed shared surfaces, or "none">
CHECKS: <commands run + result>
FOLLOW-UPS: <items deferred, or "none">
QUESTIONS: <open questions, or "none">
```

### 3.6 Review protocol (minimal)

- **One review per task,** by the other harness.
- The reviewer reads `git diff mobile/native-app...mobile/<task-id>`, the brief, and the relevant mockup.
- It reports **blocking findings only**:
  - crashes or wrong behaviour against the brief;
  - data loss (save path, rich text, offline queue);
  - security (token storage, logging of tokens or resume data, URL handling);
  - edits outside Ownership;
  - new dependencies;
  - a broken contract.
- It does not report style or naming nits. Those are covered by `oxlint` / `oxfmt`.
- Format: one line per finding, `path:line: BLOCKING: <problem>. <fix>.`, or `NO BLOCKERS`.
- **One fix round.** The builder fixes, then replies `FIXED <n>` or `DISPUTE <n>: <reason>`. A dispute goes to the coordinator, who decides. There is no second review round unless the fix touched more than 100 lines.
- **Merge:** the coordinator merges with `--no-ff`, runs the wave checks (§3.7), and updates the ledger.

### 3.7 Testing (minimal at first)

**Per task, run by the builder:**

- `pnpm --filter mobile typecheck`
- `pnpm exec oxlint --deny-warnings <changed paths>`
- `pnpm exec oxfmt --check <changed paths>`
- For UI tasks, a screenshot of each new screen on an iOS simulator (light and dark) saved to `reports/<task-id>/`.
- Run the test-audit authoring gate before writing any test (memory: test-gate feedback). No new unit tests are expected, except the parity check in M3-T4.

**Per wave, run by the coordinator after merging:**

- `pnpm exec turbo boundaries`
- `pnpm --filter mobile typecheck`
- `npx expo export --platform ios --platform android` (the bundle builds)
- A dev build launches on the iOS simulator and the Android emulator, with a manual smoke test of the wave's screens.

**Renderer parity (the one automated check that matters):**

- Render `sample.ts` with all 17 templates through `@reactive-resume/pdf/server` (Node) and through `@reactive-resume/pdf/native` (on device).
- Compare page count and extracted text per page.
- Lives in `apps/mobile/scripts/parity` and runs from a dev build.

**Later (M8 onward, not before):** Maestro flows for sign-in, edit and save, offline and reconnect, and export.

---

## 4. Waves and tasks

Milestones run in order. Tasks inside a wave run in parallel, at most 5 builders at once. **Contracts** lists the files a wave must merge before the next wave starts.

### M0: Spikes (Phase 1 confirmation). Gate G0

| ID  | Harness     | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Acceptance                                                                                                                                                                                                                                            |
| --- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Codex       | `packages/forme-native` proof. Rust crate on `forme-pdf = "=0.28.0"` exposing `render_with_layout(json) -> {pdf, layout_json, warnings}` and `subset_font(bytes, text)`. Pick a pure-Rust subsetter, or link harfbuzz `hb-subset`, and record the choice. Expose a C ABI with cbindgen, a Swift/Kotlin Expo module, and xcframework / jniLibs builds for arm64 plus simulators.                                                                                                            | The sample Forme JSON from Node (`render.ts` debug dump) renders to a valid PDF on the iOS simulator and the Android emulator. Report: per-arch binary size, render time, crate API notes, and whether the npm and crate versions must move together. |
| S2  | Claude Code | `packages/pdf` on Hermes. Minimal Expo app in a scratch branch; import `@reactive-resume/pdf` internals; build the host tree and the Forme JSON for `sample.ts` with a stub engine. Resolve: Metro + pnpm workspace resolution; a single React copy (RN pins React 19.2, the catalog has `^19.3.0`, `react-reconciler` is `0.34.0`); polyfills (`getRandomValues`, `structuredClone`, `AbortSignal.timeout`, `TextDecoder` `{fatal}`); the `?url` imports must not be in the native graph. | The Forme JSON from Hermes deep-equals the JSON from Node for `sample.ts` × 3 templates. Report the React version strategy and the polyfill list.                                                                                                     |
| S3  | Claude Code | Auth proof against a local server. DCR, PKCE through `expo-auth-session`, the https callback (Android App Link; iOS through a tunnel host with AASA), bearer calls to `/api/rpc`, refresh. Answer SV4 (the `sid` lifetime).                                                                                                                                                                                                                                                                | Signed in on both platforms; `resume.list` works; the token refreshes; `reports/S3.md` answers SV4.                                                                                                                                                   |

**G0 (owner):**

- If S1 fails, the owner chooses a fallback. Options are server rendering or revisiting a renderer; the owner already rejected WebView.
- If S2 shows the React version can't be unified, the owner approves the strategy S2 proposes.

**Outcome:** the coordinator writes `decisions.md`, which freezes §1 with the spike results. That is gate **G1**.

### Phase 2 runs here (DS1 to G2b, §2.3).

Server tasks SV1 to SV6 can run in parallel with Phase 2.

| ID      | Harness     | Task                                    |
| ------- | ----------- | --------------------------------------- |
| SV1–SV3 | Codex       | As specified in §1.6. One task each.    |
| SV4     | Codex       | Code change only if S3 found a problem. |
| SV5     | Codex       | As specified in §1.6.                   |
| SV6     | Coordinator | Done during M1 merge.                   |

Server acceptance: the existing tests for the touched package pass (`pnpm --filter @reactive-resume/api test`, `…/auth test`), and `pnpm docs:gen` regenerates `docs/spec.json` for SV3 and SV5.

### M1: Scaffold (serial, one Claude Code task)

**M1-T1 `apps/mobile` skeleton:**

- Expo app, expo-router.
- **Every route in §1.5 exists as a stub screen.**
- All dependencies from §1.4 are installed, so later waves add none.
- `app.config.ts`: bundle IDs from the owner (G-store inputs; placeholders until then), associated domains / intent filters for the callback, iOS 17.4, minSdk 24, iPad support.
- `src/ui/tokens.ts` from D4.
- Fonts and the icon map.
- Lingui setup, with catalogs seeded by copying matching msgids from `apps/web/locales`.
- Theme from `useColorScheme` plus a user override.
- RTL through `I18nManager`.
- The `packages/forme-native` package from S1 is promoted to the workspace.
- `packages/pdf` gets `./native` (S2 findings).
- turbo tags (SV6).

**Contracts merged in M1:**

- `src/api/client.ts`: `client`, `streamClient`, `orpc` query utils, and a `rest(path)` helper for binaries.
- `src/auth/session.ts`: `useSession()`, `signIn(server)`, `signOut()`, `getAccessToken()`.
- `src/ui/index.ts`: the primitive list, implemented as plain stubs.
- `src/routes.ts`: typed hrefs.
- `src/draft/types.ts`: the `DraftStore` interface.
- `src/preview/types.ts`: `RenderRequest`, `RenderedPages`.

### M2: UI kit and shells (2 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                                                    |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2-T1 | Claude Code | Primitives per D2/D4: Button, IconButton, TextField, TextArea, Select sheet, Switch, Segmented, Chip and ChipInput, ListRow, Card, Sheet with detents, ConfirmDialog, Toast with undo, EmptyState, Banner (offline/locked), Avatar, Skeleton, SortableList. Press feedback and motion tokens; reduced motion respected. |
| M2-T2 | Claude Code | Shells. Tab bar (5 tabs with the raised +), tablet sidebar/split layout, builder chrome (top bar, phone bottom tabs Write/Page/Design/Check, tablet panel and page split), safe areas, keyboard inset.                                                                                                                  |

### M3: Core (5 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Ownership                                                                                                                                             |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| M3-T1 | Claude Code | Sign-in. Server picker with validation (`/.well-known/oauth-authorization-server`), DCR cached per server, `flags.get` (signups, guest), browser sign-in, sign-out, token refresh, handling an expired session.                                                                                                                                                                                                                                                                             | `app/(auth)/**`, `src/auth/**`                                                                                                                        |
| M3-T2 | Codex       | Documents library and trash. Search, type tabs, tags, sort, grid/list, multi-select (tags, visibility, lock, trash), card menu, thumbnails (first page from the preview pipeline once M3-T4 merges; placeholder before that). New sheet: blank, sample, letter, copy for job. Import: document picker, then `POST /resumes/file-imports` for JSON/LinkedIn/PDF text, and `ai.parsePdf`/`parseDocx` for AI parsing.                                                                          | `app/(tabs)/documents/**`, `app/new.tsx`, `src/features/documents/**`                                                                                 |
| M3-T3 | Codex       | Draft store and saving. Port the logic of `apps/web/src/features/resume/builder/draft.ts`: 500 ms debounce, `sessionId`, undo/redo with 200 steps, 1 s coalescing, kv-store persistence, offline queue, `expectedUpdatedAt` conflict sheet, `updates.subscribe` applying changes on blur, save status, locked resumes. The same for letters (800 ms, `expectedRevision`).                                                                                                                   | `src/draft/**`                                                                                                                                        |
| M3-T4 | Codex       | Preview pipeline. `packages/pdf/src/native.tsx`, `modules/pdf-pages` (rasterise page N at a given scale), a scheduler with the web debounce values and stale-request dropping, persistent font cache, Page tab with zoom (60–150%, fit), crossfade, page-map tap overlay that selects an entry, overflow caption with "Fit to one page", lost-characters warning. Parity script (§3.7).                                                                                                     | `packages/pdf/src/native.tsx`, `packages/pdf/package.json` exports, `apps/mobile/modules/pdf-pages/**`, `src/preview/**`, `app/builder/[id]/page.tsx` |
| M3-T5 | Claude Code | Builder Write. Basics card, custom fields, picture (`expo-image-picker` + crop, upload through `/files`, all picture settings), outline in print order with reorder of sections and entries, the section menu (every action in the web list), entry editor screens for all 13 section types including experience roles, custom sections, date fields (range or single, locale-aware), rich text with `react-native-enriched` and a toolbar above the keyboard, AI "Improve" (`ai.improve`). | `app/builder/[id]/write.tsx`, `app/builder/[id]/entry/**`, `src/features/write/**`                                                                    |

**Contracts:**

- `src/features/write/fields.ts`: entry field schema per section, reused by Design and Check.
- `src/preview/usePreview.ts`.

### M4: Builder completion and letters (4 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4-T1 | Claude Code | Design. Template picker (17, filter chips, thumbnails from the user's own data through the preview pipeline), type (5 pairings, size 9–12 pt, density), colour (swatches, hex, contrast warning), page (Letter/A4/free-form, language, margins), Advanced (date format, typography, design colours, level type, icons, layout pages with drag between main and sidebar, custom CSS in a monospace field, reset).                                                                                                                             |
| M4-T2 | Codex       | Check. Score ring; Issues with pins on the page and one-tap fixes with undo (rules from `@reactive-resume/resume` on the draft where pure JS; `GET /resumes/{id}/checks` for the rest; record which are which); Job match from the linked application; Writing review through `ai.atsReview` with accept/reject; person/parser toggle; issue stepper.                                                                                                                                                                                        |
| M4-T3 | Codex       | Share, export and history. Public toggle, slug check, copy and native share, QR, password, visitor downloads, stats (views and downloads, simple SVG bars). Download: PDF rendered locally and saved or shared; DOCX/ODT/MD/JSON through `GET /resumes/{id}/exports/{format}`; also export the linked letter. Print through `expo-print` with the PDF file. History: list, view read-only on the page, restore (save "Before restore" first), name, rename, delete. Document menu: rename, duplicate, lock, notes, details, trash with undo. |
| M4-T4 | Claude Code | Cover letter editor. Write (FOR, TO, FROM linked resume live or copied, body with the 180–320 word guide), AI draft streamed over SSE, Design (inherit or own), share sheet (download, history).                                                                                                                                                                                                                                                                                                                                             |

### M5: Applications (3 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                               |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M5-T1 | Codex       | List grouped by stage with sorting, bulk move, tag, close and delete. Add flow: paste a link or text, then `applications.ai.parsePosting` / `autofill` / `searchPostings`. CSV import with column mapping and CSV export (document picker and share sheet).                                        |
| M5-T2 | Claude Code | Detail. Stage stepper, next-step card, "What you sent", inline-editable facts, contacts, notes, timeline, close-with-reason, interview editor (type, time zone, people), attachments (PDF ≤ 10 MB). Local reminders for interviews and follow-ups through `expo-notifications`, plus `.ics` share. |
| M5-T3 | Claude Code | Board (drag between stages), calendar, and insights (funnel). Tablet first; on phone they are segmented views.                                                                                                                                                                                     |

### M6: Career and AI (4 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M6-T1 | Codex       | Career Today (needs-you items, discovered roles, next interview, schedule sheet aware of time zones), Knowledge (facts, STARR story editor, preferences), Offers comparison as stacked cards on phone and two columns on tablet. Undo toasts with the ~6 s delayed commit.                                                                                                                         |
| M6-T2 | Claude Code | Application workspace tabs: Fit, Apply (draft/tighten, checklist), Prepare, Practise (typed, or spoken through `expo-audio` → `career.voice.transcribe`, with playback of `voice.speak`), Debrief, Messages (paste, read, draft reply, proposed changes), Saved. Coach sheet.                                                                                                                      |
| M6-T3 | Claude Code | Assistant. Threads list grouped by document; chat with `@ai-sdk/react` `useChat` over a custom transport on `streamClient.agent.messages.send/resume` (port `apps/web/src/features/assistant/chat.ts`); context chips; attachments (`agent.attachments.create`, base64); stop; change-set cards with accept/reject that apply to the draft; inline provider setup. Coach chat in Career reuses it. |
| M6-T4 | Codex       | AI settings: providers (16 kinds, test, default), web access keys. MCP info screen (read-only text).                                                                                                                                                                                                                                                                                               |

### M7: Settings, public and utilities (3 tasks)

| ID    | Harness     | Task                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M7-T1 | Codex       | Settings. Root list; Account (name, username, avatar through SV5 and `/files`; rows for password, 2FA, passkeys, linked accounts and email that open `${server}/dashboard/settings/account` in an in-app browser tab); data export (`auth.exportData` → share sheet); delete account (type to confirm); API keys through SV5; Preferences (theme, interface language, time zone); sign out; server switcher. |
| M7-T2 | Claude Code | Public resume viewer at `r/[username]/[slug]` (reflow plus download, password prompt with a cookie jar for `verifyPassword`). ATS checker (pick a PDF, `POST /pdf-checks`, report, "Fix these in the editor" → import). Search screen (command palette equivalent).                                                                                                                                          |
| M7-T3 | Codex       | Deep links. Universal Links and App Links for `/$username/$slug` and `/builder/*` from the official domain; `rxresu.me` web links open the app when it is installed.                                                                                                                                                                                                                                         |

### M8: Release hardening (2 tasks + gate)

| ID      | Harness     | Task                                                                                                                                                                                                                                                                                                            |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M8-T1   | Claude Code | Accessibility (labels, Dynamic Type to 200%, VoiceOver/TalkBack pass on the core flow), RTL pass, reduced motion, tablet polish, hardware keyboard shortcuts on iPad (1/2/3 modes, ⌘Z, ⌘P).                                                                                                                     |
| M8-T2   | Codex       | Store readiness. App icons and splash from the existing PWA icons; `eas.json` (development, preview, production profiles); iOS privacy manifest; Android data safety notes; EAS Submit config; size report (download size per platform); Maestro flows (sign in, edit and save, offline and reconnect, export). |
| G-store | Owner       | Provide the app name, iOS bundle ID, Android package, Apple Team ID, Play Console access and EAS account. Approve the TestFlight and internal-track builds.                                                                                                                                                     |

---

## 5. Parity checklist

The coordinator ticks these items in `ledger.md`. Every item maps to a task.

**Documents**

- library, search, tags, sort, views, multi-select, trash
- import of RR JSON, JSON Resume, LinkedIn, PDF and DOCX (AI)
- copy for job, duplicate, lock, link to application

**Builder**

- Write: every section, custom sections, roles, picture, rich text, Improve
- Design: every control listed under M4-T1
- Check: Issues, Job match, Writing, person/parser view
- Share: link, password, QR, stats
- Download: PDF, DOCX, ODT, MD, JSON, linked letter
- History, document menu, undo/redo, autosave, offline, conflicts, live remote updates

**Letters**

- write, AI draft, design, history, download

**Applications**

- list, board, calendar, insights
- add from link or text, detail, interviews, notes, timeline, attachments, close, bulk, CSV import/export, reminders

**Career**

- Today, schedules, opportunities, Coach, Knowledge (facts, stories, preferences), Offers
- workspace tabs including voice practise

**Assistant**

- threads, streaming, resume, stop, context, attachments, proposed edits, provider setup

**Settings**

- account (native plus browser handoff), preferences, AI providers, web access, API keys, export, delete

**Public**

- shared resume viewer, ATS checker

### 5.10 Not ported (web-only by nature)

- Marketing homepage.
- WebMCP (`libs/webmcp.ts`, Chrome only).
- The OAuth consent screen. It stays a web page; the app's own sign-in uses it.
- Drag-and-drop file import onto the page. The document picker and the iOS/Android share sheet into the app replace it; the share extension is a follow-up and not in v1.
- The browser `SpeechRecognition` fallback in Practise. Mobile uses the server transcription, which needs an AI provider. On-device speech recognition is a follow-up.

---

## 6. Boundaries

- Do NOT use a WebView anywhere, including for rendering, rich text or charts.
- Do NOT import `@reactive-resume/*/src/*` paths or app code from `apps/web`. Port logic into `apps/mobile`, or move it into a shared package through a `QUESTION`.
- Do NOT add React Native imports to `packages/pdf`. The native adapter takes injected functions.
- Do NOT change how `packages/pdf` renders for web or server. The parity check must stay green.
- Do NOT add dependencies outside §1.4 without coordinator approval.
- Do NOT log tokens, resume data or personal data. Do NOT store tokens outside SecureStore.
- Do NOT enable `FLAG_ALLOW_UNSAFE_OAUTH_REDIRECT_URI` or other unsafe flags for mobile.
- Do NOT push, open PRs, or add AI attribution.
- Do NOT edit `ledger.md`, the root lockfile, or root manifests unless you are the coordinator.

## 7. Done when

- **Phase 1:** S1–S3 succeeded, or the owner accepted a fallback at G0. `decisions.md` is merged (G1).
- **Phase 2:** the owner has approved the mockups (G2b). `mockups/index.html` and `tokens.md` are committed.
- **Phase 3:**
  - Every §5 item is ticked.
  - Renderer parity passes for all 17 templates.
  - A Latin two-page resume re-renders in ≤ 400 ms (p50, mid-range Android, fonts cached).
  - Cold start is ≤ 2.5 s on the same device.
  - Download sizes are recorded, against a budget set from the S1 numbers at G1.
  - Development and production builds succeed on EAS.
  - A TestFlight build and a Play internal-track build are installed by the owner (G-store).

## 8. Risks

| Risk                                                                                       | Mitigation                                                                                                                         |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Forme upstream defects need the TS workarounds; a crate version must match the npm version | Pin `=0.28.0` in Cargo and npm together. The parity script catches drift. Upgrades move both.                                      |
| Two React versions (RN 19.2 vs catalog 19.3) break the reconciler                          | Resolved in S2 before any build work. If needed, give `packages/pdf` a peer-dependency React and let each app supply its own.      |
| Large CJK fonts on mobile data (10–15 MB a face)                                           | Subset natively (S1). Persistent font cache. Download only when the content needs the script (already in `use-register-fonts.ts`). |
| `react-native-enriched` can't represent colour, highlight, tables or alignment             | Owner accepted loss on edited fields. Untouched fields keep their HTML. Extending it is a follow-up.                               |
| Tokens tied to the browser session (`sid`) expire early                                    | S3 and SV4 settle it before M3.                                                                                                    |
| App Review: account deletion, Sign in with Apple, login through the browser                | Deletion is native (M7-T1). Apple sign-in is SV2. The web-based login is a standard OAuth pattern.                                 |
| Parallel agents conflict on shared files                                                   | Single-writer rules, contracts-first waves, dependencies installed once in M1.                                                     |
| Hermes gaps (`structuredClone`, `AbortSignal.timeout`, `TextDecoder` fatal)                | The S2 polyfill list, installed once in the mobile entry.                                                                          |

## 9. Owner inputs still needed (not blocking until the named gate)

- **G-store:** app display name, iOS bundle ID, Android package name, Apple Team ID, Play Console access, EAS account and plan.
- **G1:** download-size budget, once the S1 numbers are known.
- **SV1:** the callback path on rxresu.me. Proposed: `/auth/native-callback`.

## 10. Scope estimate (rough)

| Area                                                | New files | Lines   |
| --------------------------------------------------- | --------- | ------- |
| `packages/forme-native` (Rust, Swift, Kotlin, TS)   | ~15       | ~1,200  |
| `packages/pdf` native adapter and portability fixes | 2–3       | ~150    |
| Server SV1–SV5                                      | ~10       | ~600    |
| `apps/mobile` (routes, features, UI kit, modules)   | ~250      | ~30,000 |
