# Implement plan 20A: compact hidden-section recovery

Read approved plan 20 from local planning checkout only when HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/20-section-restoration.md`. Read current `AGENTS.md`, RTK,
issue/domain guidance, relevant ADRs, and applicable brainstorming/TDD/frontend skills. Plan supplies approved UX direction;
do not pause for routine product choices. Run root Intent inventory and load matching local skill before edits. Do not spawn
subagents, touch ledger, mutate issues, merge, push, or create PR.

Start clean from refreshed `origin/main`, rename branch `codex/issue-2921-hidden-section-recovery`, revalidate live issues
2921/3378/3265 and open PRs, and run exact plan drift check. This unit implements 20A for verified issue 2921. Reporter
forensics for 3378/3265 stay open. Do not claim missing/deleted content recovery or implement Layout placement in this unit.

Strict TDD, exact scope:

- First add failing pure tests for known printable section inventory: built-ins, summary, real custom sections; hidden and
  placement locations independent; duplicate/later-page/sidebar locations; unknown IDs excluded; picture/basics/UI-only
  custom container excluded; no mutation. Implement proposed `getSectionAvailability` in `@reactive-resume/resume` with an
  explicit export. Include validated placement operation only if required by plan's shared helper contract, but do not expose
  20B UI or auto-place anything.
- Add failing DOM tests then compact Hidden sections UI. Keep Picture/Basics normal. Remove full editor panels only for hidden
  printable sections. List built-in, summary, and individual custom sections by effective localized title. Show changes only
  existing hidden flag through `useUpdateResumeData`; retain content, item order, and all saved layout IDs.
- Preserve custom-section editor container behavior when only some custom children are hidden. Hidden-but-unplaced Show must
  not choose placement. Sidebar icon navigation must focus/open recovery entry. Controls need accessible names, keyboard
  behavior, locked-state disablement, and undo semantics.
- Use named props types and existing UI primitives. New strings through Lingui workflow. No schema, PDF, importer, reset,
  deletion, title-default, or layout-placement semantics changes.
- Add authenticated synthetic E2E: hide built-in/summary/custom, save/reload, compact entries present, PDF text absent; Show,
  same layout reference/output returns; undo/redo and locked state. Do not use reporter data.

Record initial RED and final GREEN. Run resume/web focused tests including existing visibility/menu/navigation regressions,
affected typechecks, boundaries, full build, and focused E2E against dedicated disposable DB. Use narrow non-writing Biome;
disclose/inspect any write-capable `pnpm check`. Run diff/scope checks. Commit locally; no push/PR before independent review.

Write `.orchestration/plan-20a-implementation.md`: live/drift state, facts vs uncertainty, RED/GREEN evidence, exact commit
and files, tests/results, skipped gates, risks, issue-specific coverage, PR `not created`. Final response at most ten lines.
