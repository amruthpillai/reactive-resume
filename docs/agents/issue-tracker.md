# Issue tracker: GitHub

Issues and specs for this repo live as GitHub issues. Use the `gh` CLI for all operations.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `gh issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

When set to `yes`, PRs run through the same labels and states as issues, using the `gh pr` equivalents:

- **Read a PR**: `gh pr view <number> --comments` and `gh pr diff <number>` for the diff.
- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.
- **Comment / label / close**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`, `gh pr close`.

GitHub shares one number space across issues and PRs. Resolve bare `#42` with `gh pr view 42`, then fall back to `gh issue view 42`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `gh issue view <number> --comments`.

## Wayfinding operations

Used by `/wayfinder`. Map is one issue with child issues as tickets.

- **Map**: issue labelled `wayfinder:map`, holding Notes / Decisions-so-far / Fog. Create with `gh issue create --label wayfinder:map`.
- **Child ticket**: issue linked as a GitHub sub-issue. Where sub-issues are unavailable, add it to a task list in map body and put `Part of #<map>` atop child body. Labels: `wayfinder:<type>` (`research`, `prototype`, `grilling`, or `task`). Assign ticket to driving developer once claimed.
- **Blocking**: use GitHub native issue dependencies. Add with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where database ID comes from `gh api repos/<owner>/<repo>/issues/<n> --jq .id`. Where unavailable, use `Blocked by: #<n>, #<n>` atop child body.
- **Frontier query**: list map’s open children, drop assigned tickets and tickets with open blockers, then select first in map order.
- **Claim**: `gh issue edit <n> --add-assignee @me`.
- **Resolve**: comment with answer, close child, then append context pointer to map’s Decisions-so-far.
