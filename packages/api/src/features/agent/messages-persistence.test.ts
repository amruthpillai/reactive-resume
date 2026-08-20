import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { applyStepToUiMessage, upsertAssistantUiMessage } from "./messages-persistence";

function emptyMessage(): UIMessage {
	return { id: "ui-1", role: "assistant", parts: [] };
}

describe("applyStepToUiMessage", () => {
	it("folds text, reasoning, and paired tool call/result content into UI parts", () => {
		const folded = applyStepToUiMessage(emptyMessage(), {
			content: [
				{ type: "reasoning", text: "thinking" },
				{ type: "tool-call", toolCallId: "call-1", toolName: "apply_resume_patch", input: { title: "Edit" } },
				{
					type: "tool-result",
					toolCallId: "call-1",
					toolName: "apply_resume_patch",
					output: { actionId: "action-1" },
				},
				{ type: "text", text: "Done." },
			],
		});

		expect(folded.parts).toEqual([
			{ type: "step-start" },
			{ type: "reasoning", text: "thinking" },
			{
				type: "tool-apply_resume_patch",
				toolCallId: "call-1",
				state: "output-available",
				input: { title: "Edit" },
				output: { actionId: "action-1" },
			},
			{ type: "text", text: "Done." },
		]);
	});

	it("appends to existing parts instead of replacing them", () => {
		const first = applyStepToUiMessage(emptyMessage(), { content: [{ type: "text", text: "one" }] });
		const second = applyStepToUiMessage(first, { content: [{ type: "text", text: "two" }] });

		expect(second.parts.map((part) => part.type)).toEqual(["step-start", "text", "step-start", "text"]);
	});

	it("marks tool errors as output-error with the error message", () => {
		const folded = applyStepToUiMessage(emptyMessage(), {
			content: [
				{ type: "tool-call", toolCallId: "call-1", toolName: "apply_resume_patch", input: {} },
				{
					type: "tool-error",
					toolCallId: "call-1",
					toolName: "apply_resume_patch",
					input: {},
					error: new Error("The resume changed"),
				},
			],
		});

		expect(folded.parts.at(-1)).toMatchObject({ state: "output-error", errorText: "The resume changed" });
	});

	it("keeps an unpaired tool result by synthesizing a complete tool part", () => {
		const folded = applyStepToUiMessage(emptyMessage(), {
			content: [{ type: "tool-result", toolCallId: "call-9", toolName: "read_resume", input: {}, output: { id: "r" } }],
		});

		expect(folded.parts.at(-1)).toMatchObject({
			type: "tool-read_resume",
			toolCallId: "call-9",
			state: "output-available",
		});
	});

	it("folds dynamic tool calls into dynamic-tool parts", () => {
		const folded = applyStepToUiMessage(emptyMessage(), {
			content: [
				{ type: "tool-call", toolCallId: "call-2", toolName: "web_search", input: { q: "x" }, dynamic: true },
				{ type: "tool-result", toolCallId: "call-2", toolName: "web_search", output: [], dynamic: true },
			],
		});

		expect(folded.parts.at(-1)).toMatchObject({
			type: "dynamic-tool",
			toolName: "web_search",
			state: "output-available",
		});
	});

	it("skips sources, files, and approval content", () => {
		const folded = applyStepToUiMessage(emptyMessage(), {
			content: [
				{ type: "source", sourceType: "url", url: "https://example.com" },
				{ type: "file", file: {} },
				{ type: "tool-approval-request", approvalId: "a-1" },
			],
		});

		expect(folded.parts).toEqual([{ type: "step-start" }]);
	});
});

type ScriptedDb = {
	updates: unknown[];
	inserts: unknown[];
};

// Minimal scripted stand-in for the drizzle client: each update() consumes the next scripted
// returning() result; insert() always succeeds. No vi.mock — the database is an injected value.
function scriptedDatabase(updateResults: Array<Array<{ id: string }>>): ScriptedDb & Record<string, unknown> {
	const state: ScriptedDb = { updates: [], inserts: [] };
	let updateCall = 0;

	return {
		updates: state.updates,
		inserts: state.inserts,
		select: () => ({
			from: () => ({
				where: async () => [{ maxSequence: 3 }],
			}),
		}),
		update: () => ({
			set: (value: unknown) => {
				state.updates.push(value);
				return {
					where: () => {
						const result = updateResults[updateCall] ?? [];
						updateCall += 1;
						return Object.assign(Promise.resolve(undefined), {
							returning: async () => result,
						});
					},
				};
			},
		}),
		insert: () => ({
			values: (value: unknown) => {
				state.inserts.push(value);
				return { returning: async () => [{ id: "inserted-row" }] };
			},
		}),
		delete: () => ({ where: async () => undefined }),
	};
}

describe("upsertAssistantUiMessage", () => {
	const message: UIMessage = { id: "ui-1", role: "assistant", parts: [{ type: "text", text: "hi" }] };

	it("updates by row id when the row exists", async () => {
		const database = scriptedDatabase([[{ id: "row-1" }], []]);

		const result = await upsertAssistantUiMessage(
			{ userId: "user-1", threadId: "thread-1", rowId: "row-1", message, status: "streaming" },
			database as never,
		);

		expect(result).toEqual({ rowId: "row-1" });
		expect(database.inserts).toHaveLength(0);
	});

	it("falls back to matching the stored uiMessage id, then updates in place", async () => {
		const database = scriptedDatabase([[{ id: "row-2" }]]);

		const result = await upsertAssistantUiMessage(
			{ userId: "user-1", threadId: "thread-1", message, status: "completed" },
			database as never,
		);

		expect(result).toEqual({ rowId: "row-2" });
		expect(database.inserts).toHaveLength(0);
	});

	it("inserts a new row only when no existing row matches", async () => {
		const database = scriptedDatabase([[], []]);

		const result = await upsertAssistantUiMessage(
			{ userId: "user-1", threadId: "thread-1", rowId: "row-gone", message, status: "completed" },
			database as never,
		);

		expect(result).toEqual({ rowId: "inserted-row" });
		expect(database.inserts).toHaveLength(1);
		expect(database.inserts[0]).toMatchObject({ role: "assistant", status: "completed", sequence: 4 });
	});
});
