import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { redactResumeForViewer } from "../features/resume/access-policy";
import { resumeDto } from "./resume";

describe("resume DTO output validation", () => {
	it("defers imported stylesheet validation to the stable unavailable-feature error", () => {
		expect(
			resumeDto.import.input.safeParse({
				data: { metadata: { stylesheet: { invalid: true } } },
			}).success,
		).toBe(true);
	});

	it("does not let otherwise-invalid imports bypass validation without a stylesheet field", () => {
		expect(resumeDto.import.input.safeParse({ data: { metadata: {} } }).success).toBe(false);
	});

	it.each([resumeDto.getById.output, resumeDto.getBySlug.output, resumeDto.update.output, resumeDto.patch.output])(
		"keeps server concurrency columns out of ordinary resume outputs",
		(output) => {
			const parsed = output.parse({
				id: "019e128d-0598-75d2-ae6a-771e2eb84614",
				name: "Resume",
				slug: "resume",
				tags: [],
				data: defaultResumeData,
				isPublic: false,
				isLocked: false,
				updatedAt: new Date("2026-01-01T00:00:00Z"),
				hasPassword: false,
				stylesheetRevision: 7,
				renderDataVersion: 9,
			});

			expect(parsed).not.toHaveProperty("stylesheetRevision");
			expect(parsed).not.toHaveProperty("renderDataVersion");
		},
	);

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
