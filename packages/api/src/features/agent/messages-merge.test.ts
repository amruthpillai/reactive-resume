import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { mergeClientToolResponses } from "./messages-merge";

type LoosePart = Record<string, unknown> & { type: string };

function assistantMessage(parts: LoosePart[]): UIMessage {
	return { id: "ui-1", role: "assistant", parts: parts as UIMessage["parts"] };
}

const QUESTION_PENDING: LoosePart = {
	type: "tool-ask_user_question",
	toolCallId: "call-q",
	state: "input-available",
	input: { question: "Which tone?" },
};

const APPROVAL_REQUESTED: LoosePart = {
	type: "tool-apply_resume_patch",
	toolCallId: "call-p",
	state: "approval-requested",
	input: { title: "Edit", operations: [] },
	approval: { id: "approval-1", signature: "server-signature" },
};

function approvalResponse(approved: boolean, reason?: string): LoosePart {
	return {
		type: "tool-apply_resume_patch",
		toolCallId: "call-p",
		state: "approval-responded",
		input: { title: "Edit", operations: [] },
		approval: { id: "approval-1", approved, ...(reason ? { reason } : {}), signature: "client-signature" },
	};
}

function questionAnswer(output = "Formal"): LoosePart {
	return { type: "tool-ask_user_question", toolCallId: "call-q", state: "output-available", input: {}, output };
}

describe("mergeClientToolResponses — questions (legacy behavior)", () => {
	it("merges an answer into a pending question", () => {
		const result = mergeClientToolResponses(assistantMessage([QUESTION_PENDING]), assistantMessage([questionAnswer()]));

		expect(result.mergedCount).toBe(1);
		expect(result.message.parts[0]).toMatchObject({ state: "output-available", output: "Formal" });
	});

	it("merges an error answer with its errorText", () => {
		const result = mergeClientToolResponses(
			assistantMessage([QUESTION_PENDING]),
			assistantMessage([
				{ type: "tool-ask_user_question", toolCallId: "call-q", state: "output-error", errorText: "boom" },
			]),
		);

		expect(result.message.parts[0]).toMatchObject({ state: "output-error", errorText: "boom" });
	});

	it("counts a re-submitted answer as already resolved", () => {
		const answered = assistantMessage([{ ...QUESTION_PENDING, state: "output-available", output: "Formal" }]);

		const result = mergeClientToolResponses(answered, assistantMessage([questionAnswer()]));

		expect(result.mergedCount).toBe(0);
		expect(result.alreadyResolvedCount).toBe(1);
	});

	it("returns zero counts when nothing matches", () => {
		const result = mergeClientToolResponses(assistantMessage([QUESTION_PENDING]), assistantMessage([]));

		expect(result).toMatchObject({ mergedCount: 0, alreadyResolvedCount: 0, conflictingCount: 0 });
	});
});

describe("mergeClientToolResponses — approvals", () => {
	it("approves: flips the stored part but keeps the server-signed request payload", () => {
		const result = mergeClientToolResponses(
			assistantMessage([APPROVAL_REQUESTED]),
			assistantMessage([approvalResponse(true)]),
		);

		expect(result.mergedCount).toBe(1);
		expect(result.message.parts[0]).toMatchObject({
			state: "approval-responded",
			approval: { id: "approval-1", approved: true, signature: "server-signature" },
		});
	});

	it("denies with a reason", () => {
		const result = mergeClientToolResponses(
			assistantMessage([APPROVAL_REQUESTED]),
			assistantMessage([approvalResponse(false, "Wrong section")]),
		);

		expect(result.message.parts[0]).toMatchObject({
			state: "approval-responded",
			approval: { approved: false, reason: "Wrong section", signature: "server-signature" },
		});
	});

	it("resubmitting the same decision on a responded-but-unexecuted approval is a pending continuation", () => {
		const responded = assistantMessage([
			{ ...APPROVAL_REQUESTED, state: "approval-responded", approval: { id: "approval-1", approved: true } },
		]);

		const result = mergeClientToolResponses(responded, assistantMessage([approvalResponse(true)]));

		expect(result).toMatchObject({
			mergedCount: 0,
			alreadyResolvedCount: 0,
			pendingContinuationCount: 1,
			conflictingCount: 0,
		});
	});

	it("resubmitting the decision after the approved call executed is already resolved", () => {
		const executed = assistantMessage([
			{
				...APPROVAL_REQUESTED,
				state: "output-available",
				output: { actionId: "action-1" },
				approval: { id: "approval-1", approved: true },
			},
		]);

		const result = mergeClientToolResponses(executed, assistantMessage([approvalResponse(true)]));

		expect(result).toMatchObject({ mergedCount: 0, alreadyResolvedCount: 1, pendingContinuationCount: 0 });
	});

	it("double submit with a conflicting decision is flagged", () => {
		const responded = assistantMessage([
			{ ...APPROVAL_REQUESTED, state: "approval-responded", approval: { id: "approval-1", approved: true } },
		]);

		const result = mergeClientToolResponses(responded, assistantMessage([approvalResponse(false)]));

		expect(result).toMatchObject({ mergedCount: 0, alreadyResolvedCount: 0, conflictingCount: 1 });
	});

	it("a response for a different approval id does not touch the stored part", () => {
		const result = mergeClientToolResponses(
			assistantMessage([APPROVAL_REQUESTED]),
			assistantMessage([
				{
					...approvalResponse(true),
					approval: { id: "approval-other", approved: true },
				},
			]),
		);

		expect(result.mergedCount).toBe(0);
		expect(result.message.parts[0]).toMatchObject({ state: "approval-requested" });
	});
});

describe("mergeClientToolResponses — mixed", () => {
	it("handles a question answer and an approval decision in one pass", () => {
		const result = mergeClientToolResponses(
			assistantMessage([QUESTION_PENDING, APPROVAL_REQUESTED]),
			assistantMessage([questionAnswer(), approvalResponse(true)]),
		);

		expect(result.mergedCount).toBe(2);
		expect(result.message.parts[0]).toMatchObject({ state: "output-available" });
		expect(result.message.parts[1]).toMatchObject({ state: "approval-responded" });
	});
});
