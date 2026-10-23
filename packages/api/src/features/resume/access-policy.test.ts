import { describe, expect, it } from "vite-plus/test";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { assertCanView, redactResumeForViewer } from "./access-policy";

describe("assertCanView", () => {
	it("throws NOT_FOUND for private resume viewed by non-owner", () => {
		expect(() => assertCanView({ userId: "u1", isPublic: false }, { id: "u2" })).toThrow();
	});

	it("error code is NOT_FOUND (not FORBIDDEN) to prevent existence disclosure", () => {
		try {
			assertCanView({ userId: "u1", isPublic: false }, null);
			expect.unreachable();
		} catch (error: unknown) {
			expect((error as { code?: string }).code).toBe("NOT_FOUND");
		}
	});
});

describe("redactResumeForViewer", () => {
	it("replaces name with placeholder for non-owner", () => {
		const resume = {
			name: "Senior Eng @ Foo — final draft",
			data: defaultResumeData,
		};
		const result = redactResumeForViewer(resume, false);
		expect(result.name).toBe("Resume");
	});

	it("strips metadata.notes and the author's Check choices for non-owner", () => {
		const resume = {
			name: "Title",
			data: {
				...defaultResumeData,
				metadata: {
					...defaultResumeData.metadata,
					notes: "Private notes",
					check: { ignored: ["MISSING_PHONE:/basics/phone"], hiddenTerms: ["HIPAA"] },
				},
			},
		};
		const result = redactResumeForViewer(resume, false);
		expect(result.data.metadata.notes).toBe("");
		expect(result.data.metadata.check).toBeUndefined();
	});

	it("strips what the author hid for non-owner and keeps what prints", () => {
		const data = structuredClone(sampleResumeData);
		data.picture.hidden = true;
		data.summary.hidden = true;
		data.summary.title = "Private summary heading";
		data.sections.references.hidden = true;
		data.sections.references.title = "References at my current employer";
		data.sections.projects.items = data.sections.projects.items.map((item, index) => ({ ...item, hidden: index > 0 }));
		data.customSections = data.customSections.map((section) => ({ ...section, hidden: true }));

		const shared = redactResumeForViewer({ name: "Title", data }, false).data;

		expect(shared.picture.url).toBe("");
		expect(shared.summary.content).toBe("");
		expect(shared.summary.title).toBe("");
		expect(shared.sections.references.items).toEqual([]);
		expect(shared.sections.references.title).toBe("");
		expect(shared.sections.projects.items).toEqual(data.sections.projects.items.slice(0, 1));
		expect(shared.customSections).toEqual([]);
		expect(shared.sections.education).toEqual(data.sections.education);
	});
});
