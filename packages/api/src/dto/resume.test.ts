import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { redactResumeForViewer } from "../features/resume/access-policy";
import { resumeDto } from "./resume";

describe("resume DTO output validation", () => {
	it("accepts public resume responses after owner-only fields are redacted", () => {
		const dbResume = {
			id: "019e128d-0598-75d2-ae6a-771e2eb84614",
			userId: "019bef93-a165-72cb-9c0e-d96e00000000",
			name: "Armed Amaranth Catshark",
			slug: "armed-amaranth-catshark",
			tags: [],
			data: {
				...defaultResumeData,
				metadata: {
					...defaultResumeData.metadata,
					notes: "owner-only notes",
				},
			},
			isPublic: true,
			isLocked: false,
			hasPassword: false,
		};

		const publicResume = {
			...redactResumeForViewer(dbResume, false),
			hasPassword: dbResume.hasPassword,
		};

		expect(publicResume.name).toBe("Resume");
		expect(publicResume.data.metadata.notes).toBe("");
		expect(resumeDto.getBySlug.output.safeParse(publicResume).success).toBe(true);
	});
});
