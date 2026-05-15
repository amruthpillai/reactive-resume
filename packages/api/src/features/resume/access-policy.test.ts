import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { assertCanView, isOwner, redactResumeForViewer, shouldCountForStatistics } from "./access-policy";

describe("isOwner", () => {
	it("returns true when viewer.id matches resume.userId", () => {
		expect(isOwner({ userId: "u1", isPublic: false }, { id: "u1" })).toBe(true);
	});

	it("returns false when viewer.id differs", () => {
		expect(isOwner({ userId: "u1", isPublic: false }, { id: "u2" })).toBe(false);
	});

	it("returns false when viewer is null (anonymous)", () => {
		expect(isOwner({ userId: "u1", isPublic: false }, null)).toBe(false);
	});
});

describe("assertCanView", () => {
	it("does not throw when viewer is owner of private resume", () => {
		expect(() => assertCanView({ userId: "u1", isPublic: false }, { id: "u1" })).not.toThrow();
	});

	it("does not throw when resume is public regardless of viewer", () => {
		expect(() => assertCanView({ userId: "u1", isPublic: true }, { id: "u2" })).not.toThrow();
		expect(() => assertCanView({ userId: "u1", isPublic: true }, null)).not.toThrow();
	});

	it("throws NOT_FOUND for private resume viewed by non-owner", () => {
		expect(() => assertCanView({ userId: "u1", isPublic: false }, { id: "u2" })).toThrow();
	});

	it("throws NOT_FOUND for private resume viewed anonymously", () => {
		expect(() => assertCanView({ userId: "u1", isPublic: false }, null)).toThrow();
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
	it("returns the resume unchanged for owner", () => {
		const resume = {
			name: "My Dashboard Title",
			data: { ...defaultResumeData, metadata: { ...defaultResumeData.metadata, notes: "Private" } },
		};
		expect(redactResumeForViewer(resume, true)).toBe(resume);
	});

	it("strips name to empty for non-owner", () => {
		const resume = {
			name: "Senior Eng @ Foo — final draft",
			data: defaultResumeData,
		};
		const result = redactResumeForViewer(resume, false);
		expect(result.name).toBe("");
	});

	it("strips metadata.notes for non-owner", () => {
		const resume = {
			name: "Title",
			data: { ...defaultResumeData, metadata: { ...defaultResumeData.metadata, notes: "Private notes" } },
		};
		const result = redactResumeForViewer(resume, false);
		expect(result.data.metadata.notes).toBe("");
	});

	it("preserves resume.data.basics.name (the person's name) for non-owner", () => {
		const resume = {
			name: "Dashboard title",
			data: {
				...defaultResumeData,
				basics: { ...defaultResumeData.basics, name: "Alice Smith" },
			},
		};
		const result = redactResumeForViewer(resume, false);
		expect(result.data.basics.name).toBe("Alice Smith");
	});

	it("does not mutate the input", () => {
		const resume = {
			name: "Title",
			data: { ...defaultResumeData, metadata: { ...defaultResumeData.metadata, notes: "Notes" } },
		};
		const before = JSON.stringify(resume);
		redactResumeForViewer(resume, false);
		expect(JSON.stringify(resume)).toBe(before);
	});

	it("preserves additional resume fields", () => {
		const resume = {
			name: "Title",
			data: defaultResumeData,
			extraField: "extra",
		};
		const result = redactResumeForViewer(resume, false);
		expect((result as typeof resume).extraField).toBe("extra");
	});
});

describe("shouldCountForStatistics", () => {
	it("returns false when viewer is the owner", () => {
		expect(shouldCountForStatistics({ userId: "u1", isPublic: true }, { id: "u1" })).toBe(false);
	});

	it("returns true for anonymous viewers", () => {
		expect(shouldCountForStatistics({ userId: "u1", isPublic: true }, null)).toBe(true);
	});

	it("returns true for non-owner viewers", () => {
		expect(shouldCountForStatistics({ userId: "u1", isPublic: true }, { id: "u2" })).toBe(true);
	});
});
