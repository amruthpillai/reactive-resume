import { describe, expect, it } from "vitest";
import { generateFilename } from "./file";

describe("generateFilename", () => {
	it("should return name with extension", () => {
		expect(generateFilename("My Resume", "docx")).toBe("My Resume.docx");
	});

	it("should return name without extension when none provided", () => {
		expect(generateFilename("My Resume")).toBe("My Resume");
	});

	it("should preserve the exact resume name with special characters", () => {
		expect(generateFilename("Luka Fagundes -CS Base - Program Coordinator", "docx")).toBe(
			"Luka Fagundes -CS Base - Program Coordinator.docx",
		);
	});

	it("should work with pdf extension", () => {
		expect(generateFilename("Luka Fagundes -CS Base - Program Coordinator", "pdf")).toBe(
			"Luka Fagundes -CS Base - Program Coordinator.pdf",
		);
	});

	it("should work with json extension", () => {
		expect(generateFilename("Luka Fagundes -CS Base - Program Coordinator", "json")).toBe(
			"Luka Fagundes -CS Base - Program Coordinator.json",
		);
	});
});
