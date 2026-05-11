import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import {
	buildResumePatchProposalPreview,
	normalizeResumePatchProposals,
	resumePatchProposalSchema,
} from "./patch-proposal";

describe("buildResumePatchProposalPreview — additional cases", () => {
	it("shows the removed value as before with after undefined", () => {
		const proposal = resumePatchProposalSchema.parse({
			id: "proposal-1",
			title: "Remove first profile",
			operations: [{ op: "remove", path: "/sections/profiles/items/0" }],
		});

		const preview = buildResumePatchProposalPreview(sampleResumeData, proposal);
		expect(preview.entries[0]).toMatchObject({
			operation: "remove",
			path: "/sections/profiles/items/0",
			after: undefined,
		});
		expect(preview.entries[0]?.before).toBeDefined();
	});

	it("titleizes camelCase and hyphenated path segments", () => {
		const proposal = resumePatchProposalSchema.parse({
			id: "proposal-1",
			title: "Update page format",
			operations: [{ op: "replace", path: "/metadata/page/format", value: "letter" }],
		});

		const preview = buildResumePatchProposalPreview(sampleResumeData, proposal);
		// Label includes the human-readable section name 'Metadata' and 'Page'.
		expect(preview.entries[0]?.label).toMatch(/Metadata/);
	});
});

describe("normalizeResumePatchProposals", () => {
	it("attaches a baseUpdatedAt to every proposal", () => {
		const at = new Date("2024-01-01T00:00:00Z");
		const proposals = normalizeResumePatchProposals(
			{
				proposals: [
					{
						title: "A",
						operations: [{ op: "replace", path: "/basics/name", value: "x" }],
					},
					{
						title: "B",
						operations: [{ op: "replace", path: "/basics/name", value: "y" }],
					},
				],
			},
			at,
		);

		for (const p of proposals) {
			expect(p.baseUpdatedAt).toBe(at.toISOString());
		}
	});

	it("preserves order of input proposals", () => {
		const proposals = normalizeResumePatchProposals(
			{
				proposals: [
					{ title: "first", operations: [{ op: "replace", path: "/basics/name", value: "1" }] },
					{ title: "second", operations: [{ op: "replace", path: "/basics/name", value: "2" }] },
					{ title: "third", operations: [{ op: "replace", path: "/basics/name", value: "3" }] },
				],
			},
			new Date(),
		);

		expect(proposals.map((p) => p.title)).toEqual(["first", "second", "third"]);
	});
});
