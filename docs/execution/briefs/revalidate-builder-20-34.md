# Revalidation audit: plans 20–34

Read first:

- `/Users/amruth/orca/workspaces/reactive-resume/planning-pr-3455/plans/ORCHESTRATOR.md`
- `/Users/amruth/orca/workspaces/reactive-resume/planning-pr-3455/plans/DECISIONS.md`
- Entire plan files 20 through 34 in that checkout
- Current worktree `AGENTS.md`, referenced domain instructions, context/ADRs, and package scripts

Before reading local planning files, require its `git rev-parse HEAD` to equal
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`. If absent or different, fetch PR #3455 and use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/<file>` for every required file. Never read planning files from
stale checkout or current `main`.
Resolve exact plan filenames first with
`git ls-tree -r --name-only a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d plans/`; read ORCHESTRATOR, DECISIONS, and
the listed files whose prefixes are `20-` through `34-`.

Audit only. Do not edit source, commit, push, create PRs, mutate GitHub issues, or touch coordinator ledger. Do not spawn
subagents. Use CodeGraph first only when `.codegraph/` exists. Otherwise inspect exact-head source with `git show`, `rg`, and
direct reads; record CodeGraph unavailability and limitation. Fetch every issue body/comments and live PRs/current main.

For each plan and issue, report live state/PRs, source validity/drift, reproduction/evidence gates, coherent cause-based unit
split, exact owned files/interfaces, overlap/dependency graph, visual/rendered assertions, focused tests/typechecks/boundaries/
build gates, blockers, and disposition. Q1–Q10 plus blanket approvals bind. Identify partial implementations already on main.
Plan 30/31 depend on renderer baselines. Plan 33 stops after official-reference research plus concrete visual proposal pending
future visual approval. Separate verified facts from uncertainty.

Write full report to `.orchestration/revalidate-builder-20-34.md` in your worktree. Final response: report path, concise
unit-ready summary, blockers, and no more than ten lines.
