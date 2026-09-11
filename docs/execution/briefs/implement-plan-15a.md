# Implement plan 15A: opt-in picture cover/contain

Read entire approved plan from local planning checkout only when its HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned portable fallback:
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/15-picture-fitting-and-style.md`. Read current `AGENTS.md`,
RTK, issue/domain instructions, ADRs, and applicable skills. Run root Intent inventory and load matching local skill before
source edits. Do not spawn subagents. Do not touch ledger, mutate issues, merge, push, or create PR.

Start from refreshed `origin/main`, require clean worktree, rename branch `codex/issue-2782-picture-fit`, revalidate live
issue 2782 and all open implementation PRs, and run plan drift check. Stop on overlapping implementation or contradicted picture
contract. Historical #3168/#3088/#2794 causes remain outside this implementation and must not be claimed fixed.

Strict TDD and bounded scope:

- First add failing schema compatibility and picture-fit geometry/UI tests. Record exact RED output before implementation.
- Add `fit: z.enum(["cover", "contain"]).catch("cover")` to picture schema and `fit: "cover"` to defaults/required
  fixtures. Old and invalid JSON parse as cover; contain round-trips. No DB migration.
- Add named Cover/Contain control through existing form/draft path. Cover retains crop flow. Contain uploads selected full file
  via existing endpoint without cropped-canvas construction. Preserve validation, cancel/error/locked behavior, save/reload,
  and undo. Explain that switching cannot restore pixels already cropped; no asset history or new endpoint.
- Make sidebar preview and shared PDF renderer consume selected fit. Preserve frame/aspect/border/shadow/rotation and normal
  Semantic CSS precedence. Inspect every template image consumer; change only paths that bypass shared fit.
- Use synthetic marked square/landscape/portrait images. Assert contain retains all edges and centers within one pixel; cover
  preserves old crop geometry; test border/shadow branches and semantic `object-fit: cover` override.
- Add/extend authenticated synthetic E2E for full-image upload, persistence, JSON/browser/server PDF parity when environment
  supports it. Never use reporter/private assets.

Run focused schema/web/PDF tests, affected typechecks, boundaries, full build, and plan E2E against dedicated disposable DB.
Use narrow non-writing Biome inspection; if `pnpm check` runs, disclose it is write-capable and inspect diff. Run
`git diff --check` and scope/name-only checks. Commit locally with normal message; leave for independent review.

Write `.orchestration/plan-15a-implementation.md`: verified facts vs uncertainty, live/drift state, RED/GREEN evidence, exact
commit/files, tests/results, skipped gates, visual/raster evidence, risks, issue coverage, PR `not created`. Final response at
most ten lines.
