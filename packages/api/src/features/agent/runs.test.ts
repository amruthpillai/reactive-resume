import type { UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";

vi.mock("@reactive-resume/db/client", () => ({ db: {} }));

const { appendMissingActionParts, isStaleAgentRun, reapStaleAgentRun, STALE_AGENT_RUN_TTL_MS } = await import("./runs");

const NOW = new Date("2026-08-20T12:00:00.000Z");

function minutesBefore(minutes: number) {
	return new Date(NOW.getTime() - minutes * 60_000);
}

describe("isStaleAgentRun", () => {
	it("is false without an active run", () => {
		expect(isStaleAgentRun({ activeRunId: null, activeRunStartedAt: null }, NOW)).toBe(false);
	});

	it("is false while the run is younger than the TTL", () => {
		expect(isStaleAgentRun({ activeRunId: "run-1", activeRunStartedAt: minutesBefore(14) }, NOW)).toBe(false);
	});

	it("is true once the run outlives the TTL", () => {
		expect(isStaleAgentRun({ activeRunId: "run-1", activeRunStartedAt: minutesBefore(16) }, NOW)).toBe(true);
		expect(STALE_AGENT_RUN_TTL_MS).toBe(15 * 60_000);
	});

	it("treats a legacy claim without a start timestamp as stale", () => {
		expect(isStaleAgentRun({ activeRunId: "run-1", activeRunStartedAt: null }, NOW)).toBe(true);
	});
});

function buildAction(overrides: Record<string, unknown> = {}) {
	return {
		id: "action-1",
		resumeId: "resume-1",
		title: "Tighten summary",
		summary: null,
		operations: [{ op: "replace" as const, path: "/basics/name", value: "Bob" }],
		appliedUpdatedAt: NOW,
		...overrides,
	};
}

describe("appendMissingActionParts", () => {
	const draft: UIMessage = { id: "ui-1", role: "assistant", parts: [{ type: "text", text: "Editing…" }] };

	it("appends a synthetic call/result pair for an action missing from the parts", () => {
		const patched = appendMissingActionParts(draft, [buildAction()]);

		expect(patched.parts.at(-1)).toMatchObject({
			type: "tool-apply_resume_patch",
			toolCallId: "synthetic-action-1",
			state: "output-available",
			output: expect.objectContaining({ actionId: "action-1" }),
		});
	});

	it("returns the message unchanged when every action is already represented", () => {
		const withPart: UIMessage = {
			...draft,
			parts: [
				{
					type: "tool-apply_resume_patch",
					toolCallId: "call-1",
					state: "output-available",
					input: {},
					output: { actionId: "action-1" },
				} as UIMessage["parts"][number],
			],
		};

		expect(appendMissingActionParts(withPart, [buildAction()])).toBe(withPart);
	});
});

type ScriptedReaperDb = {
	updates: Array<{ set: unknown }>;
};

function scriptedReaperDatabase(input: {
	drafts: Array<Record<string, unknown>>;
	actions: Array<Record<string, unknown>>;
	clearMatches?: boolean;
}) {
	const state: ScriptedReaperDb = { updates: [] };
	let selectCall = 0;

	return {
		state,
		select: () => {
			const call = selectCall;
			selectCall += 1;
			return {
				from: () => ({
					where: async () => (call === 0 ? input.drafts : input.actions),
				}),
			};
		},
		update: () => ({
			set: (set: unknown) => {
				state.updates.push({ set });
				return {
					where: () =>
						Object.assign(Promise.resolve(undefined), {
							returning: async () => ((input.clearMatches ?? true) ? [{ id: "thread-1" }] : []),
						}),
				};
			},
		}),
	};
}

describe("reapStaleAgentRun", () => {
	it("clears the run claim and flips streaming drafts to canceled with synthetic action parts", async () => {
		const database = scriptedReaperDatabase({
			drafts: [
				{
					id: "row-1",
					uiMessage: { id: "ui-1", role: "assistant", parts: [{ type: "text", text: "Editing…" }] },
				},
			],
			actions: [buildAction()],
		});

		await reapStaleAgentRun(
			{ threadId: "thread-1", userId: "user-1", runId: "run-1", streamId: "stream-1" },
			database as never,
		);

		// First update clears the run claim; second flips the draft.
		expect(database.state.updates[0]?.set).toMatchObject({ activeRunId: null, activeStreamId: null });
		expect(database.state.updates[1]?.set).toMatchObject({ status: "canceled" });
		const uiMessage = (database.state.updates[1]?.set as { uiMessage?: UIMessage } | undefined)?.uiMessage;
		expect(uiMessage?.parts.at(-1)).toMatchObject({ toolCallId: "synthetic-action-1" });
	});

	it("only clears the claim when there is no streaming draft", async () => {
		const database = scriptedReaperDatabase({ drafts: [], actions: [] });

		await reapStaleAgentRun(
			{ threadId: "thread-1", userId: "user-1", runId: "run-1", streamId: null },
			database as never,
		);

		expect(database.state.updates).toHaveLength(1);
	});

	// Regression: a concurrent request/replica can claim a replacement run (and insert a live
	// draft) between the stale read and this reap. When the conditional clear matches nothing,
	// the loser must not flip any draft.
	it("does not touch drafts when another reaper already cleared or replaced the run", async () => {
		const database = scriptedReaperDatabase({
			drafts: [{ id: "row-live", uiMessage: { id: "ui-live", role: "assistant", parts: [] } }],
			actions: [],
			clearMatches: false,
		});

		await reapStaleAgentRun(
			{ threadId: "thread-1", userId: "user-1", runId: "run-stale", streamId: "stream-stale" },
			database as never,
		);

		// Only the (no-op) conditional clear ran; no draft status flip.
		expect(database.state.updates).toHaveLength(1);
		expect(database.state.updates[0]?.set).toMatchObject({ activeRunId: null });
	});
});
