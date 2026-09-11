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
		).toThrow("URL must use http or https.");
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

describe("applicationDto contacts", () => {
	it("accepts contact email and phone details", () => {
		const parsed = applicationDto.create.input.parse({
			company: "Stripe",
			role: "Engineer",
			contacts: [{ name: "Jane Doe", email: "jane@example.com", phone: "+1 555 0100" }],
		});

		expect(parsed.contacts).toEqual([
			{ name: "Jane Doe", role: "", type: "", email: "jane@example.com", phone: "+1 555 0100" },
		]);
	});

	it("keeps legacy contacts compatible", () => {
		const parsed = applicationDto.create.input.parse({
			company: "Stripe",
			role: "Engineer",
			contacts: [{ name: "Jane Doe" }],
		});

		expect(parsed.contacts?.[0]).toMatchObject({ email: "", phone: "" });
	});

	it("rejects malformed contact emails", () => {
		expect(() =>
			applicationDto.create.input.parse({
				company: "Stripe",
				role: "Engineer",
				contacts: [{ name: "Jane Doe", email: "not-an-email" }],
			}),
		).toThrow("Invalid email address.");
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

// Bulk operations cap `ids` at 200 to bound memory/DB work from a single call.
describe("applicationDto bulk id caps", () => {
	const idsOfLength = (n: number) => Array.from({ length: n }, (_, i) => String(i));

	it("rejects a bulkDelete ids array over the cap", () => {
		expect(applicationDto.bulkDelete.input.safeParse({ ids: idsOfLength(201) }).success).toBe(false);
	});

	it("accepts a bulkDelete ids array at the cap", () => {
		expect(applicationDto.bulkDelete.input.safeParse({ ids: idsOfLength(200) }).success).toBe(true);
	});

	it("rejects a bulkUpdate ids array over the cap", () => {
		expect(applicationDto.bulkUpdate.input.safeParse({ ids: idsOfLength(201) }).success).toBe(false);
	});

	it("accepts a bulkUpdate ids array at the cap", () => {
		expect(applicationDto.bulkUpdate.input.safeParse({ ids: idsOfLength(200) }).success).toBe(true);
	});
});
