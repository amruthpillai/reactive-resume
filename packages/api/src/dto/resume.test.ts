import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { redactResumeForViewer } from "../features/resume/access-policy";
import { resumeDto } from "./resume";

describe("resume DTO output validation", () => {
	it("normalizes ordinary PUT data without losing compatible custom-section overlap", () => {
		const parsed = resumeDto.update.input.parse({
			id: "resume-id",
			data: {
				...structuredClone(defaultResumeData),
				customSections: [
					{
						id: "custom-experience",
						type: "experience",
						title: "Experience",
						icon: "",
						columns: 1,
						hidden: false,
						keepTogether: false,
						startOnNewPage: false,
						items: [
							{
								id: "experience-item",
								hidden: false,
								company: "Analytical Engines",
								position: "Programmer",
								location: "London",
								period: "1842–1843",
								description: "<p>Wrote the first algorithm.</p>",
								content: "<p>Compatible overlap</p>",
							},
						],
					},
				],
			},
		});

		expect(parsed.data?.customSections[0]?.items[0]).toMatchObject({
			content: "<p>Compatible overlap</p>",
			roles: [],
			website: { url: "", label: "", inlineLink: false },
		});
	});

	it("rejects renderer-unsafe custom sections before update or import persistence", () => {
		const data = {
			...defaultResumeData,
			customSections: [
				{
					id: "custom-experience",
					type: "experience",
					title: "Experience",
					icon: "",
					columns: 1,
					hidden: false,
					keepTogether: false,
					startOnNewPage: false,
					items: [{ id: "summary-item", hidden: false, content: "<p>Not an experience item</p>" }],
				},
			],
		};

		expect(resumeDto.update.input.safeParse({ id: "resume-id", data }).success).toBe(false);
		expect(resumeDto.import.input.safeParse({ data }).success).toBe(false);
	});

	it("defers imported stylesheet validation to the stable unavailable-feature error", () => {
		expect(
			resumeDto.import.input.safeParse({
				data: {
					...defaultResumeData,
					metadata: {
						...defaultResumeData.metadata,
						stylesheet: { invalid: true },
					},
				},
			}).success,
		).toBe(true);
	});

	it("does not let otherwise-invalid imports bypass validation without a stylesheet field", () => {
		expect(resumeDto.import.input.safeParse({ data: { metadata: {} } }).success).toBe(false);
	});

	it.each([
		[resumeDto.getById.output, {}],
		[resumeDto.getBySlug.output, { stylesheetMode: "legacy" }],
		[resumeDto.update.output, {}],
		[resumeDto.patch.output, {}],
	] as const)("keeps server concurrency columns out of ordinary resume outputs", (output, extra) => {
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
			...extra,
		});

		expect(parsed).not.toHaveProperty("stylesheetRevision");
		expect(parsed).not.toHaveProperty("renderDataVersion");
	});

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
			stylesheetMode: "legacy",
		};

		expect(publicResume.name).toBe("Resume");
		expect(publicResume.data.metadata.notes).toBe("");
		expect(resumeDto.getBySlug.output.safeParse(publicResume).success).toBe(true);
	});

	it("exposes only the safe public stylesheet mode discriminator", () => {
		const source = { languageVersion: 1, text: "@rr-version 1;\nresume { color: red; }\n" };
		const parsed = resumeDto.getBySlug.output.parse({
			id: "019e128d-0598-75d2-ae6a-771e2eb84614",
			name: "Resume",
			slug: "resume",
			tags: [],
			data: redactResumeForViewer(
				{
					name: "Owner title",
					data: {
						...defaultResumeData,
						metadata: {
							...defaultResumeData.metadata,
							stylesheet: { mode: "semantic", source, applied: source },
						},
					},
				},
				false,
			).data,
			isPublic: true,
			isLocked: false,
			hasPassword: false,
			stylesheetMode: "semantic",
		});

		expect(parsed.stylesheetMode).toBe("semantic");
		expect(JSON.stringify(parsed)).not.toContain("@rr-version");
		expect(JSON.stringify(parsed)).not.toContain("stylesheetRevision");
	});

	it("returns current canonical stylesheet state only on version restore", () => {
		const resume = {
			id: "019e128d-0598-75d2-ae6a-771e2eb84614",
			name: "Resume",
			slug: "resume",
			tags: [],
			data: defaultResumeData,
			isPublic: false,
			isLocked: false,
			updatedAt: new Date("2026-01-01T00:00:00Z"),
			hasPassword: false,
		};
		const stylesheet = {
			mode: "semantic" as const,
			source: { languageVersion: 1, text: "@rr-version 1;\n" },
			applied: { languageVersion: 1, text: "@rr-version 1;\n" },
		};

		expect(
			resumeDto.restoreVersion.output.parse({
				resume,
				stylesheetState: { stylesheet, revision: 8, renderDataVersion: 13 },
			}),
		).toEqual({
			resume,
			stylesheetState: { stylesheet, revision: 8, renderDataVersion: 13 },
		});
	});
});
