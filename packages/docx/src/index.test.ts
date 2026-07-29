// @vitest-environment happy-dom

import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { describe, expect, it } from "vitest";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { buildDocx } from "./index";

const createRendererUnsafeResumeData = (): ResumeData => {
	const data = structuredClone(defaultResumeData);
	data.customSections = [
		{
			id: "custom-experience",
			type: "experience",
			title: "Experience",
			icon: "",
			columns: 1,
			hidden: false,
			keepTogether: false,
			startOnNewPage: false,
			items: [{ id: "summary-shaped-item", hidden: false, content: "<p>Missing company</p>" }],
		} as never,
	];
	return data;
};

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

	it("returns a rejected Promise when document building fails synchronously", async () => {
		const promise = buildDocx(undefined as never);

		expect(promise).toBeInstanceOf(Promise);
		await expect(promise).rejects.toThrow();
	});

	it("rejects renderer-unsafe data before DOCX builder dispatch", async () => {
		const error = await buildDocx(createRendererUnsafeResumeData()).catch((caught: unknown) => caught);

		expect(error).toHaveProperty("issues.0.path", ["customSections", 0, "items", 0, "company"]);
	});
});
