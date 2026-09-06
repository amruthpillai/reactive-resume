import { describe, expect, it } from "vitest";
import { hasTemplatePicture } from "./picture";

const basePicture = {
	hidden: false,
	fit: "cover",
	url: "",
	size: 80,
	rotation: 0,
	aspectRatio: 1,
	borderRadius: 0,
	borderColor: "rgba(0, 0, 0, 0.5)",
	borderWidth: 0,
	shadowColor: "rgba(0, 0, 0, 0.5)",
	shadowWidth: 0,
} as const;

describe("hasTemplatePicture", () => {
	it("returns true when not hidden and url is non-empty", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.png" })).toBe(true);
	});

	it("returns false when hidden", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "/uploads/me.png", hidden: true })).toBe(false);
	});

	it("returns false when url is empty", () => {
		expect(hasTemplatePicture(basePicture)).toBe(false);
	});

	it("returns false when url is whitespace only", () => {
		expect(hasTemplatePicture({ ...basePicture, url: "   " })).toBe(false);
	});
});
