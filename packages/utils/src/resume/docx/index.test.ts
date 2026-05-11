// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { buildDocx } from "./index";

describe("buildDocx", () => {
	it("returns a Blob for the default resume", async () => {
		const blob = await buildDocx(defaultResumeData);
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.size).toBeGreaterThan(0);
	});

	it("produces a non-empty document for a populated resume", async () => {
		const data = structuredClone(defaultResumeData);
		data.basics.name = "Jane Doe";
		data.basics.headline = "Engineer";
		data.basics.email = "jane@example.com";

		const blob = await buildDocx(data);
		expect(blob.size).toBeGreaterThan(0);
	});
});
