# Independently review plan 15A picture fitting

Review only. Read pinned approved plan 15, current `AGENTS.md`, RTK, applicable code-review skill, implementation report,
and complete `origin/main...d891afd667dc571dcee642d54f851f6bde45fad8` diff. Revalidate live issue/PR/base state.

Review Standards and Spec axes. Verify:

- schema/default/sample/v4 import compatibility defaults missing/invalid fit to Cover without corrupting data;
- Cover retains current crop dialog, cancel/error/locked/autosave/undo behavior; Contain uploads full selected file through
  existing validated storage path and never implies already-cropped pixels can be restored;
- sidebar and every PDF template route through one shared fit contract; semantic CSS precedence and borders/shadows stay
  correct; Cover output remains backward compatible;
- controls are named, accessible, localized through correct catalog workflow, and generated docs/skill schema match source;
- tests assert behavior rather than implementation, raster tolerances are meaningful, E2E does not add brittle global
  state, hardcoded local assumptions, unsafe cleanup, production-only dependencies, or a hidden network requirement;
- exact issue #2782 scope; no claims for #3168/#3088/#2794 and no unrelated generated artifacts.

Run fresh base/live checks, focused schema/web/PDF/import tests, affected typechecks, boundaries, narrow Biome/catalog/docs,
diff/scope. Inspect E2E source and run dedicated raster E2E when disposable DB/ports are safely available; otherwise state
exact gate. Do not accept implementation report as proof without independent commands/probes.

Write `.orchestration/plan-15a-review.md` with findings first and file/line evidence, exact head, commands/results, skips,
risks, and publication verdict. Do not edit tracked files, push, open PR, merge, mutate issues, or spawn subagents. Final
response at most ten lines.
