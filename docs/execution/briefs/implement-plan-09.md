# Implement plan 09: user-controlled Git backup documentation

Read entire approved plan first from local planning checkout only when its HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned `git show` fallback below. Then read current
worktree `AGENTS.md`, referenced domain/issue instructions, relevant ADRs, `/Users/amruth/.codex/RTK.md`, and
`/Users/amruth/.agents/skills/documentation-writer/SKILL.md`. Plan supplies document type, audience, goal, scope, and approved
structure; do not pause for routine outline approval. Portable fallback: fetch PR #3455 and use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/09-external-version-backup.md`.

Do not spawn subagents. Do not touch coordinator ledger or another worktree. Do not merge, mutate issues, push, or create PR.

Required execution:

- Confirm clean worktree, fetch current `origin/main`, rename branch `codex/issue-2705-git-backup-docs`, run exact drift
  command, fetch live #2705 body/comments/state/linked PRs, and run root intent discovery before edits.
- Revalidate current export shapes and history semantics from exact source/tests. Stop if exporter lacks required document
  types or synthetic restore loses content; do not broaden into runtime fixes.
- Modify only `docs/guides/exporting-your-resume.mdx` and
  `docs/guides/undoing-changes-and-version-history.mdx`.
- Document single-resume JSON, independent cover-letter JSON, and account archive differences; stable filenames; image URL
  availability; private-data/repository-visibility warning; local-only Git workflow; non-destructive import-as-new recovery;
  rolling in-app versions versus owner-managed Git. Correct planning prose before publication: every user-facing code block
  must use ordinary `git init`, `git add -- ...`, `git diff`, `git commit`, and `git show`. Never publish agent-only
  `rtk proxy git` commands. No automatic sync, credentials, remote URL, `git push`, whole-account restore promise, or new
  product UI.
- Use only synthetic data. Run API export/version tests specified by plan. Validate single-resume import round-trip using
  existing synthetic fixtures/tests or a bounded disposable test; never use private data.
- Execute command sequence in `mktemp -d`, staging only `resume.json` and `cover-letter.json`; show changed visible field in
  `git diff`. Executor shell may wrap validation with `rtk proxy`, but copied documentation commands must remain plain Git.
  Do not modify global Git config if identity missing; record limitation.
- Run plan's focused `rg`, markdown lint, `git diff --check`, and two-file name-only gate. Self-review every acceptance item.
- Commit with normal message. Leave branch local for independent review.

Write report `.orchestration/plan-09-implementation.md`: verified facts vs uncertainty, live state, drift, exact commit/files,
commands/results, fixture details, skipped gates, risks, issue coverage, PR status (`not created`). Final response: status,
commit, one-line tests, report path, concerns; at most ten lines.
