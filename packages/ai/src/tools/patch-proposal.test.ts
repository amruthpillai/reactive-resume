import { describe, expect, it } from "vitest";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import {
	buildResumePatchProposalPreview,
	normalizeResumePatchProposals,
	resumePatchProposalSchema,
	resumePatchProposalToolInputSchema,
	resumePatchProposalToolOutputSchema,
} from "./patch-proposal";

describe("resume patch proposals", () => {
	it("requires at least one operation per proposal", () => {
		const result = resumePatchProposalSchema.safeParse({
			id: "proposal-1",
			title: "Empty proposal",
			operations: [],
		});

		expect(result.success).toBe(false);
	});

	it("normalizes tool input without requiring model-generated ids", () => {
		const result = resumePatchProposalToolInputSchema.safeParse({
			proposals: [
				{
					title: "Rewrite summary",
					summary: "Make the summary more direct.",
					operations: [{ op: "replace", path: "/summary/content", value: "<p>Focused product engineer.</p>" }],
				},
			],
		});

		expect(result.success).toBe(true);
	});

	it("normalizes base versions as JSON-safe ISO timestamps", () => {
		const proposals = normalizeResumePatchProposals(
			{
				proposals: [
					{
						title: "Rewrite summary",
						operations: [{ op: "replace", path: "/summary/content", value: "<p>Focused product engineer.</p>" }],
					},
				],
			},
			new Date("2026-05-10T06:38:27.093Z"),
		);

		const result = resumePatchProposalToolOutputSchema.parse({ proposals });

		expect(result.proposals[0]?.baseUpdatedAt).toBe("2026-05-10T06:38:27.093Z");
	});

	it("builds readable before/after preview entries", () => {
		const proposal = resumePatchProposalSchema.parse({
			id: "proposal-1",
			title: "Rewrite summary",
			operations: [{ op: "replace", path: "/summary/content", value: "<p>Focused product engineer.</p>" }],
		});

		const preview = buildResumePatchProposalPreview(sampleResumeData, proposal);

		expect(preview.title).toBe("Rewrite summary");
		expect(preview.entries).toHaveLength(1);
		expect(preview.entries[0]).toMatchObject({
			operation: "replace",
			path: "/summary/content",
			label: "Summary content",
			after: "<p>Focused product engineer.</p>",
		});
		expect(preview.entries[0]?.before).toBe(sampleResumeData.summary.content);
	});

	it("shows appended add values in the after preview", () => {
		const profile = {
			id: "b2c7f28a-3df7-4b8b-a8a1-8f95a8f522e8",
			hidden: false,
			network: "Instagram",
			username: "dkowalski.games",
			icon: "instagram-logo",
			iconColor: "",
			website: {
				url: "https://instagram.com/dkowalski.games",
				label: "instagram.com/dkowalski.games",
				inlineLink: false,
			},
		};
		const proposal = resumePatchProposalSchema.parse({
			id: "proposal-1",
			title: "Add social profile",
			operations: [{ op: "add", path: "/sections/profiles/items/-", value: profile }],
		});

		const preview = buildResumePatchProposalPreview(sampleResumeData, proposal);

		expect(preview.entries[0]).toMatchObject({
			operation: "add",
			path: "/sections/profiles/items/-",
			label: "Profiles new item",
			before: undefined,
			after: profile,
		});
	});
});
