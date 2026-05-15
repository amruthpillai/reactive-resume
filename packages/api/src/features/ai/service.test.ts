import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { convertToModelMessages, modelMessageSchema } from "ai";

describe("AI chat service", () => {
	it("keeps proposal tool history valid for follow-up chat messages", async () => {
		const messages: UIMessage[] = [
			{
				id: "user-1",
				role: "user",
				parts: [{ type: "text", text: "Add draft references." }],
			},
			{
				id: "assistant-1",
				role: "assistant",
				parts: [
					{
						type: "tool-propose_resume_patches",
						toolCallId: "call-1",
						state: "output-available",
						input: {
							proposals: [
								{
									title: "Add draft references",
									operations: [
										{
											op: "replace",
											path: "/sections/references/items",
											value: [
												{ id: "reference-1", name: "Jane Mitchell" },
												{ id: "reference-2", name: "Marcus Chen" },
												{ id: "reference-3", name: "Olivia Ramirez" },
											],
										},
									],
								},
							],
						},
						output: {
							proposals: [
								{
									id: "proposal-1",
									title: "Add draft references",
									baseUpdatedAt: "2026-05-10T06:38:27.093Z",
									operations: [
										{
											op: "replace",
											path: "/sections/references/items",
											value: [
												{ id: "reference-1", name: "Jane Mitchell" },
												{ id: "reference-2", name: "Marcus Chen" },
												{ id: "reference-3", name: "Olivia Ramirez" },
											],
										},
									],
								},
							],
						},
					},
				],
			},
			{
				id: "assistant-2",
				role: "assistant",
				parts: [{ type: "text", text: "I prepared draft reference changes for review." }],
			},
			{
				id: "user-2",
				role: "user",
				parts: [{ type: "text", text: "Reduce it down to the first two." }],
			},
		];

		const modelMessages = await convertToModelMessages(messages);

		expect(modelMessages.map((message) => message.role)).toEqual(["user", "assistant", "tool", "assistant", "user"]);
		expect(JSON.stringify(modelMessages)).toContain("proposal-1");
		expect(JSON.stringify(modelMessages)).toContain("/sections/references/items");
		expect(JSON.stringify(modelMessages)).toContain("tool-result");

		for (const message of modelMessages) {
			expect(modelMessageSchema.safeParse(message).success).toBe(true);
		}
	});
});
