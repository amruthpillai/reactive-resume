import { describe, expect, it } from "vitest";
import { resumeDto } from "../../dto/resume";

const source = { languageVersion: 1, text: "@version 1;\n" };
const common = {
	id: "resume-1",
	expectedRevision: 3,
	expectedRenderDataVersion: 8,
	editGeneration: 13,
};

describe("resume stylesheet mutation DTO", () => {
	it.each([
		{ ...common, transition: "edit_source", source },
		{ ...common, transition: "activate", source },
		{ ...common, transition: "deactivate" },
		{
			...common,
			transition: "restore_history",
			restore: { mode: "semantic", source, applied: source },
		},
	])("accepts the exact $transition payload", (input) => {
		expect(resumeDto.stylesheet.mutate.input.safeParse(input).success).toBe(true);
	});

	it.each([
		{ name: "forged applied edit", input: { ...common, transition: "edit_source", source, applied: source } },
		{ name: "source on deactivate", input: { ...common, transition: "deactivate", source } },
		{ name: "missing activation source", input: { ...common, transition: "activate" } },
		{
			name: "extra restore field",
			input: {
				...common,
				transition: "restore_history",
				restore: { mode: "semantic", source, applied: source, revision: 99 },
			},
		},
		{
			name: "missing edit generation",
			input: {
				id: common.id,
				expectedRevision: common.expectedRevision,
				expectedRenderDataVersion: common.expectedRenderDataVersion,
				transition: "deactivate",
			},
		},
	])("rejects $name", ({ input }) => {
		expect(resumeDto.stylesheet.mutate.input.safeParse(input).success).toBe(false);
	});
});
