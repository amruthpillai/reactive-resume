import { describe, expect, it } from "vitest";
import { repairAgentPatchToolCallInput, repairAgentToolCall } from "./repair";

const VALID_INPUT = JSON.stringify({
	title: "Edit",
	operations: [{ op: "replace", path: "/basics/name", value: "Bob" }],
});

describe("repairAgentPatchToolCallInput", () => {
	it("repairs sloppy JSON (single quotes, trailing commas)", () => {
		const sloppy = `{'title': 'Edit', 'operations': [{'op': 'replace', 'path': '/basics/name', 'value': 'Bob'},]}`;

		const repaired = repairAgentPatchToolCallInput(sloppy);

		expect(repaired).not.toBeNull();
		expect(JSON.parse(repaired ?? "")).toMatchObject({ title: "Edit" });
	});

	it("strips /data prefixes from path and from", () => {
		const input = JSON.stringify({
			title: "Move",
			operations: [{ op: "move", path: "/data/basics/name", from: "/data/basics/headline" }],
		});

		const repaired = JSON.parse(repairAgentPatchToolCallInput(input) ?? "");

		expect(repaired.operations[0]).toEqual({ op: "move", path: "/basics/name", from: "/basics/headline" });
	});

	it("returns null when the input cannot be made schema-valid", () => {
		expect(repairAgentPatchToolCallInput(`{"title": "Edit", "operations": []}`)).toBeNull();
		expect(repairAgentPatchToolCallInput("not even close {{{")).toBeNull();
	});
});

describe("repairAgentToolCall", () => {
	const baseCall = {
		type: "tool-call" as const,
		toolCallId: "call-1",
		toolName: "apply_resume_patch",
	};

	it("returns a repaired call for fixable apply_resume_patch input", async () => {
		const result = await repairAgentToolCall({
			toolCall: {
				...baseCall,
				input: `{'title': 'Edit', 'operations': [{'op': 'remove', 'path': '/data/basics/url'}]}`,
			},
		} as never);

		expect(result).not.toBeNull();
		expect(JSON.parse(result?.input ?? "")).toMatchObject({
			operations: [{ op: "remove", path: "/basics/url" }],
		});
	});

	it("returns null for other tools and for already-valid input", async () => {
		expect(
			await repairAgentToolCall({ toolCall: { ...baseCall, toolName: "read_resume", input: "{}" } } as never),
		).toBeNull();
		expect(await repairAgentToolCall({ toolCall: { ...baseCall, input: VALID_INPUT } } as never)).toBeNull();
	});
});
