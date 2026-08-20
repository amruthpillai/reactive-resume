import type { ModelMessage } from "ai";
import { describe, expect, it } from "vitest";
import { estimateTokenCount, pruneAgentModelContext } from "./context";

const BIG_RESUME = { basics: { name: "Alice" }, sections: { summary: { content: "x".repeat(2_000) } } };

function readResumeExchange(callId: string): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [{ type: "tool-call", toolCallId: callId, toolName: "read_resume", input: {} }],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: callId,
					toolName: "read_resume",
					output: { type: "json", value: { id: "resume-1", data: BIG_RESUME } },
				},
			],
		},
	] as ModelMessage[];
}

function patchExchange(callId: string): ModelMessage[] {
	return [
		{
			role: "assistant",
			content: [{ type: "tool-call", toolCallId: callId, toolName: "apply_resume_patch", input: { title: "Edit" } }],
		},
		{
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: callId,
					toolName: "apply_resume_patch",
					output: { type: "json", value: { actionId: `action-${callId}`, resume: BIG_RESUME } },
				},
			],
		},
	] as ModelMessage[];
}

function user(text: string): ModelMessage {
	return { role: "user", content: [{ type: "text", text }] };
}

function messageParts(message: ModelMessage | undefined) {
	return (message?.content ?? []) as Array<Record<string, unknown>>;
}

function snapshotValue(message: ModelMessage | undefined) {
	const part = messageParts(message)[0];
	return ((part?.output ?? {}) as { value?: Record<string, unknown> }).value ?? {};
}

describe("pruneAgentModelContext — tier 0 (snapshot supersession)", () => {
	it("keeps only the last resume snapshot even when under budget", () => {
		const messages = [user("hi"), ...readResumeExchange("call-1"), ...patchExchange("call-2")];

		const pruned = pruneAgentModelContext(messages, 1_000_000);

		expect(snapshotValue(pruned[2])).not.toHaveProperty("data");
		expect(snapshotValue(pruned[2]).note).toContain("Superseded resume snapshot");
		expect(snapshotValue(pruned[4])).toHaveProperty("resume");
	});

	it("returns the same array reference when there is at most one snapshot", () => {
		const messages = [user("hi"), ...readResumeExchange("call-1")];

		expect(pruneAgentModelContext(messages, 1_000_000)).toBe(messages);
	});

	it("treats a crash-recovered synthetic patch result (resume: null) as the surviving snapshot boundary", () => {
		const synthetic: ModelMessage[] = [
			{
				role: "assistant",
				content: [{ type: "tool-call", toolCallId: "synthetic-1", toolName: "apply_resume_patch", input: {} }],
			},
			{
				role: "tool",
				content: [
					{
						type: "tool-result",
						toolCallId: "synthetic-1",
						toolName: "apply_resume_patch",
						output: { type: "json", value: { actionId: "action-1", resume: null, note: "Re-read the resume" } },
					},
				],
			},
		];

		const pruned = pruneAgentModelContext([user("hi"), ...readResumeExchange("call-1"), ...synthetic], 1_000_000);

		// The older full read_resume snapshot is superseded; the recovery note survives.
		expect(snapshotValue(pruned[2])).not.toHaveProperty("data");
		expect(snapshotValue(pruned[4])).toMatchObject({ note: "Re-read the resume" });
	});

	it("keeps non-snapshot fields of a superseded patch result (indexes may matter)", () => {
		const messages = [user("hi"), ...patchExchange("call-1"), ...patchExchange("call-2")];

		const pruned = pruneAgentModelContext(messages, 1_000_000);

		expect(snapshotValue(pruned[2])).toMatchObject({ actionId: "action-call-1" });
		expect(snapshotValue(pruned[2])).not.toHaveProperty("resume");
	});
});

describe("pruneAgentModelContext — tier 1 (reasoning)", () => {
	it("strips reasoning from all but the last assistant message when over budget", () => {
		const messages: ModelMessage[] = [
			user("hi"),
			{
				role: "assistant",
				content: [
					{ type: "reasoning", text: "r".repeat(400) },
					{ type: "text", text: "First answer" },
				],
			},
			user("more"),
			{
				role: "assistant",
				content: [
					{ type: "reasoning", text: "keep me" },
					{ type: "text", text: "Second answer" },
				],
			},
		];

		const pruned = pruneAgentModelContext(messages, 50);

		const firstAssistant = pruned.find((message) => message.role === "assistant");
		expect(JSON.stringify(firstAssistant)).not.toContain("rrrr");
		expect(JSON.stringify(pruned.at(-1))).toContain("keep me");
	});
});

