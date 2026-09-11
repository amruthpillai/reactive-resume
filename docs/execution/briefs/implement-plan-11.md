# Implement plan 11: JSearch removal and tailoring documentation

Read entire approved plan first from local planning checkout only when its HEAD equals
`a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d`; otherwise use pinned `git show` fallback below. Then read current worktree
`AGENTS.md`, referenced issue/domain instructions, relevant ADRs, `/Users/amruth/.codex/RTK.md`, and
`/Users/amruth/.agents/skills/documentation-writer/SKILL.md`. Plan supplies document type, audience, goal, scope, and approved
structure; do not pause for routine outline approval. Portable fallback: fetch PR #3455 and use
`git show a2557b2ad40e06e1e63eb655f286e6a78fe6bf0d:plans/11-job-search-policy.md`.

Do not spawn subagents. Do not touch coordinator ledger or another worktree. Do not merge, mutate issues, push, or create PR.

Required execution:

- Confirm clean worktree, fetch current `origin/main`, rename branch `codex/issue-3010-jsearch-docs`, run exact drift command,
  fetch live #3010 body/comments/state/linked PRs, and run root intent discovery before edits.
- Verify release history, current job-search redirect, agent tools, provider/model capability policy, and attachment UI before
  wording claims. Stop if release history contradicts removal attribution or documented UI steps do not exist.
- Modify only `docs/changelog/index.mdx`, `docs/guides/using-ai-agent.mdx`, and
  `docs/guides/ai-agent-tools.mdx`.
- Add factual v5.1.0 migration note, current controlled tailoring workflow using plan's exact synthetic job description, review
  and undo guidance, pasted/attached-content behavior, and live-search capability distinction. No unverified removal motive,
  paid JSearch restoration, stale model list, provider credentials, or promise that chat is equivalent structured search.
- Run exact API tool/capability tests and plan's focused `rg`, markdown lint, `git diff --check`, and three-file name-only gate.
  Record real-provider/browser workflow as optional unavailable validation when not run.
- Self-review every acceptance criterion. Commit with normal message. Leave branch local for independent review.

Write report `.orchestration/plan-11-implementation.md`: verified facts vs uncertainty, live state, drift, exact commit/files,
commands/results, skipped gates, risks, issue coverage, PR status (`not created`). Final response: status, commit, one-line
tests, report path, concerns; at most ten lines.
