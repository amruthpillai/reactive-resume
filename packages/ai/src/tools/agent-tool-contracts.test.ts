import { describe, expect, it } from "vitest";
import {
	agentMessageMetadataSchema,
	applyResumePatchInputSchema,
	applyResumePatchOutputSchema,
	askUserQuestionInputSchema,
} from "./agent-tool-contracts";

describe("askUserQuestionInputSchema", () => {
	it("accepts a question with up to four choices", () => {
		expect(
			askUserQuestionInputSchema.safeParse({ question: "Which tone?", choices: ["Formal", "Casual"] }).success,
		).toBe(true);
	});

	it("rejects an empty question and too many choices", () => {
		expect(askUserQuestionInputSchema.safeParse({ question: " " }).success).toBe(false);
		expect(askUserQuestionInputSchema.safeParse({ question: "?", choices: ["a", "b", "c", "d", "e"] }).success).toBe(
			false,
		);
	});
});

describe("applyResumePatchInputSchema", () => {
	it("requires a title and at least one operation", () => {
		expect(
			applyResumePatchInputSchema.safeParse({
				title: "Edit",
				operations: [{ op: "replace", path: "/basics/name", value: "Bob" }],
			}).success,
		).toBe(true);
		expect(applyResumePatchInputSchema.safeParse({ title: "Edit", operations: [] }).success).toBe(false);
	});

	it("accepts a strict ISO baseUpdatedAt and rejects malformed values", () => {
		const operations = [{ op: "replace", path: "/basics/name", value: "Bob" }];

		expect(
			applyResumePatchInputSchema.safeParse({
				title: "Edit",
				baseUpdatedAt: "2026-08-20T10:15:00.000Z",
				operations,
			}).success,
		).toBe(true);
		expect(
			applyResumePatchInputSchema.safeParse({ title: "Edit", baseUpdatedAt: "yesterday", operations }).success,
		).toBe(false);
	});
});

describe("applyResumePatchOutputSchema", () => {
	const base = {
		actionId: "action-1",
		resumeId: "resume-1",
		title: "Edit",
		summary: null,
		operations: [{ op: "remove" as const, path: "/sections/experience/items/0" }],
		appliedUpdatedAt: "2026-08-20T00:00:00.000Z",
	};

	it("accepts legacy outputs without changedPaths or resume", () => {
		expect(applyResumePatchOutputSchema.safeParse(base).success).toBe(true);
	});

	it("accepts fresh outputs carrying the post-patch document", () => {
		expect(
			applyResumePatchOutputSchema.safeParse({ ...base, changedPaths: ["/basics/name"], resume: { basics: {} } })
				.success,
		).toBe(true);
	});
});

describe("agentMessageMetadataSchema", () => {
	it("accepts missing metadata, empty metadata, and unknown extra fields", () => {
		expect(agentMessageMetadataSchema.safeParse(undefined).success).toBe(true);
		expect(agentMessageMetadataSchema.safeParse({}).success).toBe(true);
		expect(
			agentMessageMetadataSchema.safeParse({ model: "gpt-5", usage: { totalTokens: 12, custom: true }, extra: 1 })
				.success,
		).toBe(true);
	});
});
