import { describe, expect, it } from "vitest";
import { applicationDto } from "./application";

describe("applicationDto sourceUrl", () => {
	it("accepts http(s) URLs", () => {
		expect(
			applicationDto.create.input.parse({
				company: "Stripe",
				role: "Engineer",
				sourceUrl: "https://example.com/job",
			}).sourceUrl,
		).toBe("https://example.com/job");
	});

	it("rejects URLs that would be unsafe in anchors", () => {
		expect(() =>
			applicationDto.create.input.parse({
				company: "Stripe",
				role: "Engineer",
				sourceUrl: "javascript:alert(1)",
			}),
		).toThrow();
	});
});

describe("applicationDto jobDescription", () => {
	it("rejects oversized descriptions before AI actions can use them", () => {
		expect(() =>
			applicationDto.create.input.parse({
				company: "Stripe",
				role: "Engineer",
				jobDescription: "x".repeat(20_001),
			}),
		).toThrow();
	});
});

describe("applicationDto document uploads", () => {
	it("accepts PDF application documents", () => {
		const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });

		const parsed = applicationDto.attachDocument.input.parse({
			id: "application-1",
			kind: "resume",
			file,
		});

		expect(parsed.kind).toBe("resume");
		expect(parsed.file.name).toBe("resume.pdf");
	});

	it("rejects non-PDF application documents", () => {
		const file = new File(["hello"], "cover.txt", { type: "text/plain" });

		expect(() =>
			applicationDto.attachDocument.input.parse({
				id: "application-1",
				kind: "cover-letter",
				file,
			}),
		).toThrow();
	});

	it("rejects unknown application document kinds", () => {
		const file = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });

		expect(() =>
			applicationDto.attachDocument.input.parse({
				id: "application-1",
				kind: "portfolio",
				file,
			}),
		).toThrow();
	});
});

describe("applicationDto zero-argument inputs", () => {
	it("normalizes stats input to an empty object", () => {
		expect(applicationDto.stats.input.parse(undefined)).toEqual({});
	});

	it("normalizes tags input to an empty object", () => {
		expect(applicationDto.tags.input.parse(undefined)).toEqual({});
	});
});
