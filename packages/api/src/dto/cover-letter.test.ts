import { describe, expect, it } from "vitest";
import { coverLetterDto } from "./cover-letter";

describe("cover-letter context validation", () => {
	it.each(["resumeId", "applicationId"])("rejects empty %s before it reaches foreign-key persistence", (field) => {
		expect(coverLetterDto.create.input.safeParse({ name: "Letter", [field]: "" }).success).toBe(false);
		expect(coverLetterDto.list.input.safeParse({ [field]: "" }).success).toBe(false);
	});
});
