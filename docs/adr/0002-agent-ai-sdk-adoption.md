# ADR 0002: Agent AI SDK Adoption

## Status

Proposed

## Context

The `/agent` workspace (and the builder's in-resume assistant) is a single `ToolLoopAgent` loop in `packages/api/src/features/agent/service.ts` with four tools, resumable Redis streams, Postgres-persisted `UIMessage` history, and snapshot-based undo.

LangGraph was evaluated and rejected: everything it would add (loop control, persistence, resumability, interrupts) is already built here on the AI SDK. This work instead adopts more of the AI SDK v7 surface (`ai@7.0.66`, already installed) to fix real defects and add the features it makes cheap, plus shadcn's `@shadcn/helpers` ai-sdk fixture library (a deterministic scripted `ChatTransport` for `useChat` — a testing harness, not a runtime HITL implementation) for backend-free UI tests.

Defects driving this:

1. Unbounded context growth — every turn replays the full thread, including every full-resume `read_resume` dump; long threads will exceed model context and permanently break.
2. Stale-resume editing — `apply_resume_patch` returns only metadata; subsequent JSON Patch array indexes can silently target wrong items after removes/moves.
3. Crash-unsafe runs — patches commit immediately but the assistant message persists only in `onFinish`; process death orphans applied edits; a stuck `activeRunId` (no reaper; `activeRunStartedAt` written, never read) permanently CONFLICTs the thread.
4. Client-trusted cancellation — `messages.stop` persists a client-authored `partialMessage`.
5. Weak validation — `isUiMessage` checks three fields; arbitrary `parts` get persisted and replayed.
6. No run guards — no timeout, `maxRetries`, or `maxOutputTokens` on the run.
7. Invisible tool activity — `tool-read_resume`/`read_attachment`/`web_search`/`dynamic-tool` parts render as nothing; the patch card is a raw `JSON.stringify` dump; zero token-usage visibility.
8. Latent bug found during design: on an `ask_user_question` continuation, `toUIMessageStream({originalMessages})` continues the existing assistant message (same `uiMessage.id`) but `persistMessage` is insert-only, producing duplicate rows sharing one message id. Fixed by the Phase 1 upsert; regression-tested.

Verified API surface from published `ai@7.0.66` and `@ai-sdk/react@4.0.69` typings and docs: `prepareStep` and `pruneMessages`; tool-level `needsApproval`, call-level `toolApproval`, `experimental_toolApprovalSecret` (HMAC-signs approval requests); UIMessage tool-part states `approval-requested`/`approval-responded`/`output-denied`; `lastAssistantMessageIsCompleteWithApprovalResponses`; `useChat().addToolApprovalResponse`; `validateUIMessages`/`safeValidateUIMessages`; `repairToolCall`; tool `inputExamples` plus `addToolInputExamplesMiddleware`; `messageMetadata` on `toUIMessageStream` (plus `messageMetadataSchema` on `useChat`); `onStepEnd`; `ToolLoopAgentSettings` extends `LanguageModelCallOptions` so `timeout`/`maxOutputTokens`/`maxRetries` are valid in the constructor; `smoothStream` passed as `agent.stream({ experimental_transform })`; `useChat` `throttle`; `isStepCount`; `InferAgentUIMessage`; `LanguageModelUsage` with cache read/write detail; `totalUsage` on finish events.

Constraints the implementation must respect:

- `getAgentModel` silently switches to the OpenAI Responses API for direct-OpenAI web-search models — every model-facing change is QA'd on both a Responses and a chat-completions provider.
- Abort reasons must be `DOMException(label, "AbortError")`; `AbortSignal.timeout()`/`AbortSignal.any()` produce `TimeoutError` and would crash the resumable-stream pump, so the run timeout uses `setTimeout` plus `controller.abort(abortReason("RUN_TIMEOUT"))`.
- The `activeRunControllers` map is single-process; multi-process abort (Redis pub/sub) is explicitly out of scope.
- `service.test.ts` mocks the whole `"ai"` module with a closed factory and scripts DB queries positionally; the test harness is migrated first (Phase 1.0).
- Shared contracts live in `packages/ai` (runtime-universal per ADR 0001): zod-only runtime, `import type` from `"ai"` only, with `ai` added to devDependencies.
- No new environment variables anywhere in this plan (the approval secret derives from `ENCRYPTION_SECRET`), so `turbo.json` `globalEnv` stays untouched.
- `resumeService.patchInTransaction` already accepts `expectedUpdatedAt` and throws `RESUME_VERSION_CONFLICT`; the agent tool just passes it.
- Legacy persisted rows must never hard-fail: validation happens only at the network boundary (schema-less), and the metadata schema is loose and optional.
- Lingui macros for all new user-facing copy; Base UI `render` prop (no Radix `asChild`); `cn` from `@reactive-resume/utils/style`; toasts via `toast.add`.

## Decision

Adopt the AI SDK v7 surface in three phases on top of the existing loop, rather than introducing a graph framework.

### Phase 1 — correctness

Order: 1.0 → 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 (spine: 1.3 → 1.4 → 1.5; 1.6 last because it changes model-visible behavior).

- **1.0 Test-harness prep (no behavior change).** Replace the closed `vi.mock("ai")` factory with a spread-actual factory so pure helpers (`isStepCount`, `safeValidateUIMessages`, `pruneMessages`, `JsonToSseTransformStream`) stay real and only the scripted seams (`convertToModelMessages`, `ToolLoopAgent`) stay mocked. Adopt the rule that new DB queries on the send path go into separate injectable modules (the `runs.ts` pattern) and are module-mocked wholesale. Gate: suite green with zero source changes.
- **1.1 Run guards, snapshot consistency, misc.** `createAgent` adds `maxOutputTokens: 8_192`, `maxRetries: 2`, `timeout: 120_000` (per provider request). Whole-run wall clock: after run claim, `setTimeout(() => controller.abort(abortReason("RUN_TIMEOUT")), 600_000)`, handle stored in a module map keyed by runId and cleared in `cleanupActiveRun`. `applyResumePatch` passes `expectedUpdatedAt` to `patchInTransaction` and rethrows `RESUME_VERSION_CONFLICT` as a recoverable tool error. `readAttachment` uses a named `MAX_ATTACHMENT_TEXT_CHARS` constant.
- **1.2 Real message validation at the send boundary.** Keep `isUiMessage` as the sync oRPC gate; inside `messages.send`, run `safeValidateUIMessages({ messages: [input.message] })` before `claimActiveAgentRun` and return BAD_REQUEST on failure. Deliberately schema-less so provider-echoed parts pass and replayed history is never re-validated.
- **1.3 Crash-safe incremental persistence (draft row).** New `messages-persistence.ts` (injectable DB): `applyStepToUiMessage` (pure fold), `insertDraftAssistantMessage`, `upsertAssistantUiMessage` (by row id, then by `uiMessage->>'id'`, then insert), `deleteDraftIfEmpty`. The service pre-generates the response message id, inserts a draft before `agent.stream`, folds and upserts on `onStepEnd` (≤30 writes/run), and upserts the SDK's authoritative message with `completed|canceled` in `onFinish`. `apply_resume_patch` threads `toolCallId` through and sets `agentAction.messageId` at INSERT time. The upsert also fixes the duplicate-row continuation bug (defect 8).
- **1.4 Server-side cancellation.** `messages.stop` drops `partialMessage` persistence; the body aborts with `abortReason("USER_STOPPED")`, clears the timeout handle, and clears the run claim. Partial content persists server-side via `onFinish({isAborted: true})`. The router keeps `partialMessage` in the input schema for one release (deprecated, ignored).
- **1.5 Stale-run reaper.** `STALE_AGENT_RUN_TTL_MS = 15 * 60_000` (greater than the run timeout, so live runs always die by their own timeout first; deliberately TTL-only and multi-replica-safe). Wired at server boot, lazily in `messages.send` before the CONFLICT throw, and at the top of `threads.get`. Reap conditionally clears run columns and flips `streaming` draft rows to `canceled`, appending synthetic `tool-apply_resume_patch` parts rebuilt from action rows so replayed history stays provider-valid. Applied actions stay applied — they are real committed edits, individually revertable.
- **1.6 Context growth: fresh-document patch output plus pruning.** `applyResumePatch` returns the full post-patch document plus `changedPaths`, with a tool description telling the model to base further patches on it. New pure `context.ts`: `AGENT_CONTEXT_TOKEN_BUDGET = 40_000`, `estimateTokenCount` (chars/4), `pruneAgentModelContext`. `createAgent` gains `prepareStep` wiring so pruning runs every loop step.

Pruning tiers (all pure, wired via `prepareStep`):

- Tier 0, always: supersede resume snapshots — every `read_resume` result and every patch result's embedded `resume` except the last in the conversation becomes a stub note. A stale snapshot is actively harmful (shifted indexes), so this runs even in short threads; exactly one full snapshot survives, positioned where the model last acted.
- Tier 1, over budget: strip reasoning from all but the last assistant message.
- Tier 2, still over: collapse oldest tool call/result pairs (never orphan one side — several BYOK gateways reject unpaired tool messages) into one-line stubs, excluding the last assistant message, unresolved question/approval parts, and the surviving snapshot.
- Tier 3, last resort: attachment parts on non-latest user messages become stubs teaching the `read_attachment` recovery path.
- Never pruned: instructions, latest user message, last assistant message, unresolved interactive parts.

Full-document patch output was chosen over a `prepareStep`-injected "current resume" reminder because a reminder re-sends a snapshot every step, defeats provider prompt caching, and splits authority into two places; a summarized view invites hallucination and forces a `read_resume` round-trip per edit against a 30-step cap. Output plus Tier 0 bounds cost: N patches do not produce N surviving snapshots.

### Phase 2 — human-in-the-loop approvals

Order: 2.1 contracts → 2.2 migration/endpoint → 2.3 tool+secret → 2.4 merge/continuation → 2.5 UI → 2.6 tests.

- **2.1 Shared typed tool contracts in `packages/ai`.** New `agent-tool-contracts.ts` with zod schemas for tool inputs/outputs and a loose all-optional message metadata schema, plus `AgentTools`/`AgentUIMessage` types. `"ai"` goes in devDependencies, `import type` only; zod stays the only runtime import.
- **2.2 Migration plus thread setting.** `reviewPatches: boolean, default false` on `agentThread` (the plan's only migration), a `threads.update` procedure, and the flag in `toThreadSummary`. Auto-apply stays the default.
- **2.3 `needsApproval` plus HMAC secret.** `getAgentToolApprovalSecret()` derives `sha256(ENCRYPTION_SECRET + ":agent-tool-approval")` — domain-separated from the AES key, no new env var, and deterministic so a signature minted at halt verifies at continuation even across a restart. `buildAgentTools` gains `requirePatchApproval`; `createAgent` reads `thread.reviewPatches` and passes `experimental_toolApprovalSecret`.
- **2.4 Merge generalization plus continuation.** Extract the tool-response merge into `messages-merge.ts` as `mergeClientToolResponses`, handling both `ask_user_question` outputs and `approval-responded` parts in one pass. `{0,0}` maps to BAD_REQUEST, `{0,>0}` to CONFLICT("already handled") before claiming a run.
- **2.5 Client: approval UI, composed auto-send, `useConfirm`.** `sendAutomaticallyWhen` composes `lastAssistantMessageIsCompleteWithToolCalls` with `lastAssistantMessageIsCompleteWithApprovalResponses`. New `patch-approval-card.tsx` (web feature, not `packages/ui`) renders `approval-requested` with Approve/Deny plus optional reason, and `output-denied` as a muted declined card. A "Review edits" toggle lands in the thread menu. `window.confirm` is replaced with the existing `useConfirm()`.
- **2.6 Approval-flow tests with `@shadcn/helpers`.** Component tests for the card, plus a small harness wiring `useChat` to the scripted transport to exercise the composed auto-send and approval state machine with no backend. `AgentChat` is not refactored to accept a transport prop just for tests.

Approval flow end-to-end: the halt leaves no active run (identical lifecycle to today's `ask_user_question` halt); the client resubmits the last assistant message byte-for-byte through the existing transport; the merge copies approval-response fields onto the stored, signed request part matched by `toolCallId` plus approval id, so a client cannot substitute a forged request; the continuation run replays history, the fresh agent derives the same secret, the signature verifies, and the SDK executes (or denies) the call, streaming into the same message id via the 1.3 upsert — which is load-bearing, so 1.3 ships before 2.4. Idempotency ladder: UI disables buttons on state flip → concurrent sends race the atomic `claimActiveAgentRun` → post-completion resubmits match `alreadyResolved` and CONFLICT before any run is claimed → conflicting approved values are BAD_REQUEST.

### Phase 3 — visibility and polish

- **3.1 Usage metadata.** `messageMetadata` on `toUIMessageStream` records `{usage, model}` on finish; it round-trips in the `uiMessage` jsonb with no migration. The client renders a muted per-message token footer and a per-thread aggregate; legacy rows without metadata render fine.
- **3.2 Render the invisible parts plus a real patch card.** New generic `tool-part-card.tsx` (collapsed icon/label/state card with expandable input/output) for `read_resume`/`read_attachment`/`web_search`/`dynamic-tool`; the patch card gains human-readable operation rows with raw JSON demoted to a nested `details` block; consecutive `source-url` parts group into one sources block.
- **3.3 Streaming performance.** `useChat({throttle: 50})`, memoized markdown/message components, and `smoothStream({chunking: "word"})` via `experimental_transform`.
- **3.4 Tool-input robustness.** `inputExamples` on `apply_resume_patch` plus `addToolInputExamplesMiddleware`; a `repairToolCall` callback (`repair.ts`) that runs `jsonrepair`, strips `/data` prefixes and section shortcuts, and re-validates against the shared schema, falling back to the SDK re-ask on `null`. `normalizeAgentResumePatchOperations` stays as last-line defense; the instructions blob shrinks accordingly.
- **3.5 Structured logging plus provider options.** One JSON line per step (`agent.step`) and per tool execution (`agent.tool`) — greppable structured console, no OpenTelemetry dependency. Optionally `anthropic.cacheControl: ephemeral` on the instructions block.

### Crash-safety design: draft-row upsert over reconciliation-on-read

The failure that matters is a patch committed plus process death before `onFinish`. Reconciliation would synthesize an assistant message from action rows, but a synthesized message has no model-authored text and no tool call/result pairing that replays validly. The draft row records the real transcript step-by-step (≤30 single-row jsonb upserts per run); a patch executes within a step, so the orphan window shrinks from "entire run" to milliseconds. It also subsumes server-side cancellation partials, `agentAction.messageId` at INSERT time, and the duplicate-row continuation bug. The reaper covers the remaining sliver by appending synthetic tool parts from action rows during reap.

## Consequences

- Long threads stop growing without bound; exactly one resume snapshot survives in model context, and patch results carry the fresh document so array indexes never go stale.
- Runs are bounded (per-request timeout, whole-run wall clock, output-token cap, retry cap) and crash-safe (draft-row persistence, boot/lazy/read-path reaping); cancellation is server-authored.
- Users can opt threads into edit review; approvals are HMAC-signed server-side and survive restarts.
- Tool activity, token usage, and patch contents become visible in the UI; streaming is smoother and cheaper to render.
- The send path gains real message validation without breaking legacy rows.
- Test coverage moves toward pure, mock-free modules; the `"ai"` mock keeps real helpers.
- An approval continuation costs a second `send` against the in-process rate limit (20/min) — acceptable, noted for tuning.

Out of scope, documented as follow-ups: multi-process cancellation via Redis pub/sub; OpenTelemetry; removing the deprecated `partialMessage` input (next release); the legacy non-agent `chat()` in `ai/service.ts`; thread-title generation via a cheap model call.

## Rejected Alternatives

LangGraph: rejected — loop control, persistence, resumability, and interrupts are already built here on the AI SDK; a graph framework would add a dependency and a second orchestration model without removing any existing code.

`prepareStep`-injected "current resume" reminder instead of full-document patch output: rejected — re-sends a snapshot every step, defeats provider prompt caching, and splits document authority.

Reconciliation-on-read instead of draft-row persistence: rejected — synthesized messages replay invalidly against providers that require call/result pairing.

Random per-boot approval secret: rejected — it would strand pending approvals across restarts; the deterministic derivation from `ENCRYPTION_SECRET` keeps signatures verifiable.

New environment variable for the approval secret: rejected — derivation avoids env, `turbo.json`, and deployment churn.