describe("pruneAgentModelContext — tier 2 (tool pairs)", () => {
	it("stubs old pairs together, protecting the surviving snapshot and the last assistant message", () => {
		const messages = [
			user("hi"),
			...patchExchange("call-1"),
			...patchExchange("call-2"),
			{
				role: "assistant",
				content: [{ type: "text", text: "All done" }],
			} as ModelMessage,
		];

		const pruned = pruneAgentModelContext(messages, 100);

		// Oldest pair stubbed on both sides.
		const firstCall = messageParts(pruned[1])[0];
		expect(firstCall?.input).toEqual({});
		expect(snapshotValue(pruned[2]).note).toBeDefined();
		// Surviving snapshot pair untouched by tier 2 (still carries the resume).
		expect(snapshotValue(pruned[4])).toHaveProperty("resume");
	});

	it("never stubs a call that has no result (unresolved question stays intact)", () => {
		const question = {
			role: "assistant",
			content: [
				{
					type: "tool-call",
					toolCallId: "call-q",
					toolName: "ask_user_question",
					input: { question: "?".repeat(400) },
				},
			],
		} as ModelMessage;

		const pruned = pruneAgentModelContext([user("hi"), question, user("answer pending")], 20);

		const call = messageParts(pruned[1])[0];
		expect(call?.input).toEqual({ question: "?".repeat(400) });
	});

	it("skips messages carrying approval content", () => {
		const approval = {
			role: "assistant",
			content: [
				{ type: "tool-call", toolCallId: "call-a", toolName: "apply_resume_patch", input: { title: "x".repeat(400) } },
				{ type: "tool-approval-request", approvalId: "approval-1", toolCallId: "call-a" },
			],
		} as ModelMessage;
		const result = {
			role: "tool",
			content: [
				{
					type: "tool-result",
					toolCallId: "call-a",
					toolName: "apply_resume_patch",
					output: { type: "json", value: { actionId: "action-a" } },
				},
			],
		} as ModelMessage;

		const pruned = pruneAgentModelContext([user("hi"), approval, result, user("next")], 20);

		const call = messageParts(pruned[1])[0];
		expect(call?.input).toEqual({ title: "x".repeat(400) });
	});
});

describe("pruneAgentModelContext — tier 3 (turn dropping)", () => {
	function textTurn(userText: string, assistantText: string): ModelMessage[] {
		return [
			{ role: "user", content: [{ type: "text", text: userText }] },
			{ role: "assistant", content: [{ type: "text", text: assistantText }] },
		];
	}

	it("drops the oldest complete turns until the budget is met", () => {
		const messages = [
			...textTurn("old question ".repeat(50), "old answer ".repeat(50)),
			...textTurn("middle question ".repeat(50), "middle answer ".repeat(50)),
			...textTurn("latest question", "latest answer"),
		];

		const pruned = pruneAgentModelContext(messages, 60);

		expect(JSON.stringify(pruned)).not.toContain("old question");
		expect(JSON.stringify(pruned)).toContain("latest question");
		expect(JSON.stringify(pruned)).toContain("latest answer");
	});

	it("drops tool call/result pairs atomically with their turn", () => {
		const messages = [
			...textTurn("intro ".repeat(60), "ok"),
			{ role: "user", content: [{ type: "text", text: "edit please ".repeat(60) }] } as ModelMessage,
			...patchExchange("call-old"),
			...textTurn("follow up ".repeat(30), "done"),
			...textTurn("latest question", "latest answer"),
		];

		const pruned = pruneAgentModelContext(messages, 40);

		// The dropped turn takes both the tool call and its result with it — no orphaned side.
		const text = JSON.stringify(pruned);
		expect(text).not.toContain("call-old");
		expect(text).not.toContain('"tool-result"');
		expect(text).toContain("latest question");
	});

	it("never drops the final two turns even when still over budget", () => {
		const messages = [
			...textTurn("first question ".repeat(100), "first answer ".repeat(100)),
			...textTurn("second question ".repeat(100), "second answer ".repeat(100)),
			...textTurn("third question ".repeat(100), "third answer ".repeat(100)),
		];

		const pruned = pruneAgentModelContext(messages, 10);

		// Only the oldest turn is droppable; the penultimate and final turns must both survive
		// even though the result is still over budget.
		expect(pruned).toHaveLength(4);
		expect(JSON.stringify(pruned)).not.toContain("first question");
		expect(JSON.stringify(pruned)).toContain("second question");
		expect(JSON.stringify(pruned)).toContain("third question");
	});
});

describe("estimateTokenCount", () => {
	it("estimates natural text at roughly one token per word", () => {
		expect(estimateTokenCount("old question ".repeat(50))).toBeGreaterThanOrEqual(90);
		expect(estimateTokenCount("old question ".repeat(50))).toBeLessThan(120);
		expect(estimateTokenCount({ a: 1 })).toBeGreaterThan(0);
	});

	it("treats binary attachment data as opaque bytes instead of serializing it", () => {
		const bytes = new Uint8Array(1024 * 1024);
		const message = { role: "user", content: [{ type: "image", image: bytes, mediaType: "image/png" }] };

		const started = performance.now();
		const estimate = estimateTokenCount(message);
		const elapsedMs = performance.now() - started;

		// ~bytes/4 tokens, computed without expanding each byte into JSON.
		expect(estimate).toBeGreaterThan(200_000);
		expect(estimate).toBeLessThan(300_000);
		expect(elapsedMs).toBeLessThan(200);
	});
});
