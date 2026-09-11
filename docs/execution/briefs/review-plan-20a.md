# Independent review: Plan 20A hidden-section recovery

Review only in `/Users/amruth/orca/workspaces/reactive-resume/issue-3378-hidden-section-recovery` on branch
`codex/issue-2921-hidden-section-recovery`. Exact target head:
`0ec054df70e6f445557bd3a54a0d62686586b3de`. Do not edit tracked files, commit, push, publish, merge, or mutate issues.

Read current repository instructions, pinned approved Plan 20, implementation report, full `origin/main...HEAD` diff,
live issues #2921/#3378/#3265, open PR overlap, and builder/resume-domain guidance. Refresh base and verify exact head.
Run root Intent inventory and load matching review skill if any; no subagents.

Review Standards and Spec independently. Verify especially:

- pure `getSectionAvailability` inventory covers all printable built-ins, Summary, and real custom sections while excluding
  Picture, Basics, UI-only custom container, and unknown IDs; placement and hidden state remain independent; duplicate,
  later-page, and sidebar locations work without mutating data;
- compact recovery UI replaces full editor panels only for hidden printable sections; effective localized titles, custom
  child behavior, navigation/focus, keyboard access, locked disablement, and undo/redo are correct;
- Show changes only the existing hidden flag, preserving content, item order, and byte-equivalent layout arrays; an
  unplaced hidden section remains unplaced and no 20B placement behavior appears;
- custom-section editor container stays usable when only some custom children are hidden;
- package export, ownership, named props, SSR, Lingui catalog/source handling, and accessibility follow repository rules;
- tests are mutation-sensitive and authenticated E2E proves save/reload, compact entries, PDF absence/restoration, exact
  authored layout preservation, undo/redo, locked state, and cleanup without accepting stale Saved state;
- PR scope must reference #2921 only and must not claim recovery for #3378/#3265 or deleted content.

Run focused resume/web tests plus relevant existing visibility/menu/navigation regressions, affected typechecks, boundaries,
production build, narrow non-writing Biome, Lingui/diff/scope gates, and isolated authenticated E2E if practical. Report
findings first with severity/anchors and publication verdict in `.orchestration/plan-20a-review.md`; send `worker_done`.
