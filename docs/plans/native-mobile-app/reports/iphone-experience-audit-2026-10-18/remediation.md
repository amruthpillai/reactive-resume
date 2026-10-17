# iPhone audit remediation

Date: 2026-10-18. Baseline: `9e4f78b46`. All eight findings in [the original audit](report.md) implemented. The original report and captures remain an unchanged record of the review. No commit or deployment performed.

## Changes and proof

| Finding | Result | Evidence |
| --- | --- | --- |
| 1. Large Dynamic Type | Documents chrome scrolls with the collection; header/actions stack; filters become vertical; Sort uses a bounded row. Settings title/value receive full width below icons. Bottom navigation labels wrap. | iPhone 17 Pro, iOS 26.5, 402 × 874 pt: largest-size Documents scrolls to Trash; Preferences stays whole. Layout harness also exercises 320 pt at normal, accessibility-large and largest font scales, with/without refresh errors. This harness inspects layout structure, not native glyph measurements. |
| 2. Dirty form dismissal | Job/interview reuse shared EditorSheet. Cancel and incidental dismissal ask Discard / Keep editing; form owner stays mounted. Pending saves block dismissal and duplicate submissions. | iPhone job Cancel → Keep editing retained exact Company/Role. M5-T1 and M6-T1 execute dirty, pending, failure and dismissal callbacks. Interview reminder failure reports that the interview was saved. |
| 3. Cold-start pending documents | Documents lists validated pending drafts for the exact account/server, including memory retained after disk failure. Pending/server duplicates get one row and an unsynced badge. | M3-T3 cold recovery preserves exact text, validates real resume/letter schemas, rejects corrupt and other-account records, and checks late async/session/unmount boundaries. Library integration independently source-reviewed. Full native cold-start recovery not replayed. |
| 4. Quick capture | Company, Role and Stage precede optional More details. Save/Cancel stay in the footer. Hidden invalid optional fields expose a correction notice. Truncation warning stays visible. | iPhone shows enabled Save above software keyboard after two fields. M5-T1 covers quick capture, parsed/edited optional values, hidden validation and clipping. |
| 5. PDF sharing | Share starts on Download; filename and Share PDF precede a compact format picker. Link/History and alternate exports remain available. | Experience harness executes default/history routes, filename, duplicate-tap lock, flush guard, offline local PDF and alternate-format PDF fallback. No native share-sheet/export rerun. |
| 6. Stage semantics | Progress is informational. Change stage explicitly edits it; Saved → Applied retains MarkApplied workflow. | Experience harness checks noninteractive progress and explicit mutations. |
| 7. Next task | Primary detail action follows state: Prepare application, Prepare for interview, Draft a follow-up, or existing stage/debrief destination. | Experience harness checks representative states and exact workspace destinations. |
| 8. Native date entry | Application/follow-up dates reuse native picker; optional selection can cancel, confirm unchanged default, or clear. | iPhone selected and cleared follow-up date. M6-T1 covers calendar-day preservation across device timezones and disabled controls. |

Secondary audit items addressed: selected workspace tab scrolls into view with overflow arrows; Knowledge choices appear inline; duplicate Account navigation row removed.

## Independent review

Two independent source reviewers checked the final changes against the eight findings. Both initially found the web-search Settings exit bypassed dirty-form protection; design reviewer also found collapsed invalid/truncated details could hide feedback. Those defects were fixed, reproduced as failing checks before their fixes, and re-reviewed. Both reviewers reported no remaining actionable source findings. A further standards pass approved the final large-text row/header/Sort changes.

## Verification

All commands below passed from the worktree root using `rtk proxy`:

```sh
pnpm --filter mobile typecheck
pnpm lint:agent
pnpm format:check
pnpm exec turbo boundaries
node apps/mobile/scripts/layout.test.mjs
node apps/mobile/scripts/experience.test.mjs
node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M3-T3/verify.mjs
node docs/plans/native-mobile-app/reports/M5-T1/verify.mjs
node docs/plans/native-mobile-app/reports/M6-T1/verify.mjs
node --import ./apps/server/node_modules/tsx/dist/loader.mjs docs/plans/native-mobile-app/reports/M6-T3/completion.mjs
pnpm --filter mobile lingui:extract
pnpm --filter mobile exec expo export --platform ios --output-dir /tmp/rr-iphone-audit-ios-export-final
```

Scenario totals: M3-T3 **28**, M5-T1 **22**, M6-T1 **39**, M6-T3 **26**, plus layout and experience harnesses. These execute production logic/components with simulated native/transport boundaries; they are not full device end-to-end tests. Production iOS JavaScript/Hermes bundle generated successfully; no native binary build or signed release performed. Mobile localization catalogs refreshed; 63 untranslated entries per non-source locale use English fallback and await translation.

## Fresh iPhone evidence

- [Largest Documents, top](fixed-documents-largest-top.png) and [after scrolling to Trash](fixed-documents-largest-bottom.png).
- [Largest Settings](fixed-settings-largest.png), with Preferences using full row width.
- [Quick capture with software keyboard](fixed-job-keyboard.png), [dirty-form confirmation](fixed-job-discard.png), and [native date picker](fixed-job-date-picker.png).
- Native guide screenshots use fictional Company/Role; no job was saved to the unavailable local test server. Existing account/drafts were preserved.

## Environment and remaining limits

Existing Debug client ran current checkout JavaScript through task-owned Metro on 8111. Saved local test server `http://localhost:3140` was unavailable, so source/harness evidence covers server-dependent workflows. No production outage inferred.

An RTK-rewritten typecheck accidentally invoked a root compiler with emission. The 1,473 generated untracked JS/MJS siblings were quarantined under `/tmp/rr-iphone-audit-20261018-emitted-js/` with a manifest; source files were preserved. Metro was restarted with a clear cache, correct `rtk proxy pnpm --filter mobile typecheck` passed, and final iOS export succeeded. Recovery/assistant harnesses require their documented TypeScript loader; plain Node without it cannot resolve extensionless schema imports.

Simulator appearance/text size restored to Light / Large. Only task-owned Metro stopped. Other workers' devices/services preserved.

Remaining validation: physical iPhone, smaller-iPhone native layout, spoken VoiceOver, signed-release behavior, device performance, full native offline recovery and live export/share/interview save. No exhaustive dark-mode/contrast, landscape or full regression sweep claimed.
