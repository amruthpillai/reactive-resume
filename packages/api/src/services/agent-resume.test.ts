import { describe, expect, it } from "vitest";
import { buildAgentDraftResumeName, buildUniqueAgentDraftSlug } from "./agent-resume";

describe("agent resume setup helpers", () => {
	it("names duplicated resumes as AI drafts", () => {
		expect(buildAgentDraftResumeName("Senior Product Designer")).toBe("Senior Product Designer - AI Draft");
		expect(buildAgentDraftResumeName("Senior Product Designer - AI Draft")).toBe("Senior Product Designer - AI Draft");
	});

	it("generates unique AI draft slugs", () => {
		expect(buildUniqueAgentDraftSlug("Senior Product Designer", new Set())).toBe("senior-product-designer-ai-draft");
		expect(buildUniqueAgentDraftSlug("Senior Product Designer", new Set(["senior-product-designer-ai-draft"]))).toBe(
			"senior-product-designer-ai-draft-2",
		);
	});
});
