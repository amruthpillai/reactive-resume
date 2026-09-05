import { describe, expect, it, vi } from "vitest";
import { copyCoverLetterStyle } from "@reactive-resume/resume/cover-letter";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";

const mocks = vi.hoisted(() => ({ select: vi.fn(), predicates: [] as unknown[] }));
vi.mock("@reactive-resume/db/client", () => ({ db: { select: mocks.select } }));
vi.mock("@reactive-resume/db/schema", () => ({
	user: { id: "user.id" },
	resume: { userId: "resume.userId" },
	coverLetter: { userId: "coverLetter.userId" },
}));
vi.mock("drizzle-orm", () => ({ eq: (column: unknown, value: unknown) => ({ column, value }) }));
vi.mock("@reactive-resume/env/server", () => ({ env: {} }));
vi.mock("../storage/service", () => ({ getStorageService: vi.fn() }));
const { authService } = await import("./service");

describe("account backup", () => {
	it("includes owned independent cover letters alongside embedded resume letters", async () => {
		const letter = {
			id: "letter",
			name: "Saved",
			recipient: "",
			content: "<p>Body</p>",
			style: copyCoverLetterStyle(defaultResumeData),
			sourceResumeId: null,
			sourceApplicationId: null,
			revision: 1,
			createdAt: new Date(),
			updatedAt: new Date(),
		};
		for (const rows of [[{ id: "owner", name: "Owner" }], [{ id: "resume", data: defaultResumeData }], [letter]]) {
			mocks.select.mockReturnValueOnce({
				from: () => ({
					where: (predicate: unknown) => {
						mocks.predicates.push(predicate);
						return Promise.resolve(rows);
					},
				}),
			});
		}
		const exported = await authService.exportData({ userId: "owner" });
		expect(exported).toMatchObject({ coverLetters: [letter], resumes: [{ id: "resume" }] });
		expect(mocks.predicates).toContainEqual({ column: "coverLetter.userId", value: "owner" });
	});
});
