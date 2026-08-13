import { describe, expect, it } from "vitest";
import { parseResumeJson } from "./parse-json";

describe("parseResumeJson", () => {
	it("keeps a selected v4 import from falling back to JSON Resume", () => {
		expect(() => parseResumeJson("{}", "reactive-resume-v4-json")).toThrow(/v4/i);
	});
});
