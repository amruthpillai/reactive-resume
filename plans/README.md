# Issue execution plans and dispositions

This package contains **35 plan records covering 63 unique audited issues**, verified against `inventory.json`: 34 approved plans and one later-declined Plan 10 record retained for audit history. Shared grouping does not establish a shared root cause. Each issue retains its own evidence and closure criteria. Historical reproduction limits are explicit in the individual plans.

Start with [ORCHESTRATOR.md](ORCHESTRATOR.md), [DECISIONS.md](DECISIONS.md), and [PR-HANDOFF.md](PR-HANDOFF.md). The maintainer approved all selected plan directions on 2026-09-05, then superseded Plan 10 on 2026-09-06 as not planned. Earlier “agent judgment” labels record provenance; they remain approved for future execution except where a later disposition explicitly says otherwise. This documentation PR implements no product changes.

## Execution order and coordination

1. Revalidate current issue/PR state and source drift. Skip work already resolved; retain evidence in the execution ledger.
2. Start independent diagnostic and documentation work: 01–09, 11–14 and 35, subject to each plan's access/reproduction gates. Plan 07 declines AIO; it is not an AIO implementation. Plan 10 is not planned and must not be executed.
3. Coordinate shared rich-text ownership for 16 and 19; land neither over an unreviewed competing edit. Coordinate 13/14/17/18 rendering changes through one owner per overlapping file.
4. Coordinate section/schema/rendering work: 20–24 and 32 share layout, menus, or date behavior. Q1–Q10 in DECISIONS.md are authoritative. Plan 21 and 31 must preserve accessible section labels.
5. Schedule 15 and 25 together for image-storage compatibility, 27 with font diagnostics in 13/14, and 26/28/29/34 around shared template ownership. Run 30/31 after relevant rendering baselines are stable. Plan 33 begins with reference research and a reviewable visual proposal.

These are coordination constraints, not mandatory sequential batches. Build the actual dependency graph from current files and current dispositions/scopes. Use stacked PRs only for true dependencies and disclose base branches. Independent fixes start from current main. One coherent fix may address several issues; a plan may require separate PRs when causes differ.

## Readiness and limits

For active entries, “approved plan” means product direction is approved, not that every historical report was reproduced. A `not_planned` disposition is final unless the maintainer explicitly reverses it. Diagnostic plans begin with their evidence gates and implement only proven residuals. Private recovery work needs legitimate access and backups. Europass needs approval of concrete visual artifacts before template implementation. Technical feasibility failures retain the original content and become documented blockers.

PRs #3453 and #3454 are already raised and unmerged at the recorded checkpoint; inspect their live state before touching them. Issue #2828 has a concurrent-edit residual documented outside the 63-issue inventory. Neither opening a PR nor passing a broad suite proves an issue resolved. Keep PRs unmerged; do not post issue comments or close issues during the execution run unless separately instructed.

## Coverage

| Plan | Issues |
| --- | --- |
| [01 — Diagnose account login and recovery failures](01-account-login-recovery.md) | #3166, #3164, #3078, #3046, #2897, #2837 |
| [02 — Decide hosted v4 account recovery and verify account ownership](02-hosted-v4-account-recovery.md) | #3181, #2760 |
| [03 — Verify MCP registration after the OAuth persistence fix](03-mcp-registration.md) | #3398, #3153 |
| [04 — Isolate AI provider connection, enablement, and import failures](04-ai-provider-compatibility.md) | #2732, #2766, #2723, #2708 |
| [05 — Diagnose missing AI provider schema on self-hosted deployments](05-ai-provider-migrations.md) | #3152 |
| [06 — Verify image upload and PDF delivery across storage backends](06-image-storage-delivery.md) | #2684, #2778 |
| [07 — Record declined AIO packaging and improve separate-PostgreSQL setup docs](07-aio-deployment.md) | #2722 |
| [08 — Decide root-domain public resume routing](08-root-public-resume.md) | #2669 |
| [09 — Document explicit JSON backup in a user-controlled Git repository](09-external-version-backup.md) | #2705 |
| [10 — Retired-link routing and owner notifications (not planned)](10-legacy-link-routing.md) | #2836 |
| [11 — Document JSearch removal and the current tailoring workflow](11-job-search-policy.md) | #3010 |
| [Plan 12: Diagnose blank, black, and incomplete resume output at the first failing boundary](12-preview-and-export-failures.md) | #3323, #3290, #3033, #3007, #2609 |
| [Plan 13: Reproduce remaining font, glyph, and spacing reports without undoing verified fixes](13-font-glyph-and-spacing.md) | #3249, #3159, #3147, #3093, #3089, #2988 |
| [Plan 14: Separate RTL PDF shaping and layout from the corrected canvas display](14-rtl-export-layout.md) | #3275 |
| [Plan 15: Diagnose picture delivery, square-preview geometry, and non-square fitting separately](15-picture-fitting-and-style.md) | #3168, #3088, #2794, #2782 |
| [Plan 16: Preserve imported table structure and isolate missing-border reports](16-imported-table-borders.md) | #3196 |
| [Plan 17: Verify remaining list-marker and skill-decoration clipping separately](17-list-and-skill-pagination.md) | #2751, #3040 |
| [Plan 18: Measure preview and downloaded page geometry from identical resume data](18-preview-export-geometry.md) | #2683 |
| [Plan 19: Define literal whitespace semantics before changing editor and export normalization](19-literal-rich-text-whitespace.md) | #3397 |
| [Plan 20: Distinguish hidden sections from sections missing from the layout](20-section-restoration.md) | #3378, #3265, #2921 |
| [Plan 21: Separate heading visibility from the localized title fallback](21-section-heading-visibility.md) | #3060 |
| [Plan 22: Choose and implement an explicit skill keyword presentation mode](22-skill-keyword-presentation.md) | #2785 |
| [Plan 23: Separate authored page controls from item pagination and physical overflow](23-pagination-controls.md) | #3350, #3090 |
| [Plan 24: Define date placement without conflating existing style controls](24-date-layout.md) | #3155, #2841 |
| [Plan 25: Add Experience logos through the existing image ownership contract](25-entry-company-logos.md) | #3379 |
| [Plan 26: Define a secondary color token with explicit consumers and compatibility](26-secondary-color.md) | #3373 |
| [Plan 27: Measure all font network paths before choosing an offline distribution](27-offline-fonts.md) | #3377 |
| [Plan 28: Verify existing Basics styling and isolate unsupported residuals](28-basics-custom-styles.md) | #3137 |
| [Plan 29: Add optional Onyx header profile placement without duplicate content](29-onyx-profile-header.md) | #2812 |
| [Plan 30: Evaluate current PDF and DOCX exports before defining an ATS preset](30-ats-export-evaluation.md) | #2845 |
| [Plan 31: Verify document accessibility and enhance only confirmed gaps](31-document-accessibility.md) | #2844 |
| [Plan 32: Define explicit date sorting with stable unknown-date behavior](32-section-date-sorting.md) | #2725 |
| [Plan 33: Approve an official Europass reference and data mapping before template code](33-europass-template.md) | #2689 |
| [Plan 34: Restore Gengar skill rating placement without changing other templates](34-gengar-skill-layout.md) | #2611 |
| [Plan 35: Reproduce import failures before changing parser or dialog lifecycle](35-resume-import-errors.md) | #2768 |
