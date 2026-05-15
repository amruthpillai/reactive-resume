# ADR 0001: Workspace Boundaries

## Status

Accepted

## Context

Reactive Resume had package and app code arranged mostly by technical layer. Some server runtime code imported files from the web app source tree, resume-domain behavior lived in generic utilities, API implementation was split across package-root routers/services/helpers, and browser PDF preview code sat near React PDF generation code.

That made debugging harder because a feature's route, service, domain behavior, tests, and runtime adapter could be spread across unrelated folders. It also made package boundaries implicit, so regressions such as app-to-app source imports were easy to reintroduce.

## Decision

Use a domain-first monorepo structure with executable boundaries.

- Keep deployable apps in `apps/web` and `apps/server`.
- Keep runtime and domain capabilities in focused internal packages.
- Source-consume internal packages through package export maps.
- Forbid cross-workspace private `src` imports and repository-path imports.
- Use `packages/api/src/features/*` for API features instead of root technical-layer folders.
- Use explicit browser/server package subpaths for runtime-specific code.
- Enforce package direction with `turbo boundaries`.
- Enforce source-path import rules with Biome `noRestrictedImports` and the local GritQL plugin in `tooling/grit/no-cross-workspace-src-imports.grit`.

## Consequences

New code needs an owner before it gets a folder. That adds a little up-front friction, but it makes debugging paths predictable.

Feature-owned API modules can still share code, but shared code needs a named capability and an intentional package export.

The Turbo tag set is coarse by design. It blocks the current high-risk edges first: package-to-app imports, server-to-browser runtime imports, and universal/domain packages depending on server/app layers. More granular rules can be added as package roles settle.

The root shared Vitest config remains an intentionally ignored boundary edge for now. Moving it behind a package export is a separate test-infrastructure cleanup.

## Rejected Alternatives

Keep the old technical-layer API layout: rejected because it kept feature behavior split across routers, services, and helpers.

Move every web feature into packages: rejected because route-owned UI and browser-only behavior are easier to evolve inside the web app until they are genuinely reusable.

Put PDF.js viewer code in `packages/pdf`: rejected because `packages/pdf` owns React PDF generation, while PDF.js viewer/canvas behavior is browser UI.

Use documentation-only boundaries: rejected because the previous issue was not lack of intent; it was lack of executable enforcement.
