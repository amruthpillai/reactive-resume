# Product decisions required before completing the affected plans

**Status: Q1–Q12 are recorded below.** Further routine choices may use agent judgment under the maintainer’s updated instruction; materially different product directions still require answers. Recommendations are proposals, not approvals. The maintainer explicitly requested that planning stop at product decisions rather than let a later executor invent policy. Verification and source inspection may continue independently.

Use grill-with-docs only for necessary product questions. On 2026-09-05, after Q10, the maintainer instructed the agent not to ask when the recommended answer is sufficiently clear. Record agent-selected recommendations separately from explicit maintainer approvals. A decision only authorizes the corresponding plan direction; this planning task still must not implement these features or post GitHub issue comments.

## Recorded decisions

### Q1 — Heading visibility (approved 2026-09-05)

The maintainer answered “Yes” to an explicit **Show heading** toggle that hides the heading, icon, and separator while retaining section content and its name in the builder. Empty titles continue to restore the localized default title, preserving existing resumes. Applies to plan 21 (#3060 and the heading concern in #3196).

Continuation behavior was subsequently settled in Q2. Visual output and accessible-outline behavior were subsequently settled in Q3. This answer authorizes the plan direction only; it does not authorize implementation during this planning task.

### Q2 — Continuation heading default (approved 2026-09-05)

The maintainer answered “Yes” to keeping the heading visible when **Move to** creates a continuation section on another page. The user must explicitly hide that continuation heading with the new toggle. Do not automatically suppress headings based on page position or copied section titles. Applies to plan 21.

### Q3 — Heading output and accessibility (approved 2026-09-05)

The maintainer answered “Yes” to hiding the visible heading consistently in preview, PDF, and DOCX while retaining the section label in the screen-reader outline. Heading visibility controls visual presentation, not accessible section naming. Applies to plan 21 and coordinates with plan 31; this does not independently establish a tagged-PDF conformance target.

### Q4 — Dedicated date column (approved 2026-09-05)

The maintainer answered “Yes” to an optional dedicated left date column, with entry details aligned beside it and current layout preserved by default. Applies to plan 24 (#3155 and the date-placement concern in #2841). Merely moving dates first within the existing row does not satisfy this decision.

RTL placement was subsequently settled in Q5. Column width and long-date behavior were subsequently settled in Q6. Section scope was subsequently expanded in Q7; template scope was subsequently settled in Q8. Historical v4 visual parity and unrelated #2841 subrequests are not established by this approval.

### Q5 — Date column follows reading direction (approved 2026-09-05)

The maintainer answered “Yes” to mirroring the date column to the right in RTL resumes. The column occupies the reading start: left for LTR and right for RTL. Applies to plan 24; do not interpret Q4's “left” as an invariant physical side.

### Q6 — Per-section date-column width and wrapping (approved 2026-09-05)

The maintainer answered “Yes” to user-controlled date-column width per section, with long dates wrapping inside the column and entry details staying aligned. Applies to plan 24. Do not truncate dates or vary the content-column start independently for each entry. Exact width units, bounds, and initial geometry require layout validation; they were not specified by this answer.

### Q7 — All section types with free-text dates (approved 2026-09-05)

The maintainer expanded the proposed Experience/Education scope: “Do it for all section types that carry a free-text date field, this is so that the entire resume can look consistent.” Plan 24 therefore covers Awards, Certifications, Education, Experience (including role periods), Projects, Publications, and Volunteer, plus custom sections of these types. This inventory is grounded in the current `date` and `period` string fields in `packages/schema/src/resume/data.ts`; recheck it against the execution revision.

Do not restrict support to employment and education. Preserve free-text date values rather than parsing or normalizing them for this presentation feature. Template coverage was subsequently confirmed in Q8.

### Q8 — Date columns across all templates (approved 2026-09-05)

The maintainer answered “Yes” to supporting the date-column option across all templates, preserving each template's current layout when disabled. Applies to all Q7-supported section types and custom equivalents. Switching templates must retain the selected date-column settings. Existing resumes without the option must keep their current presentation.

### Q9 — Undated entries retain column alignment (approved 2026-09-05)

The maintainer answered “Yes” to leaving the date column empty for entries without dates while keeping their details aligned with dated entries. Applies to plan 24. Do not collapse the date column per entry or substitute another field into the empty date cell. Preserve the selected section layout even when dates are absent.

### Q10 — Authored pages and automatic overflow (approved 2026-09-05)

The maintainer answered “Yes” to retaining independent layout controls for manually authored pages and explaining how to create a full-width continuation page. Plan 23 should provide actionable guidance using existing Move to / New Page and full-width controls. Independent styling of renderer-generated overflow pages is outside this plan. Validate the guidance with the reported Azurill scenario; do not claim that independent overflow-page editing was implemented.

### Q11 — Editable rich-text tables (approved 2026-09-05)

After clarification that “native editing” means adding Tiptap table support and that the current editor flattens imported tables on edit, the maintainer explicitly said: “Yes, add it.” Plan 16 must support editing table rows/cells while preserving structure and supported styling through save/reload and export. Unsupported markup must not silently lose data. A read-only fallback is protection for unsupported content, not the selected treatment of all tables. Historical equivalence to #3196 remains unverified without the reporter's source fixture.

### Q12 — PostgreSQL remains separate; no AIO image (approved 2026-09-05)

The maintainer explicitly decided: “No, postgres must be separate. There is no benefit to providing an AIO image.” Plan 07 therefore declines #2722's embedded app/database image request. PostgreSQL remains a separate service. Any associated work is bounded to improving existing Compose/Unraid onboarding documentation, not introducing an embedded database, supervisor, or alternate AIO image. Record eventual issue disposition as a declined feature request, not an implemented AIO feature. No GitHub issue mutation is authorized during this planning task.

## Blanket approval and final authority (2026-09-05)

The maintainer subsequently said **“Approved all. Push them to a branch/PR”**. This approves the selected directions and recommendations in the numbered plans, including choices originally labeled agent judgment. Those labels retain their historical provenance; they are no longer unanswered approval gates. Earlier alternative tables are superseded by the numbered plans and the explicit decisions above. Explicit Q1–Q12 decisions take precedence over a conflicting recommendation.

Plan 19 selects intentional ordinary-paragraph/heading whitespace preservation with the documented legacy-content compatibility boundary and four-space tab rendering. Plan 33 authorizes research and a visual proposal; approval of a concrete future Europass design remains a checkpoint. Access to private recovery data, unavailable historical fixtures, and renderer feasibility remain real execution gates, not routine permission requests.

The final selected directions for plans 02, 07–09, and 11 are scoped recovery, separate PostgreSQL, self-hosted root routing, local JSON/Git documentation, and current-workflow documentation respectively. Plan 10's earlier prospective owner-only retired-link notice was superseded on 2026-09-06: the maintainer declined it because redirect lifecycle and error-handling overhead are disproportionate, so it must not be implemented. These decisions supersede earlier broader backup-sync and redirect proposals. Plan 32 is one-time sorting, not persistent autosort; plan 23 defers widow/orphan UI. Each plan must disclose partial issue coverage in its PR.

## Residual issue 2828

The 63-issue inventory excludes #2828 and #3246, covered by PRs #3453 and #3454. Concurrent-tab overwrite remains a separately verified residual of #2828; see PR-HANDOFF.md. Recommended future policy: combine non-overlapping edits and ask the user to resolve collisions while retaining both drafts. Blanket approval permits planning that direction but does not make the unpublished prototype production-ready or add it to the 35 numbered execution units.
