import { describe, expect, it } from "vitest";

const source = await import("./pages?raw").then((module) => module.default);

describe("layout page header", () => {
	it("uses container queries to prevent narrow sidebar control collisions", () => {
		expect(source).toContain("@container bg-secondary/50");
		expect(source).toContain("grid-cols-[minmax(0,1fr)_auto]");
		expect(source).toContain("@max-[22rem]:grid-cols-1");
		expect(source).toContain("flex min-w-0 flex-wrap");
	});
});
