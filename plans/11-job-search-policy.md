# 11 — Document JSearch removal and the current tailoring workflow

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05).  
**Status:** agent-selected documentation plan; ready for future execution. **Category:** docs.  
**Priority:** P2. **Effort:** 0.5 day documentation/history verification. **Risk:** Low: factual documentation only.  
**Issue:** [#3010](https://github.com/amruthpillai/reactive-resume/issues/3010).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'apps/web/src/routes/dashboard/settings/job-search.tsx' 'packages/api/src/features/agent/tools.ts' 'packages/api/src/features/ai/capabilities.ts' 'docs/guides/using-ai-agent.mdx' 'docs/guides/ai-agent-tools.mdx' 'docs/changelog/index.mdx'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Selected direction

**Agent judgment:** answer the original removal question in documentation and describe the current tailoring workflow. #3010 asks whether JSearch/RapidAPI was removed after v5.0.20; it does not authorize maintaining a new paid integration. No restoration, new provider settings or API credentials are included. This planning choice is not claimed as user approval for feature removal or a statement of the original maintainer's motivation.

No product question is needed for this factual documentation work. A later explicit request to restore job listings would need a separate investment/credential/quota plan.

## Current evidence and ownership

The issue reports JSearch present in v5.0.20 and missing in v5.1.1. A commenter links the v5.1.0 transition and guesses chat replaced it; do not repeat the guessed motivation as fact. Git history includes initial job-listings PR #2788 and v5.1.0 removal. Current `apps/web/src/routes/dashboard/settings/job-search.tsx` redirects to integrations.

`packages/api/src/features/agent/tools.ts` exposes provider-native `web_search` only when `supportsProviderNativeWebSearch` permits it. Otherwise instructions state live research is unavailable and ask for pasted or attached content while ordinary resume editing continues. `packages/api/src/features/ai/capabilities.ts` restricts native search to supported direct OpenAI configurations. This is not JSearch and does not provide its structured job-results API.

Modify only `docs/changelog/index.mdx`, `docs/guides/using-ai-agent.mdx`, and `docs/guides/ai-agent-tools.mdx`. Runtime route and API files are read-only evidence. Preserve integrations navigation, provider capability policy, ordinary tailoring without live research, saved credentials and all current defaults. Do not restore historical source or contact a paid API.

## Step-by-step changes and verification

1. Inspect the issue and relevant release history. **Verify:** `rtk proxy git log --oneline --all -- '*job-search*' '*jsearch*'` and `rtk proxy rg -n '5.1.0|JSearch|Job Listings' docs/changelog/index.mdx` identify the introduction and removal context. Use the current source excerpts below to verify the present route/tool state; no live provider credentials are needed.
2. Add a factual migration note to the v5.1.0 changelog entry: JSearch/RapidAPI job listings and their settings were removed in that transition; the old settings path now goes to integrations; resume tailoring can use a supplied job description in the agent. Do not state an unverified reason for removal, guarantee free live search, or describe a forthcoming restoration. **Verify:** `rtk proxy rg -n 'JSearch|RapidAPI|job description' docs/changelog/index.mdx` finds the new migration note next to the correct release, not only the historical introduction.
3. In the agent guide, provide a controlled step sequence: open a synthetic resume; configure/test/enable a supported AI provider through integrations; paste the text `Target role: backend engineer. Required: TypeScript and PostgreSQL.`; ask the agent to tailor existing experience without inventing qualifications; review changes and use existing history/undo if needed. Describe attached job descriptions only where the current attachment UI supports the format. **Verify:** `rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/agent/tools.test.ts src/features/ai/capabilities.test.ts` exits 0. These files passed within the planning 93-test combined run; a real provider/browser tailoring session is an additional future validation and must use synthetic content.
4. In the agent-tools guide, distinguish pasted-content tailoring from live web research. State that live research depends on the selected provider/model and that unsupported configurations can still edit from supplied content. Link to integrations and the revised agent guide using existing docs navigation paths. **Verify:** `rtk proxy rg -n 'provider|model|paste|search|JSearch' docs/guides/using-ai-agent.mdx docs/guides/ai-agent-tools.mdx` finds the explicit distinctions; compare names with `packages/api/src/features/ai/capabilities.ts` rather than adding a stale model list.
5. Validate all three documents and review only their diff. **Verify:** `rtk proxy pnpm exec markdownlint-cli2 --no-globs docs/changelog/index.mdx docs/guides/using-ai-agent.mdx docs/guides/ai-agent-tools.mdx` and `rtk proxy git diff --check` exit 0. `rtk proxy git diff --name-only` lists only these approved docs. No new runtime tests are required merely to mirror documentation text.

## Acceptance, stop conditions, and maintenance

The user can find an explicit answer to "was JSearch removed?", knows that the old settings route goes to integrations, and has an accurate current tailoring workflow. Unsupported providers are never described as having live search. The docs do not claim that JSearch has been restored or that a maintainer intended chat as a complete equivalent.

Planning verification: relevant agent/capability tests passed in the combined 7-file/93-test API run; API/server/auth/DB types and boundaries passed. Actual paid search/provider endpoints and browser tailoring were not exercised. If live workflow verification is unavailable, report that narrow limit while still completing factual source-backed documentation.

STOP and report if release history contradicts the current removal attribution, documented UI steps do not exist, or the request changes to restoring a paid service. For a future restoration proposal, first specify integration ownership, disabled-by-default configuration, credential encryption, quotas, 429/timeouts, result schema, owner isolation and untrusted job-content handling. Those are explicitly deferred because this issue's current question can be answered without new runtime behavior. Maintain the migration note and capability wording as routes and supported providers change.

## Documentation command baseline

Direct `pnpm exec markdownlint-cli2 --no-globs` inspection of the seven existing recovery/export/history/agent documentation files passed with zero issues during this planning revision. No documentation outside this plan file was edited. The new documentation steps must rerun their exact smaller file lists after changes.

## Exact current source anchors

`apps/web/src/routes/dashboard/settings/job-search.tsx:1`:

```ts
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings/job-search")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/settings/integrations", replace: true });
	},
});
```

`packages/api/src/features/agent/tools.ts:35`:

```ts
	if (!supportsProviderNativeWebSearch(provider)) return {};

	const openai = createOpenAI({
		apiKey: provider.apiKey,
		...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
	});

	// Defensive runtime check: older `@ai-sdk/openai` versions and some OpenAI-compatible
	// gateways don't expose tools.webSearch. supportsProviderNativeWebSearch() filters out
	// non-OpenAI providers, but this guards against SDK-shape drift on the OpenAI path.
	if (typeof openai.tools.webSearch !== "function") return {};

	return {
		web_search: openai.tools.webSearch({
			searchContextSize: "low",
```

`packages/api/src/features/agent/tools.ts:60`:

```ts
	if (!hasProviderNativeSearch) {
		return `${baseInstructions} Live web research is unavailable with the selected provider or model. If the user asks you to browse, search the web, fetch a URL, or use current online context, briefly tell them live web research is unavailable with the selected provider/model and ask them to paste or attach the relevant content. Continue normal resume editing using the resume, chat context, and attachments.`;
	}

	return `${baseInstructions} Use web_search for live or current web research, including user-provided public URLs, job descriptions, company pages, and recent company, industry, or role context.`;
```

