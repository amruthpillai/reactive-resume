import { describe, expect, it } from "vitest";
import { MCP_TOOL_NAME } from "./mcp-tool-names";
import { TOOL_ANNOTATIONS } from "./tool-annotations";

describe("MCP_TOOL_NAME", () => {
	it("uses canonical unprefixed snake_case tool names", () => {
		for (const name of Object.values(MCP_TOOL_NAME)) {
			expect(name).toMatch(/^[a-z]+(?:_[a-z]+)*$/);
			expect(name.split("_").at(0)).not.toBe("reactive");
		}
	});

	it("uses the canonical read and patch names", () => {
		expect(MCP_TOOL_NAME.getResume).toBe("read_resume");
		expect(MCP_TOOL_NAME.patchResume).toBe("apply_resume_patch");
	});

	it("uses canonical application tool names", () => {
		expect(MCP_TOOL_NAME.listApplications).toBe("list_applications");
		expect(MCP_TOOL_NAME.readApplication).toBe("read_application");
		expect(MCP_TOOL_NAME.createApplication).toBe("create_application");
		expect(MCP_TOOL_NAME.attachApplicationDocument).toBe("attach_application_document");
		expect(MCP_TOOL_NAME.autofillApplicationFromJob).toBe("autofill_application_from_job");
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
			MCP_TOOL_NAME.listApplications,
			MCP_TOOL_NAME.readApplication,
			MCP_TOOL_NAME.listApplicationTags,
			MCP_TOOL_NAME.getApplicationStats,
		];
		for (const name of readOnlyTools) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.readOnlyHint, name).toBe(true);
			expect(annotations.destructiveHint, name).toBe(false);
			expect(annotations.idempotentHint, name).toBe(true);
		}
	});

	it("marks PDF download URL generation as read-only but non-idempotent", () => {
		const annotations = TOOL_ANNOTATIONS[MCP_TOOL_NAME.downloadResumePdf];
		expect(annotations.readOnlyHint).toBe(true);
		expect(annotations.idempotentHint).toBe(false);
		expect(annotations.destructiveHint).toBe(false);
	});

	it("marks deleteResume as destructive (but still idempotent)", () => {
		const annotations = TOOL_ANNOTATIONS[MCP_TOOL_NAME.deleteResume];
		expect(annotations.destructiveHint).toBe(true);
		expect(annotations.idempotentHint).toBe(true);
		expect(annotations.readOnlyHint).toBe(false);
	});

	it("marks application delete tools as destructive", () => {
		for (const name of [MCP_TOOL_NAME.deleteApplication, MCP_TOOL_NAME.bulkDeleteApplications]) {
			const annotations = TOOL_ANNOTATIONS[name];
			expect(annotations.readOnlyHint, name).toBe(false);
			expect(annotations.destructiveHint, name).toBe(true);
		}
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

	it("marks only job-posting autofill as open-world", () => {
		expect(TOOL_ANNOTATIONS[MCP_TOOL_NAME.autofillApplicationFromJob].openWorldHint).toBe(true);
	});

	it("declares no tools as open-world by default", () => {
		for (const [name, annotations] of Object.entries(TOOL_ANNOTATIONS)) {
			if (name === MCP_TOOL_NAME.autofillApplicationFromJob) continue;
			expect(annotations.openWorldHint).toBe(false);
		}
	});
});
