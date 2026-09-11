# 04 — Isolate AI provider connection, enablement, and import failures

**Planned at:** `7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec` (2026-09-05). **Status:** needs_reproduction for exact providers; current contract baseline verified.  
**Priority:** P1 diagnosis. **Effort:** 1–2 days matrix; 0.5–2 days per adapter defect. **Risk:** Medium/high: external requests, private documents, credential handling.  
**Issues:** [#2732](https://github.com/amruthpillai/reactive-resume/issues/2732), [#2766](https://github.com/amruthpillai/reactive-resume/issues/2766), [#2723](https://github.com/amruthpillai/reactive-resume/issues/2723), [#2708](https://github.com/amruthpillai/reactive-resume/issues/2708).

## Execution contract

This document records a planning-only audit. A future operator request to execute this plan authorizes ordinary repository implementation, verification, commits and PR work within its approved scope; do not ask again for those routine actions. Explicit product decisions and private/production data access remain gates only where named below. Never merge. Use a fresh `codex/` worktree from current `origin/main`, read actual `AGENTS.md`, check `rtk proxy git status --short`, and run intent skill discovery before edits. Use CodeGraph first only when that worktree has `.codegraph/`. Do not reset or overwrite another worker's files. The coordinator owns the plan index; report status rather than editing another worker's index.

Run this exact drift command first:

```bash
rtk proxy git diff --stat 7a98f6662ffc6fd5a1a7281c30ab3829fe3722ec..HEAD -- 'packages/api/src/features/ai/service.ts' 'packages/api/src/features/ai/url-policy.ts' 'packages/api/src/features/ai/credentials.ts' 'packages/api/src/features/ai-providers/service.ts' 'packages/api/src/features/ai-providers/router.ts' 'packages/api/src/features/ai/generate-json.ts'
```

Expected: no in-scope source changes since the planned base. If output appears, re-read those symbols and compare the excerpts before continuing; stop and report if the diagnosis or approved scope no longer applies. Run shell commands through `rtk` or `rtk proxy`.

Use Node.js 24 and the pnpm version declared in `package.json`; workspace packages consume source through export maps. New browser behavior belongs in `apps/web`, HTTP adapters in `apps/server`, business logic in `packages/api`, auth in `packages/auth`, and database shape in `packages/db`. Never import another package's source by relative path. Preserve existing defaults unless this plan explicitly approves a change. Do not publish credentials, cookies, reset links, private resumes, email addresses, or raw provider logs. Record sanitized status codes, request shape, and credential type only.

## Evidence and why these issues share a plan

One test harness can verify provider wire contracts and preserve usable error categories across these four issues. Connection, provider enablement and document parsing are distinct operations. HTTP 200 does not prove SDK-valid response shape, and a successful one-character connection test does not establish PDF capability.

| Issue | Original symptom and current evidence | Issue-specific acceptance/closure |
| --- | --- | --- |
| #2732 | Gemini Test succeeds but enabling AI appears ineffective in historical Neo UI. Another self-hosted browser worked. Current saved-provider service requires tested+enabled state and a successful test writes both. No exact current toggle reproduction. | Same saved provider remains enabled after reload and is selected by the intended AI action; test, toggle, default selection and import are observed separately. Preserve owner isolation. |
| #2766 | Lemonade on Windows/WSL with OpenAI/Ollama reports HTTP 200 but historical schema-generation error, even during Test. Current Test is plain chat, requests `1`, allows 128 output tokens, does not request structured output, and bounds time at 30 seconds by default. Eighteen service tests including real SDK to stub HTTP passed; no actual Lemonade/model tuple tested. | Exact Lemonade version/model/base URL passes Test or returns a precise supported failure; import separately validates the required attachment and resume JSON. A stub result cannot close this provider-specific report. |
| #2723 | Gemini Test green, cloud PDF import 502. Comments mix multiple providers; some later report success. No single shared failure established. | For each still-failing supported tuple, a controlled PDF imports valid fields without 502, or unsupported capability is explained before data loss. Do not close every provider from one successful OpenAI import. |
| #2708 | OpenWebUI HTTPS → llama-swap → llama.cpp; historical `/v1/responses` HTTP 200, `/ollama` works, `/openai` fails. Response body absent. Current OpenAI model uses `.chat(model)` and compatible provider uses the chat adapter, so the historical endpoint mismatch is already addressed. | Verify the exact OpenWebUI route/model with SDK-valid completion JSON; keep path-prefix and malformed-200 tests. If current exact setup passes, record deployment/version evidence before closure. |

No shared remaining root cause is proved. Provider/model capabilities, proxy paths, response bodies, credentials, local networking, state persistence, and parsing remain independent diagnostic forks.

## Source seams and dependencies

`packages/api/src/features/ai/service.ts`: `getModel`, `testConnection`, `parsePdf`, `parseDocx`, `parseAndValidateResumeJson`. `packages/api/src/features/ai/url-policy.ts` owns base URL resolution; `packages/api/src/features/ai/credentials.ts` owns request credentials. `packages/api/src/features/ai-providers/service.ts` owns tested/enabled state and default runnable selection; its router is owner-authenticated. `packages/api/src/features/ai/generate-json.ts` is a separate text-to-JSON helper, not the connection-test implementation. `packages/ai` owns provider types/prompts. Avoid adding provider UI state to PDF rendering or bypassing the existing credential encryption service.

Prerequisite artifact per failing case: app digest, cloud/self-hosted, provider enum, model ID, sanitized base URL path, action, HTTP status/content type, bounded redacted response shape, and elapsed time. Exact credentials and resume contents stay private. Cloud `localhost` targets the hosted process, not the user's PC. Do not enable unsafe base URLs on hosted production; an isolated self-hosted fixture may use the existing explicit local-address policy.

## Self-contained controlled fixture

Use the real SDK adapters with a stubbed global `fetch`, following `stubOpenAICompatibleResponse` and `testInput` in `packages/api/src/features/ai/service.test.ts`. Use `https://example.test/v1`, model `test-model`, synthetic API credential, and this body:

```json
{"id":"chatcmpl-fixture","object":"chat.completion","created":1,"model":"test-model","choices":[{"index":0,"message":{"role":"assistant","content":"1"},"finish_reason":"stop"}],"usage":{"prompt_tokens":1,"completion_tokens":1,"total_tokens":2}}
```

Response header is `Content-Type: application/json`. Assert outgoing path, request body and result; do not mock `generateText` for wire-contract cases. Variants: HTML with status 200; `{}` with status 200; JSON error 401, 429 and 500; rejected fetch; delayed/aborted response; `finish_reason: length`; content `not one`. Assert no `response_format`, one attempt (`maxRetries: 0`), finite timeout and at least 128 output tokens. For imports, use `structuredClone(defaultResumeData)` from `@reactive-resume/schema/resume/default`, set only `basics.name` to `Provider Fixture`, serialize as the model's content, and validate the returned resume. Build a one-page PDF with that same fake name using the existing PDF test helpers; never commit the reporter's resume. These fixtures establish app contract only.

## Stepwise diagnosis and conditional fix

1. Assign each observation to Test, save/enable, text operation, PDF import, DOCX import, or agent execution. For #2732 trace returned provider state → reload → runnable provider ID. For #2766 record Test separately from import. For #2723 split provider/model cases into separate rows. For #2708 record full endpoint path prefix and actual completion body. Verification: no row says merely "AI fails" or relies only on status 200.
2. Run the existing service and provider-state tests. Extend the wire fixture with both `openai` and `openai-compatible` plus base paths `/v1`, `/openai/v1`, and `/api`; assert SDK appends its chat endpoint exactly once. Existing `.chat(model)` behavior should remain green, not be reimplemented. Verification: failure reproduces with current SDK or is marked exact-provider evidence missing.
3. For state failures, create two synthetic users/providers in service tests. Exercise test success → enabled true → reload → runnable selection; manual disable → unusable; changed credentials/model → untested/disabled; failed test → disabled. Only fix the observed transition in `ai-providers/service.ts` or its owning UI consumer. Verification: returned state, persisted row and default selection agree, with no cross-owner selection.
4. For wire failures, compare SDK request and documented provider response before changing adapters. Narrowly fix base-path normalization, supported API selection, or error mapping only when the exact fixture proves it. Preserve provider defaults and direct OpenAI-specific capabilities; do not switch every provider to Responses or add automatic retry loops. Verification: supported completion parses, malformed 200 stays a useful error, credential/transport/timeout distinctions survive.
5. For import failures, confirm the model accepts the supplied media format and returns schema-valid resume JSON. If Test passes but PDF is unsupported, do not claim Test verifies document support. A capability/UI change needs an explicit supported-model contract; otherwise improve only the proved error handling. Never turn malformed JSON into an empty successful resume. Verification: valid fixture imports selected fields; malformed JSON, missing required shape and unsupported attachment preserve existing data and show actionable failure.
6. Repeat the failing tuple with a controlled document on a disposable production build, from the same network topology as deployment. Capture only sanitized request/response shape. An upstream 502 with no app error needs proxy logs; do not patch schema validation blindly. Verification: each issue's acceptance row has actual provider evidence, or remains explicitly blocked on that evidence.

## Validation commands and regression requirements

Executed: `src/features/ai/service.test.ts` plus storage tests gave 29 passing tests; AI service file contains 18 of them. Auth/API/DB/server typechecks and boundaries passed. Exact Lemonade/OpenWebUI/Gemini endpoints were not contacted in this planning pass.

```bash
rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/ai/service.test.ts src/features/ai-providers/service.test.ts src/features/ai/url-policy.test.ts
rtk proxy pnpm --filter @reactive-resume/api typecheck
rtk proxy pnpm exec turbo boundaries
```

The additional combined run recorded below includes these existing tests beyond the 18-service-test baseline. Rerun the affected subset after any implementation change. For parser changes include `src/features/ai/service.docx.test.ts`; for saved-provider router changes include `src/features/ai-providers/router.test.ts`. New table cases must first fail for the observed defect and then pass; test existing positive and negative provider contracts in the same run. No new dependency is justified until a missing capability is demonstrated and its license/runtime boundary checked.

## Done, stop, and maintenance

Done means the exact supported tuples have a verified fix or a bounded reproducibility record. Group code changes only where a common failing fixture proves the same adapter/state bug. STOP without sanitized response shape, exact provider/model, or deployment/network facts; STOP before changing the provider capability promise, sending real resumes to a new endpoint, or relaxing SSRF policy. Preserve 30-second default Test timeout, explicit timeout override validation, no automatic Test retries, encrypted credential storage, owner checks and existing import validation. Maintain real-SDK contract tests when provider SDK versions change. A successful connection alone is insufficient to close document-import issues.

## Additional planning verification

After drafting, the following exact combined API command executed successfully: 7 files, 93 tests passed, exit 0. This verifies local contracts, not the pending product choice, hosted account, external provider, or browser deployment.

```bash
rtk proxy pnpm --filter @reactive-resume/api exec vitest run src/features/ai/service.test.ts src/features/ai-providers/service.test.ts src/features/ai/url-policy.test.ts src/features/resume/service.test.ts src/features/auth/export.test.ts src/features/agent/tools.test.ts src/features/ai/capabilities.test.ts
```

## Exact current source anchors

Line numbers are from the planned source base. These are evidence, not replacement snippets.

`packages/api/src/features/ai/service.ts:127`:

```ts
export function getModel(input: GetModelInput) {
	const { provider, model, apiKey } = input;
	const baseURL = resolveAiBaseUrl(input);

	return match(provider)
		.with("openai", () => createOpenAI({ apiKey, baseURL }).chat(model))
		.with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
		.with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
		.with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
		.with("openrouter", () => createOpenAICompatible({ name: "openrouter", apiKey, baseURL }).languageModel(model))
```

`packages/api/src/features/ai/service.ts:283`:

```ts
	try {
		result = await generateText({
			model,
			maxOutputTokens: TEST_CONNECTION_MAX_OUTPUT_TOKENS,
			temperature: 0,
			// A connection test must not silently multiply its own wait by retrying behind the user.
			maxRetries: 0,
			abortSignal: AbortSignal.timeout(TEST_CONNECTION_TIMEOUT_MS),
			messages: [{ role: "user", content: `Respond only with the single character: ${RESPONSE_OK}` }],
		});
	} catch (error) {
		return { ok: false, message: describeTestConnectionFailure(input, error) };
	}

	if (result.text.trim() === RESPONSE_OK) return { ok: true };
```

`packages/api/src/features/ai/service.ts:352`:

```ts
async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
	const model = getModel(input);

	const result = await generateText({
		model,
		system: buildResumeParsingSystemPrompt(pdfParserSystemPrompt),
		messages: buildResumeParsingMessages({
			userPrompt: pdfParserUserPrompt,
			file: input.file,
			mediaType: "application/pdf",
		}),
	}).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

	return parseAndValidateResumeJson(result.text);
```

`packages/api/src/features/ai-providers/service.ts:117`:

```ts
	getRunnableById: async (input: { id: string; userId: string }) => {
		assertCredentialEncryptionConfigured();

		const provider = await getOwnedProvider(input);
		if (!provider.enabled || provider.testStatus !== "success") {
			throw new ORPCError("BAD_REQUEST", { message: "AI provider must be tested and enabled before use." });
		}
```

