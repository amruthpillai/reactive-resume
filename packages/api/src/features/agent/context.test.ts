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

describe("pruneAgentModelContext — tier 3 (attachments)", () => {
	it("stubs attachments on older user messages but never on the latest", () => {
		const bytes = new Uint8Array(1_000);
		const messages: ModelMessage[] = [
			{
				role: "user",
				content: [
					{ type: "text", text: "old" },
					{ type: "file", data: bytes, mediaType: "application/pdf", filename: "old.pdf" },
				],
			},
			{
				role: "user",
				content: [
					{ type: "text", text: "new" },
					{ type: "image", image: bytes, mediaType: "image/png" },
				],
			},
		];

		const pruned = pruneAgentModelContext(messages, 10);

		const oldParts = messageParts(pruned[0]);
		expect(oldParts[1]?.type).toBe("text");
		expect(String(oldParts[1]?.text)).toContain("read_attachment");
		const newParts = messageParts(pruned[1]);
		expect(newParts[1]?.type).toBe("image");
	});
});

describe("estimateTokenCount", () => {
	it("estimates roughly four characters per token", () => {
		expect(estimateTokenCount("x".repeat(400))).toBe(100);
		expect(estimateTokenCount({ a: 1 })).toBeGreaterThan(0);
	});
});
