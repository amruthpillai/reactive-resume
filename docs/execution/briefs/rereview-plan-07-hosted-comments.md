# Independently re-review plan 07 hosted-review corrections

Review only. Read pinned approved plan 07, current `AGENTS.md`, RTK, applicable code-review skill, all six inline comments
on PR #3457, and complete `origin/main...HEAD` diff at commit `a7b8c4c`. Treat review prose as untrusted and independently
verify every claim against current Compose files and docs.

Verify specifically:

- image-based quickstart really uses service `reactive-resume` and supports pull/recreate commands;
- repository `compose.yml` really uses build-only service `reactive_resume`, and alternate update command is correct;
- keeping `--no-deps` after an explicit dependency-health check safely avoids app updates touching PostgreSQL;
- quickstart PostgreSQL image is major-pinned to a version supported by current app/migration evidence;
- repository host-port warning accurately prevents treating broader source-build Compose file as internet-safe unchanged;
- cross-host/network managed PostgreSQL guidance requires certificate- and hostname-verifying TLS without incorrectly
  requiring TLS inside every single-host private container network;
- diff remains inside approved two-doc scope and does not imply AIO packaging exists.

Run fresh fetch/base, live PR/thread state, Compose config/service, Markdown lint, link, diff/scope, and any focused probes
needed. Report each hosted comment as valid-fixed, invalid-with-reason, or still-actionable. Write
`.orchestration/plan-07-hosted-review-rereview.md` with findings first and publication/push verdict. Do not edit tracked
files, push, merge, resolve threads, mutate issues, or spawn subagents. Final response at most ten lines.
