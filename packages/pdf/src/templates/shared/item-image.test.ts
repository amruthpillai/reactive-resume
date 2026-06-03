import { describe, expect, it } from "vitest";
import { hasItemLogo } from "./item-image";

const baseLogo = {
	hidden: false,
	url: "/uploads/logo.png",
	size: 32,
	borderRadius: 0,
} as const;

describe("hasItemLogo", () => {
	it("returns true when not hidden and url is non-empty", () => {
		expect(hasItemLogo(baseLogo)).toBe(true);
	});

	it("returns false when hidden is true", () => {
		expect(hasItemLogo({ ...baseLogo, hidden: true })).toBe(false);
	});

	it("returns false when url is empty string", () => {
		expect(hasItemLogo({ ...baseLogo, url: "" })).toBe(false);
	});

	it("returns false when url is whitespace only", () => {
		expect(hasItemLogo({ ...baseLogo, url: "   " })).toBe(false);
	});

	it("returns false when logo is undefined", () => {
		expect(hasItemLogo(undefined)).toBe(false);
	});
});
