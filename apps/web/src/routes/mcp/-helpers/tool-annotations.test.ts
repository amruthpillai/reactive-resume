import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_ANNOTATIONS } from "./tool-annotations";

describe("MCP_TOOL_NAME", () => {
	it("prefixes every tool name with reactive_resume_", () => {
		for (const name of Object.values(MCP_TOOL_NAME)) {
			expect(name.startsWith("reactive_resume_")).toBe(true);
		}
	});

	it("uses unique values for every tool", () => {
		const values = Object.values(MCP_TOOL_NAME);
		expect(new Set(values).size).toBe(values.length);
	});
});

describe("TOOL_ANNOTATIONS", () => {
	it("provides annotations for every registered tool", () => {
		for (const name of Object.values(MCP_TOOL_NAME)) {
			expect(TOOL_ANNOTATIONS[name]).toBeDefined();
		}
	});

	it("marks list/get tools as readOnly + idempotent + non-destructive", () => {
		const readOnlyTools = [
			MCP_TOOL_NAME.listResumes,
			MCP_TOOL_NAME.listResumeTags,
			MCP_TOOL_NAME.getResume,
			MCP_TOOL_NAME.getResumeAnalysis,
			MCP_TOOL_NAME.getResumeStatistics,
		];
		for (const name of readOnlyTools) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.readOnlyHint, name).toBe(true);
			expect(annotations.destructiveHint, name).toBe(false);
			expect(annotations.idempotentHint, name).toBe(true);
		}
	});

	it("marks deleteResume as destructive (but still idempotent)", () => {
		const annotations = TOOL_ANNOTATIONS[MCP_TOOL_NAME.deleteResume];
		expect(annotations.destructiveHint).toBe(true);
		expect(annotations.idempotentHint).toBe(true);
		expect(annotations.readOnlyHint).toBe(false);
	});

	it("marks creation/import/duplicate as non-readonly and non-idempotent", () => {
		for (const name of [
			MCP_TOOL_NAME.createResume,
			MCP_TOOL_NAME.importResume,
			MCP_TOOL_NAME.duplicateResume,
			MCP_TOOL_NAME.patchResume,
			MCP_TOOL_NAME.updateResume,
		]) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.readOnlyHint, name).toBe(false);
			expect(annotations.idempotentHint, name).toBe(false);
			expect(annotations.destructiveHint, name).toBe(false);
		}
	});

	it("marks lockResume / unlockResume as idempotent and non-destructive", () => {
		for (const name of [MCP_TOOL_NAME.lockResume, MCP_TOOL_NAME.unlockResume]) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.idempotentHint, name).toBe(true);
			expect(annotations.destructiveHint, name).toBe(false);
			expect(annotations.readOnlyHint, name).toBe(false);
		}
	});

	it("declares no tools as open-world by default", () => {
		for (const annotations of Object.values(TOOL_ANNOTATIONS)) {
			expect(annotations.openWorldHint).toBe(false);
		}
	});
});
