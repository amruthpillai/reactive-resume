# Open issue audit and action plan — 2026-09-05

<!-- markdownlint-disable MD026 -->
<!-- Issue headings preserve the original GitHub titles. -->

**Goal:** Resolve as many issues as evidence supports, with one unmerged PR per independent fix.

**Baseline:** `e549d114ea020380b156197f6460faddbe3022fd` (`main`, version 5.2.9). Initial inventory: 114 open issues, 10 open PRs.

## Verification standard

Every initial open issue was read with its comments and compared with relevant current code, history, existing PRs, or tests. Each entry states the evidence actually obtained. Passing package tests establish a baseline; they do not prove every screenshot or production incident is resolved. Reports requiring missing fixtures or deployment data remain open. Features are not classified as bugs solely because they are absent.

Issues fixed only in unmerged PRs remain open. Already-fixed issues close only with matching evidence or reporter confirmation. Duplicate closure retains a canonical open report. This task has not merged any PR.

## Progress

- 115 issues triaged: the initial 114 plus new report #3433. Verification continues for reports needing exact fixtures or deployment reproduction.
- 35 implementation PRs created by this audit: 32 merged by the repository owner; #3419, #3423, and #3443 remain open. Audit-only documentation PRs #3418 and #3440 are excluded from those 35 and are both merged.
- 43 audited issues closed: 42 evidence-backed or reporter-confirmed closures plus one product-decision closure (#3272). Complete closure set: [#2650](https://github.com/amruthpillai/reactive-resume/issues/2650), [#2735](https://github.com/amruthpillai/reactive-resume/issues/2735), [#2739](https://github.com/amruthpillai/reactive-resume/issues/2739), [#2804](https://github.com/amruthpillai/reactive-resume/issues/2804), [#2805](https://github.com/amruthpillai/reactive-resume/issues/2805), [#2878](https://github.com/amruthpillai/reactive-resume/issues/2878), [#3008](https://github.com/amruthpillai/reactive-resume/issues/3008), [#3017](https://github.com/amruthpillai/reactive-resume/issues/3017), [#3051](https://github.com/amruthpillai/reactive-resume/issues/3051), [#3146](https://github.com/amruthpillai/reactive-resume/issues/3146), [#3174](https://github.com/amruthpillai/reactive-resume/issues/3174), [#3180](https://github.com/amruthpillai/reactive-resume/issues/3180), [#3200](https://github.com/amruthpillai/reactive-resume/issues/3200), [#3247](https://github.com/amruthpillai/reactive-resume/issues/3247), [#3251](https://github.com/amruthpillai/reactive-resume/issues/3251), [#3272](https://github.com/amruthpillai/reactive-resume/issues/3272), [#3285](https://github.com/amruthpillai/reactive-resume/issues/3285), [#3291](https://github.com/amruthpillai/reactive-resume/issues/3291), [#3305](https://github.com/amruthpillai/reactive-resume/issues/3305), [#3311](https://github.com/amruthpillai/reactive-resume/issues/3311), [#3312](https://github.com/amruthpillai/reactive-resume/issues/3312), [#3337](https://github.com/amruthpillai/reactive-resume/issues/3337), [#3338](https://github.com/amruthpillai/reactive-resume/issues/3338), [#3339](https://github.com/amruthpillai/reactive-resume/issues/3339), [#3340](https://github.com/amruthpillai/reactive-resume/issues/3340), [#3341](https://github.com/amruthpillai/reactive-resume/issues/3341), [#3343](https://github.com/amruthpillai/reactive-resume/issues/3343), [#3347](https://github.com/amruthpillai/reactive-resume/issues/3347), [#3348](https://github.com/amruthpillai/reactive-resume/issues/3348), [#3352](https://github.com/amruthpillai/reactive-resume/issues/3352), [#3359](https://github.com/amruthpillai/reactive-resume/issues/3359), [#3361](https://github.com/amruthpillai/reactive-resume/issues/3361), [#3366](https://github.com/amruthpillai/reactive-resume/issues/3366), [#3368](https://github.com/amruthpillai/reactive-resume/issues/3368), [#3369](https://github.com/amruthpillai/reactive-resume/issues/3369), [#3370](https://github.com/amruthpillai/reactive-resume/issues/3370), [#3374](https://github.com/amruthpillai/reactive-resume/issues/3374), [#3380](https://github.com/amruthpillai/reactive-resume/issues/3380), [#3391](https://github.com/amruthpillai/reactive-resume/issues/3391), [#3392](https://github.com/amruthpillai/reactive-resume/issues/3392), [#3393](https://github.com/amruthpillai/reactive-resume/issues/3393), [#3401](https://github.com/amruthpillai/reactive-resume/issues/3401), [#3433](https://github.com/amruthpillai/reactive-resume/issues/3433).
- In progress: bullet pagination (#3344), approved paragraph indentation (#3397), and remaining issue reproductions. Reporter confirmed #3433 no longer reproduces after restarting their setup; issue closed without an attributed code fix. #3196 remains open because merged #3438 addressed a separate content-loss regression, not missing table borders. GitHub state refreshed against the current open-issue and PR inventories.
- Baseline server/API typecheck errors in `packages/email/src/transport.ts` are fixed separately by [#3416](https://github.com/amruthpillai/reactive-resume/pull/3416). All three affected package typechecks and existing email tests pass there.

| Issue | Fix PR | Result |
| --- | --- | --- |
| [#3391](https://github.com/amruthpillai/reactive-resume/issues/3391) | [#3402](https://github.com/amruthpillai/reactive-resume/pull/3402) | Saved application notes now appear as escaped, wrapping text. Merged by repository owner; issue closed. |
| [#2735](https://github.com/amruthpillai/reactive-resume/issues/2735) | [#3403](https://github.com/amruthpillai/reactive-resume/pull/3403) | Explicit HTTP URLs survive paste and edits; bare hosts retain HTTPS defaults. 12 URL input tests passed. |
| [#3347](https://github.com/amruthpillai/reactive-resume/issues/3347) | [#3404](https://github.com/amruthpillai/reactive-resume/pull/3404) | Health exposes the build version and its endpoint appears in OpenAPI. Public errors are generic; diagnostic details remain in server logs. 74 server tests pass. |
| [#3251](https://github.com/amruthpillai/reactive-resume/issues/3251) | [#3405](https://github.com/amruthpillai/reactive-resume/pull/3405) | Primary button hover applies to native buttons and links. Compiled Tailwind behavior verified. |
| [#3338](https://github.com/amruthpillai/reactive-resume/issues/3338) | [#3406](https://github.com/amruthpillai/reactive-resume/pull/3406) | Dates align correctly when the opposite optional field is blank. Four actual-PDF layout regressions and 687 PDF tests passed. |
| [#3370](https://github.com/amruthpillai/reactive-resume/issues/3370) | [#3407](https://github.com/amruthpillai/reactive-resume/pull/3407) | Labeled password and confirmation dialog validates length/matching and retains failures. 605 web tests, typecheck, and updated browser E2E passed. |
| [#3339](https://github.com/amruthpillai/reactive-resume/issues/3339) | [#3408](https://github.com/amruthpillai/reactive-resume/pull/3408) | Onyx headlines wrap within page margins. Three actual-PDF regressions and 686 PDF tests passed. |
| [#3401](https://github.com/amruthpillai/reactive-resume/issues/3401) | [#3409](https://github.com/amruthpillai/reactive-resume/pull/3409) | Public signup footer is hidden when registration is disabled, as approved. Four public-page tests passed. |
| [#3359](https://github.com/amruthpillai/reactive-resume/issues/3359) | [#3410](https://github.com/amruthpillai/reactive-resume/pull/3410) | Public social previews use neutral branding instead of a sample identity. Personal title/description remain intact. |
| [#3361](https://github.com/amruthpillai/reactive-resume/issues/3361) | [#3411](https://github.com/amruthpillai/reactive-resume/pull/3411) | Compose loads optional .env after sample defaults; docs distinguish repository Compose from standalone quickstart. Both actual configurations verified. |
| [#3352](https://github.com/amruthpillai/reactive-resume/issues/3352) | [#3412](https://github.com/amruthpillai/reactive-resume/pull/3412) | SVG icon opacity reaches actual PDF drawing operations; reporter fixture renders distinct ratings. Six graphics-state tests and 689 PDF tests passed. |
| [#3368](https://github.com/amruthpillai/reactive-resume/issues/3368) | [#3413](https://github.com/amruthpillai/reactive-resume/pull/3413) | Submitted writes reject values outside published bounds while stored reads and historical migrations remain tolerant. Legacy JSON fixtures and schema/API/domain/import suites verified. |
| [#3366](https://github.com/amruthpillai/reactive-resume/issues/3366) | [#3414](https://github.com/amruthpillai/reactive-resume/pull/3414) | Head `d99662282`: public PDF downloads record explicit events after browser save initiation. API docs now describe password verification and the HttpOnly access cookie. 348 API tests and scoped Biome checks pass. Existing browser CI verifies PDF bytes, totals/daily downloads and unchanged views. |
| [#3348](https://github.com/amruthpillai/reactive-resume/issues/3348) | [#3415](https://github.com/amruthpillai/reactive-resume/pull/3415) | Semantic section heading and icon colors reach actual PDF drawing commands. Five graphics-state regressions and 688 PDF tests passed. |
| [#3180](https://github.com/amruthpillai/reactive-resume/issues/3180) | [#3417](https://github.com/amruthpillai/reactive-resume/pull/3417) | Moving items validates destinations and prunes only emptied custom source sections and affected empty pages; exact round-trip JSON, undo, 605 web tests and typecheck verified. |
| [#3360](https://github.com/amruthpillai/reactive-resume/issues/3360) | [#3419](https://github.com/amruthpillai/reactive-resume/pull/3419) | Approved per-resume download-button preference persists, backs up with account data, and hides both public buttons. Browser E2E and combined migration fresh/upgrade verification passed. |
| [#3305](https://github.com/amruthpillai/reactive-resume/issues/3305) | [#3420](https://github.com/amruthpillai/reactive-resume/pull/3420) | JPEG/WebP encoding is preserved and oversized crops shrink proportionally until within 10MiB. Near-limit JPEG browser reproduction now uploads successfully; transparency is preserved for PNG/WebP. Validation errors explain the upload limit. |
| [#3392](https://github.com/amruthpillai/reactive-resume/issues/3392) | [#3421](https://github.com/amruthpillai/reactive-resume/pull/3421) | Head `895fec3`: refreshed with current main, preserving both OAuth consent and application-export translations. Four affected package typechecks, 744 web tests, 105 server tests (four opt-in database cases skipped) and locale compilation pass. MCP registration, provider schema and explicit Allow/Deny consent restored; signed queries and repeated resources survive login. 98 server tests with real PostgreSQL and 636 web tests pass. Production OAuth exchanges for both advertised-root and /mcp resources reach MCP initialize HTTP 200; an issued client-audience ID token receives HTTP 401. Intentional service audience aliases retained; production E2E CI passes. |
| [#3337](https://github.com/amruthpillai/reactive-resume/issues/3337) | [#3422](https://github.com/amruthpillai/reactive-resume/pull/3422) | PDF page padding repeats across overflow while preserving template backgrounds; 45 actual-PDF geometry/raster cases pass; template background review claims checked against main and resolved styles. |
| [#3175](https://github.com/amruthpillai/reactive-resume/issues/3175) | [#3422](https://github.com/amruthpillai/reactive-resume/pull/3422) | Shared continuation-margin fix covers five affected templates, explicit headerless pages and full-width pages. |
| [#3255](https://github.com/amruthpillai/reactive-resume/issues/3255) | [#3423](https://github.com/amruthpillai/reactive-resume/pull/3423) | Approved shared library with copied resume styling, explicit refresh, retained conflict drafts, JSON/PDF export and application snapshots. Three production browser scenarios, 325 API tests, 598 web tests and combined migrations verified; browser CI and autofix pass. Codacy applies a SQL Server-only rule to the PostgreSQL migration. |
| [#3369](https://github.com/amruthpillai/reactive-resume/issues/3369) | [#3424](https://github.com/amruthpillai/reactive-resume/pull/3424) | Connects remaining Basics Website, Picture Size and shared WebsiteField labels. Three missing-name reproductions corrected; 10 DOM tests and web typecheck pass. Complements #3387, whose standalone primitive prop regressions were reproduced and reported on its review. |
| [#3247](https://github.com/amruthpillai/reactive-resume/issues/3247) | [#3425](https://github.com/amruthpillai/reactive-resume/pull/3425) | Adds compact thumbnails and per-account tab-session Grid/Compact/List preference. Five hook tests plus production browser navigation, reload, explicit URL override and mobile sizing pass. |
| [#3393](https://github.com/amruthpillai/reactive-resume/issues/3393) | [#3426](https://github.com/amruthpillai/reactive-resume/pull/3426) | CSV exports current filters or all applications with date range, contacts, notes and chronological history. 611 web tests and production browser downloads, owner isolation and mobile header checks pass. |
| [#3017](https://github.com/amruthpillai/reactive-resume/issues/3017) | [#3427](https://github.com/amruthpillai/reactive-resume/pull/3427) | Head `c315633f6`: picture borders and soft shadows preserve authored padding and insets. 708 PDF tests across 59 files, 25 targeted cases, compiled-server raster checks, three Chromium/Node PNG parity fixtures and production builds pass. Percentage picture width/height shadows remain a documented limitation. |
| [#2804](https://github.com/amruthpillai/reactive-resume/issues/2804) | [#3428](https://github.com/amruthpillai/reactive-resume/pull/3428) | Server PDFs lacked default section headings despite correct browser rendering. Generated locale subset restores saved resume language; 689 PDF tests, API tests and production normal/fallback browser paths pass. |
| [#3249](https://github.com/amruthpillai/reactive-resume/issues/3249) | [#3430](https://github.com/amruthpillai/reactive-resume/pull/3430) | Head `50bac62ed`: font metrics respect USE_TYPO_METRICS while preserving CJK fallbacks, including the selectable Noto Sans HK review correction. 699 PDF tests and 16 actual-font cases pass. Exact Roboto Condensed and controlled IBM fixtures improve; current Ropa Sans remains unchanged and historical optical alignment scope stays separate. |
| [#3291](https://github.com/amruthpillai/reactive-resume/issues/3291) | [#3431](https://github.com/amruthpillai/reactive-resume/pull/3431) | Head `b15f4983b`: color picker tracks current CSS through repeated presets, external edits and undo; spaced RGB/HSL tokens regain swatches. Approved hex output preserves optional alpha and named/modern RGB roundtrips. 78 focused tests and four previously verified production browser scenarios pass; all review feedback resolved. |
| [#2684](https://github.com/amruthpillai/reactive-resume/issues/2684) | [#3432](https://github.com/amruthpillai/reactive-resume/pull/3432) | Removes unsupported S3 object ACLs. Real SDK wire-contract stub reproduces AWS documented rejection; real Ceph gateway separately verifies public proxy and private access behavior. Exact reported deployment cause remains unproven; PR relates to the issue without closing it. |
| [#3040](https://github.com/amruthpillai/reactive-resume/issues/3040) | [#3434](https://github.com/amruthpillai/reactive-resume/pull/3434) | Head `2e29a4412`: permits Semantic CSS gap, row-gap and column-gap on level indicators. Seven actual-PDF raster regressions, 690 PDF tests and 1,349 resume-domain tests pass. Original vertical clipping and automatic pagination scope remain unproven; PR relates without closing #3040. |
| [#3340](https://github.com/amruthpillai/reactive-resume/issues/3340) | [#3435](https://github.com/amruthpillai/reactive-resume/pull/3435) | Head `27c17d8c1`: approved opt-in German hyphenation preserves default-off output and per-document isolation. 722 PDF tests across 59 files including 11 actual-PDF cases, 111 schema tests, 599 web tests, three package typechecks and production builds pass. Four Chromium locale/toggle exports, built-server PDF parity and exact shipped third-party notices verified. |
| [#3343](https://github.com/amruthpillai/reactive-resume/issues/3343) | [#3437](https://github.com/amruthpillai/reactive-resume/pull/3437) | Head `d154f31b8`: skill ratings align at the bottom of each multi-column row by default. Nine actual-PDF regressions and all 692 PDF tests pass. Single-column raster is byte-identical; CI and review approved. |
| [#3196](https://github.com/amruthpillai/reactive-resume/issues/3196) | [#3438](https://github.com/amruthpillai/reactive-resume/pull/3438) | Head `165535b5f`: preserves imported rich text without individually addressable semantic descendants. Seven actual-PDF regressions, all 690 PDF tests and a production import/save/reload/export reproduction pass. Original missing-border report remains open; this is a separate regression discovered during its investigation. |
| [#3344](https://github.com/amruthpillai/reactive-resume/issues/3344) | [#3443](https://github.com/amruthpillai/reactive-resume/pull/3443) | Head `45a38fdc9`: scoped React PDF layout patch keeps list markers with their first text fragments, respecting orphan counts, reordering, RTL and explicit pagination hints. 36 targeted cases and 847 PDF tests pass; current-main failure reproduced, single-page raster byte-identical. Independent review clean; 36 focused tests and a separate 250-word content-break probe pass. Extreme orphan/font-size limitations also reproduce on unchanged main. Issue remains open until merge. |

## Product decisions

- #3401: approved — hide footer link when registration is disabled; implemented in #3409.
- #3360: approved — per-resume option hiding download buttons; no limitation explanation in app.
- #3255: approved — independently saved cover-letter library, editable from library and builder, selected resume styling, exported snapshots attached to applications. Existing attachment PR #3395 remains related.
- #3291: approved — CSS picker writes hex, with alpha when needed; implemented in #3431.
- #3340: approved — opt-in per-resume hyphenation using the resume locale, German first. Missing/false preserves existing output; implemented and owner-merged in #3435.
- #3343: approved — align skill-rating bars at the bottom of each grid row by default; implemented in #3437.
- #3272: approved — keep cover-letter headings omitted; explained and closed as not planned.
- #3397: approved — indent the whole paragraph through the existing controls; implementation pending.
- Other architecture and visual feature choices remain listed under individual issues.

## Priority order

1. Finish verified regressions with isolated PRs, actual failure reproduction, and targeted regression coverage.
2. Complete OAuth compatibility and API contract fixes without weakening authentication or stored-data compatibility.
3. Restore download statistics using explicit browser download events and implement approved sharing controls.
4. Reproduce PDF/font/overflow reports using supplied fixtures; distinguish shared causes from unrelated symptoms.
5. Review existing PRs against entire issue scope and avoid duplicate fixes.
6. Resolve product architecture questions; request precise missing data for production-only incidents.

## Current audit classifications

| Classification | Count |
| --- | ---: |
| already_fixed | 11 |
| confirmed_bug | 26 |
| duplicate | 1 |
| existing_pr | 5 |
| feature | 10 |
| needs_reproduction | 41 |
| product_decision | 21 |

Classification describes the reported problem against the audit baseline; implementation and closure state are tracked separately.

## Issue evidence and next actions

### [#3433](https://github.com/amruthpillai/reactive-resume/issues/3433) — First interest keyword missing first letter when it is capital E

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Closed with evidence.

**Evidence:**

- New report September 5: the EDH interest keyword and EPFL publisher lose their leading uppercase E; ADH/BDH/CDH/FDH/EEDH/eDH are unaffected. No JSON or font identified.
- Current main controlled Onyx PDFs using IBM Plex Serif, Helvetica and IBM Plex Sans preserve all eight strings in both keyword/publisher fields, verified by raster and text extraction: /tmp/levelgap-fixture-3433-IBM-Plex-Serif.pdf and related fixtures.
- Existing PR #3386 changes section-heading padding only; affected field paths in sections.tsx:1226 and :1332 do not consume getSectionHeadingTextStyle. No demonstrated duplicate/fix relationship.
- Reported v5.2.9 uses renderer 4.8.1 versus current 4.9.0, and PDF.js 6.2.108 versus 6.3.289. Clean detached v5.2.9 with its original frozen dependencies also renders/extracts all eight strings intact in both fields for IBM Plex Serif, Helvetica and IBM Plex Sans: /tmp/v529-fixture-3433-*.pdf. No demonstrated fix across versions; reporter font/styles remain unknown.
- Production Chromium (33.8 s) and Firefox 153 on macOS (35.2 s) browser workflows pass: typing 16 fields, DB save, reload and PDF download preserve EDH/EPFL/ADH/BDH/CDH/FDH/EEDH/eDH twice each in Azurill with IBM Plex Serif 400/600. Evidence: /tmp/issue-3433-ui-chromium.json and /tmp/issue-3433-ui-firefox.json. Exact reporter Firefox 155/Linux environment remains unverified; issue comment 5552405183 updated.
- Reporter confirmed on 2026-09-05 that restarting their setup made the problem disappear; issue closed as completed. https://github.com/amruthpillai/reactive-resume/issues/3433#issuecomment-5552950562. No specific code fix established.

**Action plan:**

- Issue closed after reporter-confirmed recovery. No code fix is attributed to this report.

### [#3401](https://github.com/amruthpillai/reactive-resume/issues/3401) — Remove "Build your own resume" from footer

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Closed with evidence.

**Evidence:**

- PublicResumeRoute always renders footer link to / (public-resume.tsx:54-62).
- PR #3409 was merged by the repository owner and closed the issue on 2026-09-05. Public signup footer now hides when registration is disabled; four public-page tests passed.

**Action plan:**

- Issue closed; relevant merged PRs: #3409. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3409](https://github.com/amruthpillai/reactive-resume/pull/3409). Public signup footer is hidden when registration is disabled, as approved. Four public-page tests passed.

**Product/scope note:** User approved hide when registration disabled.

**Related PRs:** [#3409](https://github.com/amruthpillai/reactive-resume/pull/3409)

### [#3398](https://github.com/amruthpillai/reactive-resume/issues/3398) — MCP OAuth login fails during dynamic client registration with HTTP 500

**Assessment:** `confirmed_bug`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Same main DCR path as #3392: auth config enables unauthenticated DCR while schema/auth.ts:250-292 omits clientDiscoveryId that installed plugin registration writes.
- Cloud exact HTTP response/server log unavailable; do not conflate possible redirect allowlist failure with missing-schema failure.
- Merged #3421 covers the reproduced schema-related registration HTTP500; cloud cause still needs deployment logs/retest. Linked fix without premature duplicate closure: https://github.com/amruthpillai/reactive-resume/issues/3398#issuecomment-5553215414.

**Action plan:**

- Fix #3392 schema/config chain, verify Codex and Claude registration with supported redirects, correlate deployment logs before duplicate closure.

### [#3397](https://github.com/amruthpillai/reactive-resume/issues/3397) — Allow indentations without list

**Assessment:** `feature`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- apps/web/src/components/input/rich-input.tsx:64-90 registers StarterKit, TextStyle, Color, Highlight, TextAlign; indentation commands at 305 are list-specific.

**Action plan:**

- Implement paragraph/heading indentation with bounded steps, preserving list behavior. Verify save/reload, PDF and DOCX, and investigate leading-space/tab preservation before claiming the full issue resolved.

**Product/scope note:** User approved whole-paragraph indentation through the existing indent controls. Leading spaces and tabs remain part of the original request and require explicit export/persistence verification.

### [#3393](https://github.com/amruthpillai/reactive-resume/issues/3393) — [Feature] Export job applications as CSV / printable report

**Assessment:** `feature`. **Confidence:** medium. **State:** Closed with evidence.

**Evidence:**

- Applications route filters in memory by search/tags/archive; only CSV import exists (dashboard/applications/index.tsx:97-114; applications/csv.ts).

**Action plan:**

- Issue closed; relevant merged PRs: #3426. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3426](https://github.com/amruthpillai/reactive-resume/pull/3426). CSV exports current filters or all applications with date range, contacts, notes and chronological history. 611 web tests and production browser downloads, owner isolation and mobile header checks pass.

**Product/scope note:** Scope CSV first; no compliance guarantees.

**Related PRs:** [#3426](https://github.com/amruthpillai/reactive-resume/pull/3426)

### [#3392](https://github.com/amruthpillai/reactive-resume/issues/3392) — [Bug] MCP OAuth flow is broken end-to-end for self-hosted instances: incomplete oauth-provider schema, wrong resource config option, and callbackURL dropped after login

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Main e549d114e packages/auth/src/config.ts:302-310 uses validAudiences rather than resources and omits clientRegistrationDefaultResources.
- packages/db/src/schema/auth.ts:250-377 lacks clientDiscoveryId and new OAuth resource/client-resource/assertion models; installed oauth-provider dist/oauth-1Ud-hvZY.d.mts declares them and authorize-BmTe2VYG.mjs:1955 writes clientDiscoveryId.
- apps/web/src/features/auth/pages/login.tsx:72,78 drops callbackURL when navigating to 2FA/dashboard.
- PR #3421 merged at verified head `895fec352`: 98 server tests with real PostgreSQL, 636 web tests and production E2E CI pass. Real advertised-root and /mcp access tokens initialize MCP with HTTP200; issued client-audience ID token gets HTTP401. SDK1.30 selects root/slash from advertised metadata; service aliases deliberately preserved.

**Action plan:**

- Issue closed; relevant merged PRs: #3421. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3421](https://github.com/amruthpillai/reactive-resume/pull/3421). Head `895fec3`: refreshed with current main, preserving both OAuth consent and application-export translations. Four affected package typechecks, 744 web tests, 105 server tests (four opt-in database cases skipped) and locale compilation pass. MCP registration, provider schema and explicit Allow/Deny consent restored; signed queries and repeated resources survive login. 98 server tests with real PostgreSQL and 636 web tests pass. Production OAuth exchanges for both advertised-root and /mcp resources reach MCP initialize HTTP 200; an issued client-audience ID token receives HTTP 401. Intentional service audience aliases retained; production E2E CI passes.

**Related PRs:** [#3421](https://github.com/amruthpillai/reactive-resume/pull/3421)

### [#3391](https://github.com/amruthpillai/reactive-resume/issues/3391) — Show Notes on job application detail view

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Application DTO includes notes; detail sheet omitted current.notes. Form retains notes. Six-line rendering fix reviewed and typechecked.

**Action plan:**

- Issue closed; relevant merged PRs: #3402. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3402](https://github.com/amruthpillai/reactive-resume/pull/3402). Saved application notes now appear as escaped, wrapping text. Merged by repository owner; issue closed.

**Product/scope note:** Implemented and owner-merged in #3402; issue closed.

**Related PRs:** [#3402](https://github.com/amruthpillai/reactive-resume/pull/3402)

### [#3380](https://github.com/amruthpillai/reactive-resume/issues/3380) — [Bug] First character of a section title is dropped in the builder (e.g. "Experience" renders as "xperience")

**Assessment:** `existing_pr`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- PR #3386 merged at head `a3053e206`; its section-heading padding fix is now on main.
- packages/pdf/src/templates/shared/sections.tsx:191 getSectionHeadingTextStyle; icon-bearing heading at :367 uses the corrected text padding.

**Action plan:**

- Issue closed; relevant merged PRs: #3386. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3386](https://github.com/amruthpillai/reactive-resume/pull/3386)

### [#3379](https://github.com/amruthpillai/reactive-resume/issues/3379) — Add option to add company logo to entries

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Resume templates render text-based experience entries; no company-logo workflow is exposed in existing item forms.

**Action plan:**

- Decide logo URL vs uploaded asset, size/placement, and supported item types. If accepted add optional schema field, storage rules, UI and renderer support, import defaults, PDF/DOCX tests.

**Product/scope note:** Needs user product decision.

### [#3378](https://github.com/amruthpillai/reactive-resume/issues/3378) — Option to re add section after accidental deletion

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Current layout/pages.tsx:200-214 moves all sections to another page before deleting a page. Layout item menu at 660 offers Move and page-break options, not section deletion. section-menu.tsx:55-65 offers reversible hidden state.
- Current main 0207e5dfc still provides Section options > Show for hidden built-in sections. Posted precise request for version, deletion action and sanitized metadata.layout to distinguish missing layout references: https://github.com/amruthpillai/reactive-resume/issues/3378#issuecomment-5553162647.

**Action plan:**

- Request exact version and deletion action or a sanitized affected JSON. If section IDs are absent from all layout pages, add an explicit unplaced-sections restore control preserving hidden state and items.

### [#3377](https://github.com/amruthpillai/reactive-resume/issues/3377) — Option to not use google fonts (e.g. only local ones)

**Assessment:** `feature`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- getWebFontSource returns remote URLs from packages/fonts/src/webfontlist.json; registerFonts uses them directly (use-register-fonts.ts:255-258). Standard Helvetica/Courier/Times-Roman skip registration, but script fallbacks remain remote.

**Action plan:**

- Provide font source configuration or bundled subset with local browser/server URLs. Cover heading/body/italics and CJK/Arabic fallback fonts and picker previews. Test PDF render with outbound networking blocked.

**Product/scope note:** Pending maintainer answer requested in this audit: self-hosted font source, small bundled offline font set, or defer. Standard fonts alone do not prove fully offline rendering.

### [#3374](https://github.com/amruthpillai/reactive-resume/issues/3374) — AI Provider test timeout is too short

**Assessment:** `existing_pr`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Baseline packages/api/src/features/ai/service.ts:94,265 hardcoded 30_000 ms; PR #3384 merged at head `8a96b7c9f` with turbo globalEnv coverage and tests.

**Action plan:**

- Issue closed; relevant merged PRs: #3384. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3384](https://github.com/amruthpillai/reactive-resume/pull/3384)

### [#3373](https://github.com/amruthpillai/reactive-resume/issues/3373) — Add a Secondary Color

**Assessment:** `product_decision`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- packages/schema/src/resume/data.ts:colorDesignSchema only defines primary/text/background; existing semantic CSS supports explicit colors.

**Action plan:**

- Choose which template elements consume secondary color and default migration behavior; then schema, UI, template mappings, import/export and visual tests.

### [#3370](https://github.com/amruthpillai/reactive-resume/issues/3370) — The set-password dialog is one unlabelled field with no confirmation, and a password below the API's documented minimum is dropped in silence

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- apps/web/src/hooks/use-prompt.tsx:86-90 unconditionally resolves/closes; one input :124-130.
- Builder sharing.tsx:54-67 only trims/rejects empty password; server sharing.ts:37 documents 6-64 characters.

**Action plan:**

- Issue closed; relevant merged PRs: #3407. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3407](https://github.com/amruthpillai/reactive-resume/pull/3407). Labeled password and confirmation dialog validates length/matching and retains failures. 605 web tests, typecheck, and updated browser E2E passed.

**Related PRs:** [#3407](https://github.com/amruthpillai/reactive-resume/pull/3407)

### [#3369](https://github.com/amruthpillai/reactive-resume/issues/3369) — FormControl stamps the label's target id on a non-labelable wrapper, so Slug, Tags and the Sidebar Width slider have no accessible name

**Assessment:** `existing_pr`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- PR #3387 open; covers FormControl/InputGroup/ChipInput/Slider id plumbing. Its body explicitly excludes dangling URLInput/RichTextField targets.
- Issue requests dangling Picture Size and Website labels too, so PR closing claim should be checked against full acceptance matrix.
- Reviewed PR #3387 head 6ea7d540: 58 supplied focused tests pass, but actual DOM probes reproduce unnamed Basics Website and Picture Size fields; shared WebsiteField has same missing FormControl.
- Two standalone primitive compatibility probes pass main and fail PR #3387: Slider discards explicit id; InputGroup discards caller id and aria-describedby. No current app call site demonstrated an outage from those prop regressions.

**Action plan:**

- Issue closed; relevant merged PRs: #3387, #3424. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3424](https://github.com/amruthpillai/reactive-resume/pull/3424). Connects remaining Basics Website, Picture Size and shared WebsiteField labels. Three missing-name reproductions corrected; 10 DOM tests and web typecheck pass. Complements #3387, whose standalone primitive prop regressions were reproduced and reported on its review.

**Related PRs:** [#3387](https://github.com/amruthpillai/reactive-resume/pull/3387), [#3424](https://github.com/amruthpillai/reactive-resume/pull/3424)

### [#3368](https://github.com/amruthpillai/reactive-resume/issues/3368) — Documented resume bounds are silently coerced instead of rejected: a write outside the published schema returns 200 and stores something the client never sent

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/api/src/features/resume/resume-data-validation.ts:8,23-24 uses tolerant parseResumeData for writes. packages/schema/src/resume/data.ts:629 catches invalid template as onyx; marginX catches as 14. Direct current-main runtime probe: unknown template and marginX=500 parse to onyx and 14 (artifact /tmp/audit-builder-probe.jsonl).

**Action plan:**

- Issue closed; relevant merged PRs: #3413. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3413](https://github.com/amruthpillai/reactive-resume/pull/3413). Submitted writes reject values outside published bounds while stored reads and historical migrations remain tolerant. Legacy JSON fixtures and schema/API/domain/import suites verified.

**Related PRs:** [#3413](https://github.com/amruthpillai/reactive-resume/pull/3413)

### [#3366](https://github.com/amruthpillai/reactive-resume/issues/3366) — The Downloads statistic can never be non-zero: no code path ever increments it

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Statistics increment helper exists, but current export/public PDF paths have no download event. Public viewer and export share PDF generation/cache, so counting all renders would count mere views.

**Action plan:**

- Issue closed; relevant merged PRs: #3414. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3414](https://github.com/amruthpillai/reactive-resume/pull/3414). Head `d99662282`: public PDF downloads record explicit events after browser save initiation. API docs now describe password verification and the HttpOnly access cookie. 348 API tests and scoped Biome checks pass. Existing browser CI verifies PDF bytes, totals/daily downloads and unchanged views.

**Product/scope note:** Requires explicit download event, not render counter.

**Related PRs:** [#3414](https://github.com/amruthpillai/reactive-resume/pull/3414)

### [#3361](https://github.com/amruthpillai/reactive-resume/issues/3361) — .env in compose.yml

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- compose.yml:90-92 loads only .env.example. docs/self-hosting/docker.mdx:177-178 uses .env. A root .env only used for Compose interpolation cannot supply unreferenced container flags.

**Action plan:**

- Issue closed; relevant merged PRs: #3411. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3411](https://github.com/amruthpillai/reactive-resume/pull/3411). Compose loads optional .env after sample defaults; docs distinguish repository Compose from standalone quickstart. Both actual configurations verified.

**Related PRs:** [#3411](https://github.com/amruthpillai/reactive-resume/pull/3411)

### [#3360](https://github.com/amruthpillai/reactive-resume/issues/3360) — Sharing: Add a toggle to disable download feature

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- PublicResumeRoute unconditionally renders header and floating Download PDF controls (public-resume.tsx:40-47,65-75).

**Action plan:**

- Add per-resume presentation flag defaulting to visible, UI toggle in Sharing, and hide both public download controls. Preserve builder export. Test default, saved flag and public route.

**Implementation:** [PR #3419](https://github.com/amruthpillai/reactive-resume/pull/3419). Approved per-resume download-button preference persists, backs up with account data, and hides both public buttons. Browser E2E and combined migration fresh/upgrade verification passed.

**Product/scope note:** User approved; explicitly no limitation explanation in app.

**Related PRs:** [#3419](https://github.com/amruthpillai/reactive-resume/pull/3419)

### [#3359](https://github.com/amruthpillai/reactive-resume/issues/3359) — Incorrect Link Preview Shows Template CV Instead of User's CV

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Public route head constructs imageUrl from /templates/jpg/${social.template}.jpg ($username/$slug.tsx:33), depicting sample resume identity.

**Action plan:**

- Issue closed; relevant merged PRs: #3410. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3410](https://github.com/amruthpillai/reactive-resume/pull/3410). Public social previews use neutral branding instead of a sample identity. Personal title/description remain intact.

**Product/scope note:** Neutral preview accepted by original issue; dynamic personal thumbnails can follow later.

**Related PRs:** [#3410](https://github.com/amruthpillai/reactive-resume/pull/3410)

### [#3352](https://github.com/amruthpillai/reactive-resume/issues/3352) — Level Type Icon does not show the skill level

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/templates/shared/level-display.tsx:73-88 renders five icons with active/inactive opacity. semantic/tree.ts:227-244 builds five corresponding nodes.
- Actual main PDF smoke /tmp/audit-3352.pdf, default Onyx semantic mode, level 3/star, produced 6 SVG hosts (1 skill icon + 5 level icons). This is NOT exact Scizor attachment reproduction.
- Exact attachment rendered on main: /tmp/fixture-3352.pdf and /tmp/fixture-3352-1.png. First row levels 0/1/2/3; all nonzero levels show five identically colored outlined stars. SVG host opacity varies 1/.35, but rendered output does not distinguish inactive icons.
- Fix verified in .worktrees/issue-3352-icon-level: primitives.tsx Icon forwards merged final opacity as SVG prop. Actual PDF operator regression red (4 failures/2 controls) then green (6 tests); semantic opacity 0.2 and 0 retained. Reporter JSON raster /tmp/fixed-fixture-3352-1.png shows intended levels 0-5 and preserved red strokes; baseline /tmp/fixture-3352-1.png shows all opaque.

**Action plan:**

- Issue closed; relevant merged PRs: #3412. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3412](https://github.com/amruthpillai/reactive-resume/pull/3412). SVG icon opacity reaches actual PDF drawing operations; reporter fixture renders distinct ratings. Six graphics-state tests and 689 PDF tests passed.

**Related PRs:** [#3412](https://github.com/amruthpillai/reactive-resume/pull/3412)

### [#3350](https://github.com/amruthpillai/reactive-resume/issues/3350) — ``Keep together`` also for items | widow & orphan control

**Assessment:** `feature`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- packages/schema/src/resume/data.ts:294-298 exposes keepTogether/startOnNewPage on sections. SectionItem at packages/pdf/src/templates/shared/sections.tsx:479 has no item-level builder control.
- Semantic presentation flow props already apply through item Div and section shells; existing pagination tests distinguish authored/physical pages.

**Action plan:**

- Decide per-item UI/schema support and widow/orphan controls; exercise item taller than page, nested experience roles, two columns, and CSS precedence.

**Product/scope note:** Pending maintainer answer requested in this audit: per-item Keep together only, explicit widow/orphan UI too, or Semantic CSS only.

### [#3348](https://github.com/amruthpillai/reactive-resume/issues/3348) — Semantic CSS color has no effect on section heading text or icon

**Assessment:** `confirmed_bug`. **Confidence:** medium. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/templates/shared/sections.tsx:355-369 puts resolved section-heading style on container but child Heading binds false and omits sectionHeadingResolved.style. Child explicit foreground can override inheritance. SectionHeadingIcon in primitives.tsx:457-498 composes style but passes template icon props separately.

**Action plan:**

- Issue closed; relevant merged PRs: #3415. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3415](https://github.com/amruthpillai/reactive-resume/pull/3415). Semantic section heading and icon colors reach actual PDF drawing commands. Five graphics-state regressions and 688 PDF tests passed.

**Related PRs:** [#3415](https://github.com/amruthpillai/reactive-resume/pull/3415)

### [#3347](https://github.com/amruthpillai/reactive-resume/issues/3347) — API endpoint that displays the running version of the software

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- health.ts:48 reads npm_package_version, absent in Docker CMD node startup or 0.0.0 for server package. app-version.ts already exports build constant. OpenAPI generator omits /api/health.

**Action plan:**

- Issue closed; relevant merged PRs: #3404. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3404](https://github.com/amruthpillai/reactive-resume/pull/3404). Health exposes the build version and its endpoint appears in OpenAPI. Public errors are generic; diagnostic details remain in server logs. 74 server tests pass.

**Product/scope note:** Existing maintainer explicitly approved endpoint version property plus OpenAPI.

**Related PRs:** [#3404](https://github.com/amruthpillai/reactive-resume/pull/3404)

### [#3344](https://github.com/amruthpillai/reactive-resume/issues/3344) — Bullet point remains on first page if bullet is moved to next page

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Report 5.2.6 is later than merged list-marker fixes #3236 (ed5d10c49) and #3242 (d536b1921); cannot close against those earlier fixes.
- Current rich-text renderer has marker/content pagination handling; generic PDF suite passes but no exact issue JSON fixture exists.
- ActualPDF controlledboundarysweep currentmain: Onyx300x300pt/Helvetica10, summarylistparagraph withrichtextmargin-top194pt leavesbulletpage1 andTARGET firstlinepage2;192pt control textstartspage1. /tmp/3344-repro.pdf,/tmp/issue-3344-controlled.json,/tmp/3344-sweep.json. This is controlledcurrentreproduction; nooriginalJSON supplied.
- History#3178/5080fddf5 nestedmarker/content;#3236/ed5d10c49 laterreplacedwithmarker minPresenceAhead. CurrentlegacyReactPDFpaginator splitsrowchildrenindependently; markerone-line canremain whileparagraph defaultorphans2 movescontent. Existingguarddoesnotpreventthiscase.
- PR #3443 head 4ad69f2a9 passes 847 PDF tests, 36 focused pagination regressions, actual-main red/green and byte-identical single-page PNG parity. Independent review /tmp/rr-3344-independent-review.md is clean, including an extra 250-word content-break probe. All CI checks pass at this head.

**Action plan:**

- Review PR #3443 without merging in this task. It fixes marker/text pagination via a version-pinned, list-tag-scoped layout patch. Keep issue open until merge. Extreme orphan counts and oversized fonts also fail on unchanged main and are separate renderer limits.

**Implementation:** [PR #3443](https://github.com/amruthpillai/reactive-resume/pull/3443). Head `4ad69f2a9`: scoped React PDF layout patch keeps list markers with their first text fragments, respecting orphan counts, reordering, RTL and explicit pagination hints. 36 targeted cases and 847 PDF tests pass; current-main failure reproduced, single-page raster byte-identical. Independent review clean; 36 focused tests and a separate 250-word content-break probe pass. Extreme orphan/font-size limitations also reproduce on unchanged main. Issue remains open until merge.

**Related PRs:** [#3178](https://github.com/amruthpillai/reactive-resume/pull/3178), [#3236](https://github.com/amruthpillai/reactive-resume/pull/3236), [#3443](https://github.com/amruthpillai/reactive-resume/pull/3443)

### [#3343](https://github.com/amruthpillai/reactive-resume/issues/3343) — Skill level icons not aligned horizontally when having multiple columns per row with different amount of lines for keywords

**Assessment:** `product_decision`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/templates/shared/sections.tsx:1146 SkillsSection renders each item header/proficiency/keywords/level in natural vertical flow; each column item has independent height.
- Requested row-aligned icon bars require choosing bottom-aligned row layout versus present natural flow; open #3358 adds another skills layout, not this same request.
- PR #3437: actual PDF reproduction fails before the change in legacy and Semantic CSS modes and passes afterward. Nine regression cases cover mixed heights, incomplete rows, custom sections, filtering, zero ratings, supported item padding and automatic pagination. All 692 PDF tests across 58 files, typecheck, formatting and boundaries pass; CI and review approved. Before/after visual inspection confirms alignment; single-column PNG bytes are identical.

**Action plan:**

- Issue closed; relevant merged PRs: #3437. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3437](https://github.com/amruthpillai/reactive-resume/pull/3437). Head `d154f31b8`: skill ratings align at the bottom of each multi-column row by default. Nine actual-PDF regressions and all 692 PDF tests pass. Single-column raster is byte-identical; CI and review approved.

**Product/scope note:** User approved row-bottom skill-rating alignment. Implemented in owner-merged PR #3437; issue closed.

**Related PRs:** [#3358](https://github.com/amruthpillai/reactive-resume/pull/3358), [#3437](https://github.com/amruthpillai/reactive-resume/pull/3437)

### [#3341](https://github.com/amruthpillai/reactive-resume/issues/3341) — Icons of Basics are offset vertically lower than following text

**Assessment:** `duplicate`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Reporter names IBM Plex Sans Condensed and provides JSON in 2026-08-24 comment; #3249 comments already reproduce same font baseline alignment across Onyx/Rhyhorn and other templates.
- Both describe baseline relative to icons, varying by font, with Open Sans appearing aligned; #3249 includes IBM Plex Sans Condensed and Roboto variants. Preserve supplied JSON as #3249 reproduction.

**Action plan:**

- Consolidate into #3249 while retaining provided IBM Plex Sans Condensed JSON; raster comparison across fonts and header/section/item icons remains needed.

### [#3340](https://github.com/amruthpillai/reactive-resume/issues/3340) — Hyphenation defunct

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/hooks/use-register-fonts.ts:223-234 explicitly returns [word] for all non-CJK words, disabling hyphenation including German compounds.
- This establishes current non-hyphenating behavior statically; language-aware dictionary choice and soft-hyphen preservation are not implemented.
- PR #3435 head `27c17d8c1`: 722 PDF tests across 59 files including 11 actual-PDF cases, 111 schema tests, 599 web tests including five DOM cases, three package typechecks and boundaries/knip/frozen offline install/check pass. Production web/server builds and Chromium four-case locale/toggle exports pass; built-server PDF parity, exact distributed third-party notice and visual UI verified.

**Action plan:**

- Issue closed; relevant merged PRs: #3435. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3435](https://github.com/amruthpillai/reactive-resume/pull/3435). Head `27c17d8c1`: approved opt-in German hyphenation preserves default-off output and per-document isolation. 722 PDF tests across 59 files including 11 actual-PDF cases, 111 schema tests, 599 web tests, three package typechecks and production builds pass. Four Chromium locale/toggle exports, built-server PDF parity and exact shipped third-party notices verified.

**Product/scope note:** User approved opt-in per-resume German hyphenation using resume locale; missing/false preserves existing output. Implemented and owner-merged in PR #3435, head 27c17d8c1.

**Related PRs:** [#3435](https://github.com/amruthpillai/reactive-resume/pull/3435)

### [#3339](https://github.com/amruthpillai/reactive-resume/issues/3339) — Headline does not respect horizontal margin setting

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/templates/onyx/OnyxPage.tsx:159-169 gives header row picture sibling but headerTitle has no flex width constraint.
- Actual current-main PDF /tmp/audit-3339.pdf: headline starts x=102.414337, extracted width=496.013359, right edge 598.43 beyond A4 width 595.28 and content edge 581.28; text suffix clipped. Fixture uses picture size 100 and long headline.

**Action plan:**

- Issue closed; relevant merged PRs: #3408. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3408](https://github.com/amruthpillai/reactive-resume/pull/3408). Onyx headlines wrap within page margins. Three actual-PDF regressions and 686 PDF tests passed.

**Related PRs:** [#3408](https://github.com/amruthpillai/reactive-resume/pull/3408)

### [#3338](https://github.com/amruthpillai/reactive-resume/issues/3338) — Education: If no Area of Study given, Location and Period jump to the left edge

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/pdf/src/templates/shared/sections.tsx:900-911 and :1076-1092 omit optional position/area but leave trailing text as sole child of space-between row.
- Actual main PDF /tmp/audit-3338.pdf: normal City/Degree right edges 581.28; absent position period 2020 x=14; absent area City • 2021 x=14. Reproduced with Onyx/Helvetica.

**Action plan:**

- Issue closed; relevant merged PRs: #3406. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3406](https://github.com/amruthpillai/reactive-resume/pull/3406). Dates align correctly when the opposite optional field is blank. Four actual-PDF layout regressions and 687 PDF tests passed.

**Related PRs:** [#3406](https://github.com/amruthpillai/reactive-resume/pull/3406)

### [#3337](https://github.com/amruthpillai/reactive-resume/issues/3337) — Vertical margin not respected when item spans across pages in 2-column templates

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- DitgarPage.tsx:213-216 puts no vertical padding on Page, while mainContent/sidebarContent :244-255 carry padding; ChikoritaPage.tsx:76-105 likewise pads nested regions. Glalie mainContent :223-226 lacks bottom padding.
- Pikachu uses shared page-shell unlike affected templates. Static evidence supports pagination-padding cause, but exact multipage PDF fixture not generated yet.
- Actual PDF geometry reproduction at main e549d114e: 60-paragraph experience, vertical margin48, two-column page. Ditgar/Chikorita/Glalie/Leafish second physical page text top=-1pt, first-page bottom14-25pt; Ditto second-page top2pt and first-page bottom11pt. Pikachu/Onyx controls respect top47-50pt and bottom>66pt. /tmp/audit-3337-margins.json and /tmp/margins-{template}.pdf. Separate exact template reports preserved; shared symptom positively reproduced.
- Fix in .worktrees/issue-3337-page-margins: physical Page padding on Ditgar/Chikorita/Glalie/Leafish/Ditto; first-page offset retained, sidebar margin paint preserves baseline colors. Actual-PDF regression red10/14 -> green28 cases (semantic, legacy, both columns, RTL; all60 paragraphs retained; raster corner colors and first-header position guarded). PDF typecheck + Biome pass. Current fixture geometry /tmp/audit-3337-margins-fixed.json; baseline /tmp/audit-3337-margins.json.
- Additional explicit-headerless/fullWidth PDF regression: Ditto initially started content at 96.5pt for marginY48 (2 failures, other 12 cases passed); conditional header gap fixes to requested margin. Final page-margins.test.tsx 42 tests pass, PDF typecheck passes. Earlier full PDF suite58files711tests passed before this bounded headerless correction.

**Action plan:**

- Issue closed; relevant merged PRs: #3422. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3422](https://github.com/amruthpillai/reactive-resume/pull/3422). PDF page padding repeats across overflow while preserving template backgrounds; 45 actual-PDF geometry/raster cases pass; template background review claims checked against main and resolved styles.

**Related PRs:** [#3422](https://github.com/amruthpillai/reactive-resume/pull/3422)

### [#3334](https://github.com/amruthpillai/reactive-resume/issues/3334) — Import a PDF resume without requiring an AI provider

**Assessment:** `existing_pr`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Issue requests deterministic PDF import without AI; existing open PR #3400 implements this surface.

**Action plan:**

- Review PR #3400 for text PDF classification, scanned-document errors, text preservation, custom sections, layout placement and AI path preference. Do not create duplicate implementation.

**Product/scope note:** PR #3400 remains unmerged.

**Related PRs:** [#3400](https://github.com/amruthpillai/reactive-resume/pull/3400)

### [#3323](https://github.com/amruthpillai/reactive-resume/issues/3323) — I am able to download resume but unable to get the content/data that I have added in the template

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Body lacks version, template, sanitized data or actual output; maintainer requested precise steps twice (latest 2026-08-16).
- Current builder draft.ts serializes pending saves; export path source alone cannot identify whether this concerns editor save, rendering or import.

**Action plan:**

- Obtain sanitized input/output and exact version/download path; compare server stored resume and PDF extraction before selecting owner.

### [#3312](https://github.com/amruthpillai/reactive-resume/issues/3312) — [Bug] <title>INTERNAL SERVER ERROR on Application Copilot section

**Assessment:** `existing_pr`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/api/src/features/applications/ai.ts:32-34 generatePlainText forwards provider error without translation; other procedures call generateJson.
- PR #3333 merged at head `5a29dadf8` with gateway error mapping and tests.

**Action plan:**

- Issue closed; relevant merged PRs: #3333. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3333](https://github.com/amruthpillai/reactive-resume/pull/3333)

### [#3311](https://github.com/amruthpillai/reactive-resume/issues/3311) — [Bug] Basics box on Glalie doesn't have formatting

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- GlaliePage.tsx:244-250 deliberately fixes contactList borderRadius to 0. Commit c1d11236a / merged PR #3121 removed inherited picture.borderRadius to resolve #3119.
- Current Semantic CSS has contact-list node; lack of old picture-radius coupling is intentional.
- Actual Glalie PDFs on unchanged main e549d114e verify contact-list { border-radius: 12pt; } rounds all corners; background-color and border width/color also render. Four PDF fixtures visually inspected; picture styles remain identical under contact CSS, and picture radius/size/rotation changes leave contact styles unchanged. /tmp/issue-3311-reproduction/results.json.
- Closed completed with tested Semantic CSS guidance, activation step and official documentation: https://github.com/amruthpillai/reactive-resume/issues/3311#issuecomment-5552427620.

**Action plan:**

- Closed with current supported formatting evidence; no dedicated-control requirement inferred and no picture-radius coupling restored. Reopen only with a minimal failing current-version fixture.

**Related PRs:** [#3121](https://github.com/amruthpillai/reactive-resume/pull/3121)

### [#3305](https://github.com/amruthpillai/reactive-resume/issues/3305) — [Bug] Input validation failed when uploading photo to resume

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Issue logs contain uploaded image/png files named .jpg, sizes12,598,408–32,635,688, above existing10MiB upload limit.
- Actual Chromium execution of production crop function expanded deterministic6,498,294-byte JPEG into34,895,680-byte PNG. Preserving original JPEG compression produces7,725,008 bytes.
- getReadableErrorMessage discarded ORPC BAD_REQUEST data.issues details. Two new regressions fail before fix and25tests pass afterward;602webtests/typecheck pass.

**Action plan:**

- Issue closed; relevant merged PRs: #3420. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3420](https://github.com/amruthpillai/reactive-resume/pull/3420). JPEG/WebP encoding is preserved and oversized crops shrink proportionally until within 10MiB. Near-limit JPEG browser reproduction now uploads successfully; transparency is preserved for PNG/WebP. Validation errors explain the upload limit.

**Related PRs:** [#3420](https://github.com/amruthpillai/reactive-resume/pull/3420)

### [#3291](https://github.com/amruthpillai/reactive-resume/issues/3291) — [Bug] color picker visual bug

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Reporter explicitly says main CSS worker issue fixed in #3293; remaining defects are stale/duplicate color swatches and formatting. editor-extensions.ts:232-280 compares token positions/value and builds widgets; editor.tsx handles popover edits.
- PR #3431 at b15f4983b fixes stale picker ranges and duplicate swatches, successive presets, spaced RGB/HSL tokens and approved hex/alpha serialization. 78 focused tests and four prior production browser scenarios verified; all review feedback resolved. Original CSS worker error was already fixed by #3293.

**Action plan:**

- Issue closed; relevant merged PRs: #3431. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3431](https://github.com/amruthpillai/reactive-resume/pull/3431). Head `b15f4983b`: color picker tracks current CSS through repeated presets, external edits and undo; spaced RGB/HSL tokens regain swatches. Approved hex output preserves optional alpha and named/modern RGB roundtrips. 78 focused tests and four previously verified production browser scenarios pass; all review feedback resolved.

**Product/scope note:** User-approved hex output with alpha when needed was implemented and owner-merged in #3431 at b15f4983b.

**Related PRs:** [#3293](https://github.com/amruthpillai/reactive-resume/pull/3293), [#3431](https://github.com/amruthpillai/reactive-resume/pull/3431)

### [#3290](https://github.com/amruthpillai/reactive-resume/issues/3290) — [Bug] resume preview unavailable and download. All the pages are black

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Maintainer explicitly requested recurrence evidence after #3104 on 2026-08-16; no user response in full comments.
- Current preview.browser.tsx:121 generates PDF via createResumePdfBlob; report says downloaded PDF black too, so cannot attribute solely to canvas/background UI.

**Action plan:**

- Obtain sanitized JSON, downloaded PDF and current browser/version; inspect actual PDF color operators/style/background and font failures.

### [#3285](https://github.com/amruthpillai/reactive-resume/issues/3285) — [Bug] Semantic CSS parity check fails on skill keyword lists (gengar template) due to legacy renderer's phantom empty text node

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- main f64d02df7 (#3289) removes/normalizes phantom Gengar text. legacy-parity.test.ts:258 and :319 directly exercise reported empty proficiency/empty host artifact. Current targeted Vitest: 2 passed, 30 skipped. Explicit activation parity also removed in #3316.

**Action plan:**

- Issue closed; relevant merged PRs: #3289, #3316. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3289](https://github.com/amruthpillai/reactive-resume/pull/3289), [#3316](https://github.com/amruthpillai/reactive-resume/pull/3316)

### [#3275](https://github.com/amruthpillai/reactive-resume/issues/3275) — [Bug] RTL resumes render incorrectly

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- use-register-fonts.ts:158-177,270-295 detects Arabic/Hebrew and registers script fallback families; shared rtl helpers and template RTL layout exist.
- Merged #3099 concerns Rhyhorn, not proof that every template or Persian/Hebrew shaping works; #3151 is closed but report is broader.

**Action plan:**

- Render Arabic/Hebrew/Persian samples in affected template and fonts; verify joined characters, mixed Latin numerals, RTL ordering and location/date alignment independently.

**Related PRs:** [#3099](https://github.com/amruthpillai/reactive-resume/pull/3099), [#3158](https://github.com/amruthpillai/reactive-resume/pull/3158), [#3331](https://github.com/amruthpillai/reactive-resume/pull/3331)

### [#3272](https://github.com/amruthpillai/reactive-resume/issues/3272) — [Bug] No Cover Letter header in Firefox and Chromium on Linux Mint

**Assessment:** `product_decision`. **Confidence:** high. **State:** Closed by product decision (not planned).

**Evidence:**

- CoverLetterSection in packages/pdf/src/templates/shared/sections.tsx:1441 hardcodes showHeading=false. semantic/tree.ts:431-434 intentionally omits cover-letter heading.
- Cover-letter export removes resume chrome (8570c1c70); identical behavior across platforms, not Firefox/Linux rendering failure.
- Verified current CoverLetterSection omits the heading while retaining recipient and content. Closed as not planned with the user-approved explanation: https://github.com/amruthpillai/reactive-resume/issues/3272#issuecomment-5552512328.

**Action plan:**

- Closed by product decision: cover-letter section headings remain intentionally omitted across browsers.

**Product/scope note:** User approved retaining omitted cover-letter section headings; explained intentional cross-browser behavior and closed as not planned.

### [#3265](https://github.com/amruthpillai/reactive-resume/issues/3265) — [Bug] The sections do not appear in the design

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Builder layout visibility has dedicated filterVisibleLayoutSectionIds; PDF filtering.ts:120-132 hides empty/hidden sections. Report lacks affected sections and reproducible resume.
- 2026-08-16 maintainer requested concrete missing sections/version/steps; unanswered.

**Action plan:**

- Reproduce screenshot with source JSON; distinguish empty/hidden section filtering from missing drag targets and source layout corruption.

### [#3255](https://github.com/amruthpillai/reactive-resume/issues/3255) — [Feature] Add a "Cover Letters" section for managing and exporting generated cover letters

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Application detail supports cover-letter attachment; AI generator state and resume custom cover-letter sections are different surfaces. PR #3395 adds generated PDF attachment; docs already support separate cover-letter exports from builder.

**Action plan:**

- Review unmerged PR #3423: shared library/builder editor stores independent owned documents, copies selected resume styling and supports explicit styling refresh. Application attachments remain exported snapshots. Ownership, deletion, concurrent editing and export regressions verified.

**Implementation:** [PR #3423](https://github.com/amruthpillai/reactive-resume/pull/3423). Approved shared library with copied resume styling, explicit refresh, retained conflict drafts, JSON/PDF export and application snapshots. Three production browser scenarios, 325 API tests, 598 web tests and combined migrations verified; browser CI and autofix pass. Codacy applies a SQL Server-only rule to the PostgreSQL migration.

**Product/scope note:** Approved and implemented in #3423: independently saved cover-letter library with copied resume styling and explicit refresh. Library and builder edit the shared document; applications attach exported snapshots.

**Related PRs:** [#3395](https://github.com/amruthpillai/reactive-resume/pull/3395), [#3423](https://github.com/amruthpillai/reactive-resume/pull/3423)

### [#3251](https://github.com/amruthpillai/reactive-resume/issues/3251) — [Bug] <title>Missing hover state styling on the builder download button

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- packages/ui/src/components/button.tsx:11 default variant restricts hover class to [a]:hover:bg-primary/80. Builder header.tsx:112-132 renders native default Button, so that hover selector cannot match.
- PR #3405 was merged by the repository owner and closed the issue on 2026-09-05 after compiled Tailwind hover behavior was verified.

**Action plan:**

- Issue closed; relevant merged PRs: #3405. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3405](https://github.com/amruthpillai/reactive-resume/pull/3405). Primary button hover applies to native buttons and links. Compiled Tailwind behavior verified.

**Related PRs:** [#3405](https://github.com/amruthpillai/reactive-resume/pull/3405)

### [#3249](https://github.com/amruthpillai/reactive-resume/issues/3249) — [Bug] multiple fonts are improperly aligned vertically

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Font-specific reports reproduced by multiple commenters on 5.2.3; fonts include Roboto/Roboto Condensed/IBM Plex Sans Condensed and many templates.
- Shared templates align icon/text center; use-register-fonts.ts registers font files; external textkit metric patch and source font metrics require inspection. No actual current font-matrix PDF comparison yet.
- Exact attachment rendered: /tmp/fixture-3249.pdf and PNG; Roboto Condensed profile icon visibly sits below github label. Font baseline problem still reproduced visually; root cause not yet isolated.
- Current main 00a1357de exact July14 Roboto Condensed fixture reproduces high baseline; July19 attachment ALSO Roboto Condensed and contains authored margin workaround rules. Controlled IBM Plex Sans Condensed variant reproduces same metric cause.
- patches/@react-pdf__textkit.patch introduced unconditional OS/2 typo metrics in dd7623f11 (#3070). Roboto/Roboto Condensed fsSelection.useTypoMetrics=false hhea1900→typo1536/2048; IBM Plex Sans Condensed false1025→780/1000. Actual PDF baseline RED3 cases; corrected flag-aware selection restores 1.7773pt/2.45pt at10pt.
- Draft worktree .worktrees/issue-3249-font-alignment retains explicit Noto Sans/Serif SC/TC/JP/KR and Source Han CJK metric exception plus intrinsic-height safeguard. Actual PDF15 tests pass including all8 configured Noto CJK fallback families at tight lineheight.
- Exact fixture remains1page. IBM Sans, Roboto Flex, Geist, and Ropa Sans controlled fixtures have byte-identical raster PNGs before/after. Ropa Sans historical claim not explained by this cause (hhea equals typo); do not claim universal font alignment resolved. See /tmp/3249-font-metrics.json and /tmp/current-fixture-3249-1.png vs /tmp/fixed-fixture-3249-1.png.
- Published PR #3430 commit af3bb7faf; all 698 PDF tests across 58 files passed in 19.57 s, as did the final 15 targeted tests in 20.19 s, PDF typecheck, boundaries, pnpm check, frozen offline install, and web (11.58 s) and server production builds.
- PR #3430 review follow-up 50bac62: actual selectable Noto Sans HK revealed missing exception (baseline23.2 vs18pt). Narrow HK regex addition restores18pt baseline and21.6pt line spacing; all16font PDF tests and699PDF tests pass, types/Biome/boundaries/frozenofflineinstall pass. fsSelection integer suggestion disproved by fontkit2.0.4 OS2 Bitfield decoder and actual font objects.

**Action plan:**

- PR #3430 was merged by the repository owner on 2026-09-05; retain Ropa Sans limitation and keep the issue open until that separate historical report is reproduced.

**Implementation:** [PR #3430](https://github.com/amruthpillai/reactive-resume/pull/3430). Head `50bac62ed`: font metrics respect USE_TYPO_METRICS while preserving CJK fallbacks, including the selectable Noto Sans HK review correction. 699 PDF tests and 16 actual-font cases pass. Exact Roboto Condensed and controlled IBM fixtures improve; current Ropa Sans remains unchanged and historical optical alignment scope stays separate.

**Related PRs:** [#3430](https://github.com/amruthpillai/reactive-resume/pull/3430)

### [#3247](https://github.com/amruthpillai/reactive-resume/issues/3247) — [Feature] More viewing options on the résumé page.

**Assessment:** `feature`. **Confidence:** medium. **State:** Closed with evidence.

**Evidence:**

- dashboard/resumes/index.tsx:31-40 offers grid/list URL search only, default grid; no compact option or persistent preference.
- PR #3425 was merged by the repository owner and closed the issue on 2026-09-05. Five hook tests plus production navigation, reload, URL precedence, and mobile sizing were verified.

**Action plan:**

- Issue closed; relevant merged PRs: #3425. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3425](https://github.com/amruthpillai/reactive-resume/pull/3425). Adds compact thumbnails and per-account tab-session Grid/Compact/List preference. Five hook tests plus production browser navigation, reload, explicit URL override and mobile sizing pass.

**Product/scope note:** Requires small layout choice; existing thumbnail quality issue #3246 stays separate.

**Related PRs:** [#3425](https://github.com/amruthpillai/reactive-resume/pull/3425)

### [#3246](https://github.com/amruthpillai/reactive-resume/issues/3246) — [Bug] The thumbnails are appearing in low quality.

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- resume-thumbnail.shared.ts:6 target width 420 and devicePixelRatio cap 2; pdf-thumbnail.ts:29-46 computes render size; no source JSON/version/DPR in report.
- Current thumbnail rendering tests cover scaling; no comparison with reported screenshot/browser scale.

**Action plan:**

- Measure displayed card width/DPR versus PNG pixel dimensions on reported deployment; reproduce cache and newly generated thumbnail; increase resolution only if actual under-resolution confirmed.

### [#3200](https://github.com/amruthpillai/reactive-resume/issues/3200) — [Feature] Removing Titles or Headlines - e.g. "Summary" / "Experience"

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Current Semantic CSS supports section[type="summary"] > section-heading { display: none; }. Blank custom titles still intentionally restore the default name.
- Actual PDF reproduction across all 15 templates removes Summary/Experience headings while retaining their content; normal stylesheet control retains the Experience heading. Tests inspect exported PDF text, not only renderer props.
- Issue answered with builder path, activation instructions, targeted/all-heading examples and current docs; closed September 5.

**Action plan:**

- Request is satisfied through current in-builder Semantic CSS for PDF preview/export; no additional implementation needed.

**Related PRs:** [#3274](https://github.com/amruthpillai/reactive-resume/pull/3274)

### [#3196](https://github.com/amruthpillai/reactive-resume/issues/3196) — [Bug] The table have not rows and columms

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- No attachment JSON/version or exact table markup. Maintainer already requested sample on 2026-08-16. rich-input.tsx:64-90 has no table extension; PDF rich text delegates HTML renderer.
- Original screenshot inspected directly: table text is visible in three columns but grid lines are absent. Exact HTML/JSON is still missing, so a content-loss reproduction is not evidence that its border problem is fixed.
- Separate regression found and fixed in PR #3438, head 165535b5f: rich-text fields containing bare table cells or raw text in unknown wrappers lacked a semantic host and disappeared in Semantic CSS mode. Three actual-PDF cases failed before the fix; all seven regression cases pass afterward. All 690 PDF tests across 58 files, typecheck, boundaries, formatting and production builds pass.
- Production Chromium JSON import, unrelated edit, save/reload and PDF export fails before the fix and passes afterward in 11.9 s; table cell coordinates and browser preview verified. Artifacts: /tmp/rr-3196-imported-table.pdf and /tmp/rr-3196-imported-table.png.
- Issue follow-up https://github.com/amruthpillai/reactive-resume/issues/3196#issuecomment-5552909919 links merged PR #3438 as a separate regression and requests the exact JSON/HTML, inline table styles, version, and template needed to diagnose the still-open border report.

**Action plan:**

- PR #3438 is owner-merged as a separate imported-content regression. Keep #3196 open for its original missing-border behavior; obtain original JSON/HTML, including inline styles and table attributes, and distinguish renderer border handling from editor normalization. The custom heading concern is covered by verified Semantic CSS guidance from #3200.

**Implementation:** [PR #3438](https://github.com/amruthpillai/reactive-resume/pull/3438). Head `165535b5f`: preserves imported rich text without individually addressable semantic descendants. Seven actual-PDF regressions, all 690 PDF tests and a production import/save/reload/export reproduction pass. Original missing-border report remains open; this is a separate regression discovered during its investigation.

**Related PRs:** [#3438](https://github.com/amruthpillai/reactive-resume/pull/3438)

### [#3181](https://github.com/amruthpillai/reactive-resume/issues/3181) — [Bug] Move resumes from v4 to v5 again

**Assessment:** `product_decision`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Report explicitly requests rerunning hosted v4-to-v5 migration after v4 outage, not a local importer defect.
- ac9813909 docs pins historical v4 migration script checkout; #3133 closed into #2760 but no evidence original hosted accounts restored.

**Action plan:**

- Ask maintainer operational policy for v4 retention/recovery; inspect available backups/account mapping privately with authorization; never rerun data migration blindly.

### [#3180](https://github.com/amruthpillai/reactive-resume/issues/3180) — [Bug] Blank page with empty section remains

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- apps/web/src/libs/resume/move-item.ts:137-145 removes custom-section item but retains empty section and page. ResumeDocument document.tsx:89 maps every authored page even if sections filtered empty.
- PR #3188 attempted exact cleanup but is CLOSED with mergedAt=null; no maintainer reason recorded in comments.
- Exact two-company move-to-new-page then move-back workflow reproduced via extracted existing UI sequence: regression retained empty custom section/page. Dedicated worktree .worktrees/issue-3180-empty-move-page adds atomic validated moveItem and cleanup only touched custom source. New tests verify JSON round-trip, affected-page pruning, unrelated blank/first page preservation, hidden item retention, destination indices, invalid targets, and Immer inverse-patch undo. Full web suite111 files605 tests and typecheck pass.

**Action plan:**

- Issue closed; relevant merged PRs: #3417. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3417](https://github.com/amruthpillai/reactive-resume/pull/3417). Moving items validates destinations and prunes only emptied custom source sections and affected empty pages; exact round-trip JSON, undo, 605 web tests and typecheck verified.

**Related PRs:** [#3188](https://github.com/amruthpillai/reactive-resume/pull/3188), [#3417](https://github.com/amruthpillai/reactive-resume/pull/3417)

### [#3175](https://github.com/amruthpillai/reactive-resume/issues/3175) — [Bug] Long section overflow onto next page does not respect page top margin

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Report specifically Ditto long section missing top margin; #3337 names different two-column templates. Do not collapse templates without comparison.
- Nested-region padding/physical-page wrapping is shared risk; PDF pagination tests currently prove authored page CSS stability, not per-template content margins.
- Actual PDF geometry reproduction at main e549d114e: 60-paragraph experience, vertical margin48, two-column page. Ditgar/Chikorita/Glalie/Leafish second physical page text top=-1pt, first-page bottom14-25pt; Ditto second-page top2pt and first-page bottom11pt. Pikachu/Onyx controls respect top47-50pt and bottom>66pt. /tmp/audit-3337-margins.json and /tmp/margins-{template}.pdf. Separate exact template reports preserved; shared symptom positively reproduced.
- Fix in .worktrees/issue-3337-page-margins: physical Page padding on Ditgar/Chikorita/Glalie/Leafish/Ditto; first-page offset retained, sidebar margin paint preserves baseline colors. Actual-PDF regression red10/14 -> green28 cases (semantic, legacy, both columns, RTL; all60 paragraphs retained; raster corner colors and first-header position guarded). PDF typecheck + Biome pass. Current fixture geometry /tmp/audit-3337-margins-fixed.json; baseline /tmp/audit-3337-margins.json.
- Additional explicit-headerless/fullWidth PDF regression: Ditto initially started content at 96.5pt for marginY48 (2 failures, other 12 cases passed); conditional header gap fixes to requested margin. Final page-margins.test.tsx 42 tests pass, PDF typecheck passes. Earlier full PDF suite58files711tests passed before this bounded headerless correction.

**Action plan:**

- Generate actual Ditto overflowing section and verify physical page top/bottom bounds; use margin matrix with #3337; fix common shell if same cause.

**Implementation:** [PR #3422](https://github.com/amruthpillai/reactive-resume/pull/3422). Shared continuation-margin fix covers five affected templates, explicit headerless pages and full-width pages.

**Related PRs:** [#3422](https://github.com/amruthpillai/reactive-resume/pull/3422)

### [#3174](https://github.com/amruthpillai/reactive-resume/issues/3174) — [Bug] Inputting a large line height causes custom rules deletion

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Legacy numeric custom-style inputs clamp line height to 0.5–4 in merged PR #3262 / commit 2a0782517c55266ea20d7ac749821f3a7a90896d.
- Current Semantic CSS production browser probe passed in 7.0 s: line-height: 5 and an unrelated rule persist through save/reload; invalid line-height shows an explicit diagnostic and preserves authored source. Artifact /tmp/issue-3174-browser-evidence.json; report /tmp/reactive-resume-review-3174.md.
- Legacy JSON filtering remains unchanged; PR #3413 does not reject legacy style-rule bounds. Its explicit write regression passed.
- Closed as completed on 2026-09-05 at 14:21:57 UTC with a verified scoped comment: https://github.com/amruthpillai/reactive-resume/issues/3174#issuecomment-5552437914.

**Action plan:**

- Completed: posted scoped verified closure; current editor behavior resolved, legacy JSON compatibility accurately disclosed.

**Related PRs:** [#3241](https://github.com/amruthpillai/reactive-resume/pull/3241), [#3262](https://github.com/amruthpillai/reactive-resume/pull/3262), [#3274](https://github.com/amruthpillai/reactive-resume/pull/3274)

### [#3168](https://github.com/amruthpillai/reactive-resume/issues/3168) — [Bug] Main picture disappeared from all my CVs + Headline section is glitched

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Full thread distinguishes original missing-picture/headline complaint from intermittent image missing only public/private reload; supplied 800x800 JPEG and JSON.
- preview.browser.tsx creates client PDF; public PDF path generates independently. Reupload sometimes succeeds but commenters report cache/private-session recurrence.
- Exact attached JSON rendered successfully in one Node export on current main: /tmp/fixture-3168.pdf contains 1 image operator. This does not test intermittent authenticated/public browser caching and cannot justify closure.

**Action plan:**

- Separate picture load/cache behavior from headline layout; reproduce supplied JPEG in authenticated/public private windows with cache disabled and inspect upload fetch status; preserve both symptoms.

### [#3166](https://github.com/amruthpillai/reactive-resume/issues/3166) — [Bug] Resume blocked

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue/comments provide no current reproducible failure with exact version/request/error; 2026-08-16 maintainer requested missing diagnostics.
- packages/auth/src/config.ts:191-220 implements email sign-in/reset; :255-274 social providers; presence of handlers does not establish cloud account/delivery health.

**Action plan:**

- Capture auth method, current timestamp, sanitized response/redirect, browser and whether account migrated; separate SMTP delivery from login; inspect relevant deployment logs. Do not close merely because stale or another commenter recovered.

### [#3164](https://github.com/amruthpillai/reactive-resume/issues/3164) — [Bug] <title>not able to log in or opt for forgot password

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue/comments provide no current reproducible failure with exact version/request/error; 2026-08-16 maintainer requested missing diagnostics.
- packages/auth/src/config.ts:191-220 implements email sign-in/reset; :255-274 social providers; presence of handlers does not establish cloud account/delivery health.

**Action plan:**

- Capture auth method, current timestamp, sanitized response/redirect, browser and whether account migrated; separate SMTP delivery from login; inspect relevant deployment logs. Do not close merely because stale or another commenter recovered.

### [#3159](https://github.com/amruthpillai/reactive-resume/issues/3159) — [Bug] <title>

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- No sample text, template, font, screenshot, or console output. Maintainer requested these on 2026-08-16 without response.
- Current use-register-fonts.ts supports script fallbacks; no evidence tying generic garbling to closed #3157.

**Action plan:**

- Request exact glyph/sample and sanitized JSON; inspect encoding versus unsupported font versus layout; avoid speculative duplicate closure.

### [#3155](https://github.com/amruthpillai/reactive-resume/issues/3155) — [Feature] Option to use date aligned to the left, rather than the right.

**Assessment:** `product_decision`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- sections.tsx:877 and :1043 aligns period field to end. Feature comments request differing two-column date ranges or simply date-first order; semantic item-header controls shipped #3345/#3357 but no universal date-side setting.

**Action plan:**

- Choose simple date-first row versus dedicated date column, width and line wrapping. Implement template-aware setting and verify long/localized ranges.

**Related PRs:** [#3345](https://github.com/amruthpillai/reactive-resume/pull/3345), [#3357](https://github.com/amruthpillai/reactive-resume/pull/3357)

### [#3153](https://github.com/amruthpillai/reactive-resume/issues/3153) — [Bug] <title>

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Same main DCR path as #3392: auth config enables unauthenticated DCR while schema/auth.ts:250-292 omits clientDiscoveryId that installed plugin registration writes.
- Cloud exact HTTP response/server log unavailable; do not conflate possible redirect allowlist failure with missing-schema failure.
- Fresh review of original report finds no underlying registration HTTP status or response body. Corrected classification to needs_reproduction; rejection cause remains unknown.

**Action plan:**

- Obtain registration HTTP status/error and requested redirect URI or hosted server logs. Do not infer schema failure or redirect-policy rejection from the generic Claude message; #3421 is related, not proven resolution. https://github.com/amruthpillai/reactive-resume/issues/3153#issuecomment-5553215519

### [#3152](https://github.com/amruthpillai/reactive-resume/issues/3152) — [Bug] Enabling REDIS_URL and ENCRYPTION_SECRET pointing to adjacent fresh Redis server throws "relation "ai_providers" does not exist" errors, v5.1.4, self-hosted

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Original PostgreSQL 42P01 ai_providers on v5.1.4 is concrete schema absence.
- Current migration 20260513181752_bent_human_cannonball/migration.sql:64 creates ai_providers; Dockerfile:66 packages migrations; startup/checks.ts:27-40 runs them and aborts startup on failure.
- Independent disposable PostgreSQL 17 reproduction (2026-09-05): exact v5.1.4 migrations with its Drizzle 1.0.0-rc.2 create all 17 ai_providers columns on a fresh database and on an upgrade from the immediately preceding migration. The issue SELECT succeeds.
- Upgrade of that v5.1.4 database through e549d114e migrations with installed Drizzle 1.0.0-rc.4, repeat migration, and fresh main database all pass. Six migration checkpoints recorded in /tmp/issue-3152-reproduction/results.json.
- v5.1.4 already registers plugins/1.migrate.ts in apps/web/vite.config.ts:71 and Dockerfile copies /app/migrations. Therefore clean migration success is not evidence of a later fix or of the reporter deployment root cause.

**Action plan:**

- Keep open as needs_reproduction. Obtain original image digest, startup migration logs, database/schema search_path and redacted migration ledger from affected deployment. Exact v5.1.4/current migration fixtures pass, so do not add duplicate table migration or close as already fixed.

### [#3147](https://github.com/amruthpillai/reactive-resume/issues/3147) — [Bug] keyword text clipping into primary text for sidebar sections

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Chikorita shared SkillsSection now gives skill-name flex:1 at sections.tsx:1163 from e34e7be6e / #3253, but issue specifically keyword text clipping into primary text in sidebar.
- #3253 addressed skill-name horizontal overflow; not positive evidence for keyword overlap across multiple section types.
- Fresh current-main screenshot-text reconstruction in Chikorita/IBM Plex Serif: eight renders across legacy/semantic, lineHeight 0.8/1/1.5, plus 25% sidebar and wrapped titles/keywords, remain unclipped. Artifacts /tmp/rr-remaining-evidence/3147-* and narrow-results.json. Original JSON/settings still required; no closure justified.

**Action plan:**

- Posted current-main reconstruction evidence and requested original sanitized JSON/font/sidebar/styles. Keep open until exact vertical clipping fixture is compared. https://github.com/amruthpillai/reactive-resume/issues/3147#issuecomment-5553205204

**Related PRs:** [#3253](https://github.com/amruthpillai/reactive-resume/pull/3253)

### [#3146](https://github.com/amruthpillai/reactive-resume/issues/3146) — [Bug] Section Item Primary Text bolding not working correctly

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Actual PDF reproduction on Chikorita: restoring only the pre-#3335 template bold rule makes the company Times-Roman while location/position/period use Times-Bold. Current main uses Times-Bold for all four and regular description.
- Twelve actual-PDF cases pass across Times-Roman, IBM Plex Serif and Open Sans, stored weights 400 or 400/600, legacy Custom Styles and Semantic CSS. Original reporter JSON was not provided; tests reconstruct the stated behavior.
- Existing #3335 merged August 27; issue closed September 5 with evidence and request to reopen with exact data if a remaining configuration fails.

**Action plan:**

- Issue closed; relevant merged PRs: #3335. No further implementation planned for this report. See evidence for the contribution of each fix.

**Product/scope note:** Closed as resolved by merged #3335.

**Related PRs:** [#3335](https://github.com/amruthpillai/reactive-resume/pull/3335)

### [#3137](https://github.com/amruthpillai/reactive-resume/issues/3137) — [Feature] Custom Styles does not allow for modification of the Basics section

**Assessment:** `feature`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Semantic CSS now exposes header, name, headline, contact nodes and page/region styling (docs/applying-custom-styles.mdx:74-97), introduced #3274. Guide :337 explicitly excludes gradients, so original full branding expectation only partly addressed.
- Posted current Semantic CSS header/contact/page selector guidance and requested exact remaining template/CSS layout; gradients remain unsupported. https://github.com/amruthpillai/reactive-resume/issues/3137#issuecomment-5553162766.

**Action plan:**

- Explain supported Semantic CSS header selectors; ask which missing concrete layout remains. Treat gradient support separately as product/rendering decision; do not close full request solely on header support.

**Related PRs:** [#3274](https://github.com/amruthpillai/reactive-resume/pull/3274)

### [#3093](https://github.com/amruthpillai/reactive-resume/issues/3093) — [Bug] <title>The noto serif SC font is displaying spaces incorrectly.

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Font-specific Noto Serif SC spacing reported; use-register-fonts.ts:223-234 has CJK-specific handling for word==space and per-character breaks.
- Maintainer requested text/locale/font/template and PDF on 2026-08-16; screenshot comment lacks source.

**Action plan:**

- Render exact mixed Chinese/Latin spaces with Noto Serif SC, compare callback output and extracted glyph positions; verify repeated and leading/trailing spaces without changing Arabic behavior.

### [#3090](https://github.com/amruthpillai/reactive-resume/issues/3090) — [Bug] Automatic extension to new page does not create a new page

**Assessment:** `product_decision`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- ResumeDocument document.tsx:89 maps authored metadata.layout.pages; renderer may wrap those into more physical pages. semantic/pagination.test.tsx explicitly keeps authored page selectors stable across physical pages.
- Reporter acknowledges #3048 expected behavior but asks clearer UI and independent sidebar behavior for overflow pages.

**Action plan:**

- Decide overflow-page UI explanation and whether per-physical-page sidebar control is supported; preserve authored-page CSS identity; do not close as fixed or exact duplicate of dismissed UX request.

### [#3089](https://github.com/amruthpillai/reactive-resume/issues/3089) — [Bug] CV preview rendering regression after v5.1.0: widened spacing and clipped words

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Reporter narrowed to Times-Roman; use-register-fonts.ts:247-248 skips registered webfont path for standard PDF fonts.
- safeTextStyle overflow changed in #3186 but report also covers widened spacing; current standard-font metrics remain distinct from OS/2 textkit patch.

**Action plan:**

- Render reporter text in Times-Roman versus registered metric-compatible font; compare text clipping and advance widths, not text extraction alone; decide TNR alias request separately.

**Related PRs:** [#3186](https://github.com/amruthpillai/reactive-resume/pull/3186)

### [#3088](https://github.com/amruthpillai/reactive-resume/issues/3088) — Photo / Bold / Spacing

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Bundled symptoms: Gengar missing photo, unbold text, language spacing; underline request separate. True bold face now fixed e065a1082/#3335 and hideLinkUnderline UI exists page.tsx:74.
- Neither change proves photo or language spacing resolved; maintainer explicitly requested separated reproduction.

**Action plan:**

- Isolate remaining photo and language-spacing defects using sanitized JSON; verify bold font family/weight and underline toggle on current main; retain unresolved parts.

**Related PRs:** [#3335](https://github.com/amruthpillai/reactive-resume/pull/3335)

### [#3078](https://github.com/amruthpillai/reactive-resume/issues/3078) — [Bug] <title>login issue

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue/comments provide no current reproducible failure with exact version/request/error; 2026-08-16 maintainer requested missing diagnostics.
- packages/auth/src/config.ts:191-220 implements email sign-in/reset; :255-274 social providers; presence of handlers does not establish cloud account/delivery health.

**Action plan:**

- Capture auth method, current timestamp, sanitized response/redirect, browser and whether account migrated; separate SMTP delivery from login; inspect relevant deployment logs. Do not close merely because stale or another commenter recovered.

### [#3068](https://github.com/amruthpillai/reactive-resume/issues/3068) — [Bug] Text alignment issue in Ditgar template with two-column layout

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- DitgarPage.tsx:320-331 item headers now share accent border/padding rules applied to main placement; recent #3357 applied item-header uniformly.
- Original report Projects two-column title alignment has screenshot only; uniform binding fix not evidence of identical geometric issue solved.
- Current main 0207e5dfc reproduces 1.5pt title-to-description/link offset on all eight Projects items across legacy/semantic. DitgarPage.tsx border plus gap-dependent padding/margin explains exact offset. Real PDFs/raster, failing verify-3068.py and source fixtures: /tmp/rr-remaining-evidence/.

**Action plan:**

- Compensate the decorated project-header border using its actual width and intended padding; verify x alignment across spacing, 1/2 columns and both style modes, RTL where applicable, and retain header decoration. Implement in isolated branch codex/issue-3068-project-alignment.

**Related PRs:** [#3357](https://github.com/amruthpillai/reactive-resume/pull/3357)

### [#3060](https://github.com/amruthpillai/reactive-resume/issues/3060) — “Move To” Feature Repeats Category Headers Across Pages in v5.1.3

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Section title resolution has built-in fallbacks; custom moved category titles serve both editing and rendered semantics. Requested empty title must also suppress separator.
- Semantic CSS can hide section-heading, but blank-title UX is a separate request and existing heading fallback behavior cannot be called fixed.

**Action plan:**

- Decide explicit hide-heading flag versus blank-title semantics; preserve builder accessible labels; test moved custom Experience on Kakuna with separator absent.

### [#3051](https://github.com/amruthpillai/reactive-resume/issues/3051) — [Bug] export PDF data different for English and German

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Reporter explicitly says stopping/starting stack fixed discrepancy, could not reproduce, and authorizes closure.
- Current PDF Document title is exactly resumeData.basics.name and language is locale (packages/pdf/src/document.tsx:83-87), independent of route browser title and identical code path across EN/DE.

**Action plan:**

- Close resolved report; localized Resume/Lebenslauf suffix is separate feature if desired.

**Related PRs:** [#2863](https://github.com/amruthpillai/reactive-resume/pull/2863)

### [#3046](https://github.com/amruthpillai/reactive-resume/issues/3046) — [Bug] <title>unable to connect using google or GitHub

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue/comments provide no current reproducible failure with exact version/request/error; 2026-08-16 maintainer requested missing diagnostics.
- packages/auth/src/config.ts:191-220 implements email sign-in/reset; :255-274 social providers; presence of handlers does not establish cloud account/delivery health.

**Action plan:**

- Capture auth method, current timestamp, sanitized response/redirect, browser and whether account migrated; separate SMTP delivery from login; inspect relevant deployment logs. Do not close merely because stale or another commenter recovered.

### [#3040](https://github.com/amruthpillai/reactive-resume/issues/3040) — [Bug] skill icon section does not overflow correctly

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Three distinct defects in full thread: level decorations vertical clipping, skill-name horizontal clipping, skill text/level splitting across pages.
- Second explicitly confirmed fixed in 5.2.4 by reporter and e34e7be6e / #3253 (sections.tsx:1163 flex:1). First/third remain with CSS workaround; #3350 asks granular keep-together.
- Exact attachment rendered: /tmp/fixture-3040.pdf has two pages, second page only 2 text items; inspect decoration/content split in raster before closure.
- Current exact attachment Onyx/IBM Plex Serif rendered at1.5x: /tmp/current-fixture-3040.pdf has2pages,164+2text items. First page contains65sets of level circles and all66item icons; final5circles plus2text lines onpage2. Current raster inspected: no missing/clipped circle row demonstrated. 397red connected components match1separator+66icons+330circles.
- Same exact fixture with PR#3422 page margins produces identical red component geometry onboth pages (/tmp/3040-red-components.json); no margin fix duplication justified.
- Maintainer May29 issuecomment4572637160 explicitly treated skill/name page placement as author spacing control; reporter accepted. Automatic item keep-together is product choice covered by#3350, not an unapproved renderer fix.
- Partial fix PR #3434: the latest comment requested circle gaps; the compiler rejected level column-gap with PROPERTY_NOT_APPLICABLE. Added only gap/row-gap/column-gap applicability. Seven actual-PDF red/green regressions, 690 PDF and 1,349 resume tests, types/check/boundaries pass. Exact attachment with a 4pt gap moves circle x positions to 21/39/57/75/93 from 21/35/49/63/77 at 1.5x. Guide example added. Original vertical-clipping/pagination distinctions remain open.

**Action plan:**

- Keep issue open: remaining original vertical-clipping report lacks current reproduction despite exact attached JSON and controlled Rhyhorn/Scizor variants. Ask for updated minimal fixture/screenshots only if further investigation cannot isolate original geometry.
- Second horizontal defect alreadyfixed via#3253/reporterconfirmation; preserve this distinction in any issue update.
- Do not silently add wrap=false toskills: existing maintainerdecision leaves pagination author-controlled; track optional keep-together under#3350.

**Implementation:** [PR #3434](https://github.com/amruthpillai/reactive-resume/pull/3434). Head `2e29a4412`: permits Semantic CSS gap, row-gap and column-gap on level indicators. Seven actual-PDF raster regressions, 690 PDF tests and 1,349 resume-domain tests pass. Original vertical clipping and automatic pagination scope remain unproven; PR relates without closing #3040.

**Related PRs:** [#3253](https://github.com/amruthpillai/reactive-resume/pull/3253), [#3422](https://github.com/amruthpillai/reactive-resume/pull/3422), [#3434](https://github.com/amruthpillai/reactive-resume/pull/3434)

### [#3033](https://github.com/amruthpillai/reactive-resume/issues/3033) — [Bug] White pages on existing CVs

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Full comments include two distinct causes: PDF.js getOrInsertComputed unsupported and font-dependent blank PDF fixed by changing weight/PT Sans.
- Current pdf-canvas and pdf-thumbnail use pdfjs-dist/legacy entrypoints with dedicated pdfjs-legacy-entrypoints.test.ts coverage; this only addresses compatibility subtype.

**Action plan:**

- Verify exact older-browser failure no longer occurs with legacy entrypoints; separately render preserved PT Sans/weight data and inspect font errors before closing original report.

### [#3017](https://github.com/amruthpillai/reactive-resume/issues/3017) — [Bug] <title>Line width and Shadow width not working

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Picture style base-template-styles.ts:141-144 forwards borderColor/borderWidth and shadowColor/shadowWidth. SemanticHeaderPicture primitives.tsx:454 passes directly to React PDF Image.
- Installed @react-pdf render/stylesheet/types sources contain no shadowWidth/shadowColor implementation; shadow is unsupported passthrough. Border width has normal support and requires separate exact reproduction.
- Actual PDF regression on latest origin/main00a1357de: opaque100pt picture borderWidth10 has zero border pixels in Onyx/Ditto/Glalie; @react-pdf/render4.7.0 renderNode draws border before bitmap, bitmap uses full box and covers border. Dedicated primitive border inset fixes 5 raster tests, preserves photo bounds and semantic/legacy border settings. FullPDF58files688tests pass, PDFtypecheck/Biome pass.
- Synthetic fixture /tmp/audit-3017.mts across14templates: shadowWidth10 produces identical raster SHA256 to shadowWidth0, despite host IMAGE correct shadowColor/shadowWidth. Renderer has no shadow or blur support. Shadow restoration requires chosen rendering treatment; no shadow code implemented.
- PR3427 commit a358d2682 restores both standard picture border and centered soft blur. Final59files700PDFtests, PDFtypecheck, pnpmcheck, boundaries, productionweb/serverbuilds pass; builtserverexportactualPDF7591bytes with8040border/7624shadowpixels. Chromium151/NodePNGbyteparity verified. Directserverfast-png dependency and knip exemption validated after productionchunk import first failed missingdependency. Percentage corner radii supported; custompercentage dimensions omit shadow pending layout-dependent geometry.
- PR #3427 review follow-up c315633: frame preserves numeric/percentage authored padding and border insets; derived geometry guard and bounded blur kernel. 708 full PDF tests, latest 25 targeted tests, types/check, production builds, compiled-server raster, and 3 browser/Node PNG determinism fixtures passed. Percentage picture width/height shadows remain omitted.

**Action plan:**

- Issue closed; relevant merged PRs: #3427. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3427](https://github.com/amruthpillai/reactive-resume/pull/3427). Head `c315633f6`: picture borders and soft shadows preserve authored padding and insets. 708 PDF tests across 59 files, 25 targeted cases, compiled-server raster checks, three Chromium/Node PNG parity fixtures and production builds pass. Percentage picture width/height shadows remain a documented limitation.

**Related PRs:** [#3427](https://github.com/amruthpillai/reactive-resume/pull/3427)

### [#3010](https://github.com/amruthpillai/reactive-resume/issues/3010) — [Bug] Jsearch/RapidAPI missing from versions newer than 5.0.20?

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- JSearch/RapidAPI absent from runtime apps/packages/env; only historical docs/changelog/index.mdx:936 records addition #2788.
- Report points to 6e447d1bc monorepo/release merge as disappearance; no documented rationale establishes intentional permanent removal.

**Action plan:**

- Ask whether removal intentional and whether restoration desired. If intentional, explain current Application Tracker/manual posting workflow and document removal; do not restore paid external integration without direction.

**Product/scope note:** Pending maintainer answer requested in this audit: keep JSearch/RapidAPI removed and explain the current manual workflow, or restore built-in job search. No restoration authorized yet.

**Related PRs:** [#2788](https://github.com/amruthpillai/reactive-resume/pull/2788)

### [#3008](https://github.com/amruthpillai/reactive-resume/issues/3008) — [Bug] Public resume page throws INTERNAL_SERVER_ERROR due to output validation failure when name is redacted

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- fabe22089d0a31282966f49a918294ec9afd2840 (#3012) relaxed public output schema; 1be75240dd92f2bbcc06eae6c90b1431c3ed1d41 (#3138) replaces redacted name with Resume.
- Current packages/api/src/features/resume/access-policy.ts:58 name: "Resume"; access-policy.test.ts:62 asserts value.
- Verification 2026-09-05 pnpm --filter @reactive-resume/api test -- src/features/resume/access-policy.test.ts: 38 files / 310 tests passed (script executed broader package suite).

**Action plan:**

- Close as already fixed, linking #3012 and #3138.

**Related PRs:** [#3012](https://github.com/amruthpillai/reactive-resume/pull/3012), [#3138](https://github.com/amruthpillai/reactive-resume/pull/3138)

### [#3007](https://github.com/amruthpillai/reactive-resume/issues/3007) — [Bug] <title>Center View doesn't show the layout of the resume

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Report says center view blank across templates; font switching failed; commenters show Firefox-vs-Chrome difference and independent missing ENCRYPTION_SECRET AI provider error.
- Current preview.browser.tsx:137 reports failed rendering but no evidence for original source data/browser.

**Action plan:**

- Reproduce minimal resume in reported Firefox/Zen; inspect PDF.js and font errors; test self-hosted missing optional AI config separately; do not infer one shared cause.

### [#2988](https://github.com/amruthpillai/reactive-resume/issues/2988) — [Bug] v5.1.0 react-pdf regressions: missing Phosphor icons, broken IBM Plex Serif fi/fl ligatures, missing template borders

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Four regressions: missing Phosphor icons, IBM Plex Serif fi/fl glyph loss, Lapras boxed borders, spacing. Icons now SVG via PhosphorIcon (primitives.tsx:315) so absence of icon font from PDF resources alone is no longer defect.
- Current smoke suite passes but does not prove original ligature pixels/border parity.
- Fresh current-main 0207e5dfc Lapras/IBM Plex Serif PDF and inspected raster preserve all nine reported fi/fl words, contact SVG icons and section borders: /tmp/rr-remaining-evidence/2988-lapras.{pdf,png,json}. Current square borders do not establish older rounded-box parity; original spacing remains unproven.

**Action plan:**

- Posted evidence and requested the sanitized v5.0.20/v5.1.0 PDFs offered by the reporter, plus matching JSON, to compare remaining border/spacing differences. Keep open. https://github.com/amruthpillai/reactive-resume/issues/2988#issuecomment-5553175062

### [#2921](https://github.com/amruthpillai/reactive-resume/issues/2921) — [Feature] Improve builder UI for hidden resume sections

**Assessment:** `feature`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- layout/pages.tsx:255-258 now filters hidden IDs. Left index.tsx:75 still renders every sidebar section; section-base.tsx:72 still only dims hidden section.

**Action plan:**

- Keep fixed layout portion; choose compact hidden-section group with restore action for built-in, summary and custom sections. Preserve original layout positions on unhide. Add visibility/restoration tests.

### [#2897](https://github.com/amruthpillai/reactive-resume/issues/2897) — [Bug] GitHub Third Party oauth failed to login

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Specific unable_to_create_user cloud redirect, but no server constraint/error or current version.
- Subsequent OAuth fixes 61b332494 (#2874) and 34c03b1f7 (#3256); current oauth-profile.ts:24-41 finds existing user by normalized email, :44-81 legacy GitHub lookup, :188-199 no forbidden id mapping under Better Auth 1.7.

**Action plan:**

- Capture current GitHub callback error and correlate account provider ID/email mapping; use existing OAuth mapper tests as regression base if collision reproduced; do not infer all creation failures fixed by historical change.

**Related PRs:** [#2874](https://github.com/amruthpillai/reactive-resume/pull/2874), [#3256](https://github.com/amruthpillai/reactive-resume/pull/3256)

### [#2878](https://github.com/amruthpillai/reactive-resume/issues/2878) — [Bug] Unable to import a previously exported json resume through either of the 3 JSON options

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Downloaded exact attached Reactive_Resume.json from issue. Current parseReactiveResumeV4JSON imports successfully; current and JSON Resume parsers correctly reject mismatched formats. Probe results /tmp/audit-builder-probe.jsonl. Current import tests: 29 passed across v4,current,error suites. #3296 adds auto-detect/readable errors.

**Action plan:**

- Issue closed; relevant merged PRs: #3296. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3296](https://github.com/amruthpillai/reactive-resume/pull/3296)

### [#2845](https://github.com/amruthpillai/reactive-resume/issues/2845) — [Feature] Export for import ready to successfactors and workday

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Current DOCX export exists via packages/docx/src/index.ts:12 and buildDocument; no Workday/SuccessFactors-specific contracts verified.

**Action plan:**

- Assess existing plain DOCX on representative ATS uploads. Avoid unsupported 95% parsing guarantee. Prefer generic plain export preset; only add vendor presets after reproducible requirements and evaluation files.

**Product/scope note:** Needs decision on vendor-specific claims/presets.

### [#2844](https://github.com/amruthpillai/reactive-resume/issues/2844) — [Feature] Improved accessibility

**Assessment:** `feature`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Public page has HTML h1 but resume is PDF.js viewer (public-resume.tsx:37,51; pdf-viewer.tsx). Requested hierarchical content accessibility is separate from UI labels #3369.

**Action plan:**

- Audit generated PDF tags/reading order and PDF.js text layer with screen reader. Define outputs and acceptance criteria for headings/lists/alt text before implementation. Preserve current output layout.

**Product/scope note:** Broad request remains valid; no closure based on generic accessibility labels.

### [#2841](https://github.com/amruthpillai/reactive-resume/issues/2841) — [Bug] Chikorita v5 Regression: Missing/Changed UI Features Compared to v4

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Chikorita v4/v5 appearance request includes Date/Location order, level size and underline toggle.
- Underline toggle implemented page.tsx:74; shared ExperienceSection:853-855 still places location first/date second with location. LevelDisplay uses design sizes and template/semantic styling.

**Action plan:**

- Confirm desired ordering and indicator-size defaults versus custom styles; explain implemented underline toggle without closing unresolved visual decisions.

### [#2837](https://github.com/amruthpillai/reactive-resume/issues/2837) — [Bug] Password recovery

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue/comments provide no current reproducible failure with exact version/request/error; 2026-08-16 maintainer requested missing diagnostics.
- packages/auth/src/config.ts:191-220 implements email sign-in/reset; :255-274 social providers; presence of handlers does not establish cloud account/delivery health.

**Action plan:**

- Capture auth method, current timestamp, sanitized response/redirect, browser and whether account migrated; separate SMTP delivery from login; inspect relevant deployment logs. Do not close merely because stale or another commenter recovered.

### [#2836](https://github.com/amruthpillai/reactive-resume/issues/2836) — [Feature] Old links usage --> notification

**Assessment:** `feature`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Current public route looks up username/slug and converts unhandled errors to notFound; no legacy-link notification path ($username/$slug.tsx:13-19,49-64). v4 migration docs describe separate v4 host.

**Action plan:**

- Decide if notifications or redirects are desired; determine legacy slug/account mapping availability and opt-in/rate limits. Add mapping-backed redirect or aggregated notification only if reliable ownership exists.

**Product/scope note:** Cannot attribute arbitrary missing URLs safely without mapping.

### [#2828](https://github.com/amruthpillai/reactive-resume/issues/2828) — [Bug] Two files reverted to an older version and recent changes were lost

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Two resumes reverted with no timestamp/actions/version; maintainer requested version-history evidence.
- Current apps/web/src/features/resume/builder/draft.ts:60-70 keeps pending/local/deferred state; server exposes version restore DTO, but no reproduction connects reported loss to specific path.

**Action plan:**

- Inspect affected version history and timestamps, reproduce two-tab edits/save failure/navigation, distinguish migration rollback from client overwrite.

### [#2812](https://github.com/amruthpillai/reactive-resume/issues/2812) — [Bug] Profiles used to render nicely in top right of header, but now they render below the header

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- OnyxPage.tsx:95-119 Header contains basics/contact items, not profiles section. Profiles render through regular page section ordering at :74-87.
- Request restores prior top-right profile layout; current behavior is structural template choice, not proven browser regression.

**Action plan:**

- Decide whether restore dedicated profile area or offer template variant; test long profile URLs/multiple accounts and first-page-only header.

### [#2805](https://github.com/amruthpillai/reactive-resume/issues/2805) — [Bug] "Not Found" error when setting custom AI Base URL (https://api.z.ai/api/coding/paas/v4)

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- Reported root cause explicitly established by reporter: OpenAI Responses endpoint used against Chat-only z.ai.
- Current packages/api/src/features/ai/service.ts:107 explicitly calls createOpenAI(...).chat(model), :121-123 uses OpenAI-compatible adapter; change present since release 50ba37a27 v5.1.0 (#2970).
- API suite passed 310 tests; no live z.ai credential test. PDF upload capabilities remain provider-dependent and separate from original connection-test 404.
- Actual current testConnection with real OpenAI/OpenAI-compatible adapters and captured HTTP responses passed four cases (trailing slash/no slash), requesting exactly https://api.z.ai/api/coding/paas/v4/chat/completions. Current Z.AI docs confirm this base URL uses Chat Completions. No live provider credentials used.

**Action plan:**

- Closed original connection routing mismatch with evidence. Keep PDF/file capability reports separate (#2723/#3334).

**Related PRs:** [#2970](https://github.com/amruthpillai/reactive-resume/pull/2970)

### [#2804](https://github.com/amruthpillai/reactive-resume/issues/2804) — [Bug] Link sharing non-english resume results in english titles

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- PDF title resolution now reads data.metadata.page.locale (packages/pdf/src/section-title.ts:54). Browser PDF creation builds locale-specific resolver (apps/web/src/features/resume/export/pdf-document.tsx:33-39). Public viewer has distinct resolvePublicResumePdfBlob path (pdf-viewer.tsx:92), not verified live.
- Production Chromium reproduction on 2026-09-05: anonymous Spanish viewer and browser PDF include Experiencia/Resumen; direct server PDF fallback with identical data omits default section headings because no locale resolver is provided. Actual PDF text captured in /tmp/rr-2804-actual.json.

**Action plan:**

- Issue closed; relevant merged PRs: #3428. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3428](https://github.com/amruthpillai/reactive-resume/pull/3428). Server PDFs lacked default section headings despite correct browser rendering. Generated locale subset restores saved resume language; 689 PDF tests, API tests and production normal/fallback browser paths pass.

**Related PRs:** [#3428](https://github.com/amruthpillai/reactive-resume/pull/3428)

### [#2794](https://github.com/amruthpillai/reactive-resume/issues/2794) — [Bug] Off-center cropping/padding in resume square picture

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Original specifically square 600x600 PNG looks cropped only in live preview; exported PDF unaffected. Current preview displays generated PDF via createResumePdfBlob.
- Picture style uses objectFit cover and explicit border/shadow fields; shared pipeline change alone is not exact reproduction evidence.

**Action plan:**

- Recheck exact square PNG at browser zoom/DPR and shadow values; compare pixel bounds between PDF and canvas; do not merge with non-square photo fitting #2782.

### [#2785](https://github.com/amruthpillai/reactive-resume/issues/2785) — [Feature] <title> allow line breaks in skills keywords

**Assessment:** `feature`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- packages/pdf/src/templates/shared/sections.tsx:1171 joins skill keywords with comma+space. PR #3358 adds inline SKILL ITEM layout, not per-keyword list, so not a duplicate or existing implementation.

**Action plan:**

- Add independent keyword presentation setting (inline/list) to skills schema and UI; render bullet/list with columns and long wrapping tests across templates; preserve default.

**Related PRs:** [#3358](https://github.com/amruthpillai/reactive-resume/pull/3358)

### [#2782](https://github.com/amruthpillai/reactive-resume/issues/2782) — [Bug] Picture is cropped when inserted and could find a way to resize it accordingly

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Reporter photo 2592x1944 Gengar close-up; desired uncrop/zoom control. Current picture.tsx imports react-easy-crop and :522 opens crop step, :569 tells users drag/reposition/zoom.
- Shared picture objectFit remains cover (base-template-styles.ts:138); new crop UI may help but cannot recreate content already cropped to square.

**Action plan:**

- Reproduce portrait with chosen aspectRatio and crop dialog; verify uncropped source retention and ability to match original ratio; decide contain fit/padding if preserving full non-square image required.

### [#2778](https://github.com/amruthpillai/reactive-resume/issues/2778) — [Bug] Pictures in export not exists

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Original v5 browserless/S3 export pipeline and later comment isolate hardcoded localhost fetch encoding HTML as JPEG. Current document.tsx uses React PDF and picture URL source; obsolete getByIdForPrinter code no longer current renderer.
- Migration of rendering pipeline removes old code path but does not prove same self-hosted S3/private upload picture renders under current network/auth conditions.

**Action plan:**

- Test current self-hosted S3 or nginx split storage with real upload, public/export requests, non-2xx and content-type handling; retain missing image report pending positive current reproduction result.

### [#2768](https://github.com/amruthpillai/reactive-resume/issues/2768) — Failed to import the resume; neither the PDF version nor the JSON version works.

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Issue has no sample or version and mixes cloud with localhost; removeChild exception alone does not locate root cause. Maintainer information request unanswered. Current import suite passes 29 tests, which does not prove this report fixed.

**Action plan:**

- Wait for sanitized PDF/JSON and browser/version, test without translation extensions, capture console stack and import network response.

**Related PRs:** [#3400](https://github.com/amruthpillai/reactive-resume/pull/3400)

### [#2766](https://github.com/amruthpillai/reactive-resume/issues/2766) — [Bug?] ERROR [oRPC]: Error: No object generated: response did not match schema.

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Current ai/service.ts:248-283 connection test uses plain generateText and exact "1", not structured object generation; original reported No object generated test mechanism changed.
- Imports still parse and validate generated resume JSON (service.ts:327-340); model returning HTTP 200 does not prove schema-valid response.

**Action plan:**

- Re-test exact Lemonade provider/model on current version; separate simple test from resume parsing, capture sanitized generated output and validation issue.

### [#2760](https://github.com/amruthpillai/reactive-resume/issues/2760) — I lost access to my resumes

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Reporter says existing name collision and successful new creation both invisible, including incognito; stronger signal than generic migration report but no network response/version.
- Current dashboard list-view.tsx:26-30 distinguishes empty filtered results, and API service list must be traced with actual response. #3133 closed as duplicate of this issue.

**Action plan:**

- Preserve canonical issue; compare authenticated list response, filters and owner IDs against create response; inspect hosted account/migration state before any recovery operation.

### [#2751](https://github.com/amruthpillai/reactive-resume/issues/2751) — [Bug] <title>Export pdf format, the item number not complete

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Report Rhyhorn 5.0.10 numbered list digits truncated on export, screenshot only. Current React PDF rich-text list renderer replaced Chromium pipeline.
- Later list fixes #3178/#3236/#3242 concern page-break markers; not proof of original multi-digit marker-width clipping fixed.

**Action plan:**

- Render ordered lists 1-12 and 98-102 in Rhyhorn at narrow columns; inspect every numeral at PDF level and at page breaks; obtain original JSON if mismatch persists.

**Related PRs:** [#3178](https://github.com/amruthpillai/reactive-resume/pull/3178), [#3236](https://github.com/amruthpillai/reactive-resume/pull/3236), [#3242](https://github.com/amruthpillai/reactive-resume/pull/3242)

### [#2745](https://github.com/amruthpillai/reactive-resume/issues/2745) — [Bug] The dynamic resume page in the builder lags when in Arabic language

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Issue concerns Arabic UI center-view transform, not Arabic PDF text; dock.tsx:139 calls centerView(1).
- Preview content sets dir from resume locale at preview.browser.tsx:206; application locale and resume locale can differ. No current browser transform reproduction.

**Action plan:**

- Run builder with Arabic UI and independent EN/AR resume locale; compare initial/center/reset coordinates relative to visible panel bounds; isolate zoom library direction handling.

### [#2739](https://github.com/amruthpillai/reactive-resume/issues/2739) — [Feature] Select the text and change its color in rich text editor

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- main commit 907e32a73 (#2903) explicitly adds text color support. Current rich-input.tsx:230-234 sets/unsets selected text color; :483-541 contains separate Text Color picker; Color/TextStyle extensions registered :77-78.

**Action plan:**

- Close with instructions to select text and use Text Color toolbar picker.

**Related PRs:** [#2903](https://github.com/amruthpillai/reactive-resume/pull/2903)

### [#2735](https://github.com/amruthpillai/reactive-resume/issues/2735) — [Feature] Don't force secure httpS on URLs

**Assessment:** `confirmed_bug`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- apps/web/src/components/input/url-input.tsx:19-27 only recognizes https:// and prepends it to HTTP URLs, producing https://http://example.com. Schema data.ts:19 explicitly permits http:// and https://.

**Action plan:**

- Issue closed; relevant merged PRs: #3403. No further implementation planned for this report. See evidence for the contribution of each fix.

**Implementation:** [PR #3403](https://github.com/amruthpillai/reactive-resume/pull/3403). Explicit HTTP URLs survive paste and edits; bare hosts retain HTTPS defaults. 12 URL input tests passed.

**Related PRs:** [#3403](https://github.com/amruthpillai/reactive-resume/pull/3403)

### [#2732](https://github.com/amruthpillai/reactive-resume/issues/2732) — [Bug] <title>Test connection with gemini works but not able to enable AI

**Assessment:** `needs_reproduction`. **Confidence:** low. **State:** Open pending resolution/merge.

**Evidence:**

- Comments mix enable-toggle failure with 502 import; self-hosted commenter could enable successfully; reporter removed adblocker but no current steps.
- Current integrations uses saved AI providers (PR #3062 architecture), not original local toggle contract.

**Action plan:**

- Ask for one current toggle reproduction and separate import/provider failure; inspect saved enabled/testStatus and update response.

### [#2725](https://github.com/amruthpillai/reactive-resume/issues/2725) — [Feature] <Flexible Sorting for Profile Sections (Experience & Education)>

**Assessment:** `product_decision`. **Confidence:** high. **State:** Open pending resolution/merge.

**Evidence:**

- Sections store period as free-form string (schema/data.ts), and menu has no chronological sort control (section-menu.tsx). Locale-specific ongoing periods and ambiguous human strings make automatic ordering policy material.

**Action plan:**

- Choose parser fallback and stable ordering for unparseable/date-free/ongoing ranges; add explicit user-triggered reverse chronological action preserving manual order until invoked. Test localized months and unknown dates.

### [#2723](https://github.com/amruthpillai/reactive-resume/issues/2723) — AI connection test succeeds but resume import fails with Bad Gateway

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Multiple distinct providers/problems pooled; two commenters confirmed OpenAI/PDF recovered, others Ollama/OpenRouter remained failing.
- Current ai/service.ts:107-133 selects provider-specific adapters; :327-340 PDF still sent as file input; generic gateway error does not identify native-file support versus quota/network.

**Action plan:**

- Keep open for scoped reproduction: version/provider/model/base URL/file/error. Use deterministic PDF fallback PR #3400 as related, not proof AI integration fixed.

**Related PRs:** [#3400](https://github.com/amruthpillai/reactive-resume/pull/3400)

### [#2722](https://github.com/amruthpillai/reactive-resume/issues/2722) — [Feature] All-in-One (AIO) Docker Container

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Dockerfile already bundles web/server into one Node app on port 3000; compose keeps PostgreSQL/Redis/SeaweedFS separate.

**Action plan:**

- Decide whether to support embedded database/process supervisor image. Compare minimal app+Postgres documented deployment with AIO maintenance and backup responsibility; prototype only after support decision.

**Product/scope note:** App-only consolidation exists; database-in-container request remains unmet.

### [#2708](https://github.com/amruthpillai/reactive-resume/issues/2708) — [Bug] Open WebUI current config?

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Original logs POST /v1/responses HTTP 200 through Open WebUI/llama-swap; maintainer linked #2710 and requested post-fix reproduction twice.
- Current ai/service.ts:107 uses .chat(model), :121-123 compatible adapter, but full original proxy response contract not available.
- Original attached llama.cpp log confirms POST /v1/responses HTTP200 through OpenWebUI/llama-swap; no JSON response body or exact Reactive Resume version is supplied.
- Merged release PR #2814 / commit5cd16a62d changed OpenAI .languageModel(model) to .chat(model), removing the documented Responses-selection incompatibility. Current packages/api/src/features/ai/service.ts:107 retains .chat and :121-123 uses the dedicated compatible adapter.
- Independent current-service wire fixture: four tests pass, covering OpenAI and OpenAI-compatible against both /openai and /api base paths, exact /chat/completions request capture, success on a schema-correct reply, explanatory failure on malformed HTTP200 and a failing Responses negative control. This is a real SDK/HTTP contract fixture, not a full OpenWebUI/model reproduction. Artifacts /tmp/issue-2708-reproduction/{wire.test.ts,requests.json,malformed-result.json}.

**Action plan:**

- Keep open pending exact current OpenWebUI version/base path/provider/model and response body. Historical Responses-selection cause is fixed, but the reported HTTP200 mismatch cannot be proven identical without its response. Current official OpenWebUI API guidance documents /api/chat/completions, so /api is the corresponding compatible-provider base URL. No additional source change justified by the bounded fixture.

**Related PRs:** [#2814](https://github.com/amruthpillai/reactive-resume/pull/2814)

### [#2705](https://github.com/amruthpillai/reactive-resume/issues/2705) — [Feature] Save JSON versions in a version control system

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- versions.ts exposes owner-scoped list/restore snapshots; docs explain server snapshots and session undo. This does not sync JSON to user's external Git repository.

**Action plan:**

- Clarify external Git backup versus named internal versions. If external, design opt-in credentials/scopes, destination paths, conflict handling, branch safety and secret-free JSON export before implementation.

**Product/scope note:** Internal history is mitigation, not fulfillment.

### [#2689](https://github.com/amruthpillai/reactive-resume/issues/2689) — [Bug] Title: Bring back Europass CV template - Critical for German job market compliance

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- packages/schema/src/templates.ts lists 15 templates and no Europass. Issue requests European-style output plus unsupported administrative-compliance claims.

**Action plan:**

- Confirm desired Europass visual/content format and official reference; build template only after design decision. Add schema registry, PDF layout, previews and fixtures. Do not assert universal legal/ATS compliance.

**Product/scope note:** Treat as template feature request, not verified regulatory defect.

### [#2684](https://github.com/amruthpillai/reactive-resume/issues/2684) — [Bug] S3 uploads fail with 500 error despite healthy S3 connection

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- packages/api/src/features/storage/service.ts:254-261 upload always requests ACL public-read/private; :300-306 healthcheck performs PutObject without ACL.
- This divergence explains healthy checks/CLI yet failures on ACL-disabled AWS or S3-compatible bucket, but issue contains no underlying S3 error to confirm.

**Action plan:**

- PR #3432 was merged by the repository owner on 2026-09-05 and removes unsupported object ACL requests. Keep the issue open until the reporter confirms or supplies the original S3 error; authenticated proxy and private/public attachment behavior remain verified.

**Implementation:** [PR #3432](https://github.com/amruthpillai/reactive-resume/pull/3432). Removes unsupported S3 object ACLs. Real SDK wire-contract stub reproduces AWS documented rejection; real Ceph gateway separately verifies public proxy and private access behavior. Exact reported deployment cause remains unproven; PR relates to the issue without closing it.

**Related PRs:** [#3432](https://github.com/amruthpillai/reactive-resume/pull/3432)

### [#2683](https://github.com/amruthpillai/reactive-resume/issues/2683) — [Bug] Downloaded PDF has space but Playground shows no space.

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Rhyhorn bottom-space difference between playground and downloaded PDF; screenshot/video only, no source data.
- Current preview and export both use ResumeDocument/React PDF, but still independent preview scaling and page-size settings.

**Action plan:**

- Compare exact data preview/export physical page sizes, margins, overflow and scale; verify downloaded PDF pixels against preview before closure.

### [#2669](https://github.com/amruthpillai/reactive-resume/issues/2669) — [Feature] Ability to have a public resume as root page via a reverse proxy

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Public route binds /$username/$slug and client fetches that pair; root route cannot infer a resume from reverse-proxy path rewriting alone.

**Action plan:**

- Choose single configured root resume for self-hosting or verified custom-domain mapping. Implement routing without redirect loop and preserve assets/API, canonical URLs, password policy and tenant isolation; add integration tests.

**Product/scope note:** Needs product architecture decision; iframe advice does not fulfill request.

### [#2650](https://github.com/amruthpillai/reactive-resume/issues/2650) — [Bug] 🐛 Import feature throws `map is not a function` error

**Assessment:** `already_fixed`. **Confidence:** high. **State:** Closed with evidence.

**Evidence:**

- bad431b2f (#3296) adds early v4 shape guard and catches transformation TypeErrors as readable v4-format error (reactive-resume-v4-json.tsx:232-245,657-667). Regression test :413 covers current-format object layout in v4 parser. Current v4/current/error tests 29 passed. Auto-detection selects current format based on metadata.page.

**Action plan:**

- Issue closed; relevant merged PRs: #3296. No further implementation planned for this report. See evidence for the contribution of each fix.

**Related PRs:** [#3296](https://github.com/amruthpillai/reactive-resume/pull/3296)

### [#2611](https://github.com/amruthpillai/reactive-resume/issues/2611) — Gengar template

**Assessment:** `product_decision`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Gengar skill scoring previously rectangles between title and description; current shared SkillsSection:1158-1178 renders header, proficiency, keywords then LevelDisplay.
- Global design controls indicator type; requested ordering/appearance restoration is separate from lost skill text fixed #3289.

**Action plan:**

- Decide template-specific skill ordering/default rectangle design; compare original v4/v5 fixture; avoid changing shared order across all templates inadvertently.

**Related PRs:** [#3289](https://github.com/amruthpillai/reactive-resume/pull/3289)

### [#2609](https://github.com/amruthpillai/reactive-resume/issues/2609) — [Bug] Ditto and Kikorita templates do not work

**Assessment:** `needs_reproduction`. **Confidence:** medium. **State:** Open pending resolution/merge.

**Evidence:**

- Original self-hosted 5.0.3 templates do not load; later Ditto squished items, missing borders/header, bold descriptions is different bundled regression.
- Current getTemplatePage mapping and PDF all-template smoke tests pass (57 test files/683 total baseline tests), but no exact deployment/browser/source JSON. Maintainer requested current reproduction.

**Action plan:**

- Request original deployment/browser errors and JSON; reproduce template selection separately from visual changes; do not close on age or generic template smoke alone.
