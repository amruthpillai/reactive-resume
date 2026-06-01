import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./custom.tsx", import.meta.url), "utf8");

function rendererBody(name: string) {
	const start = source.indexOf(`render: function ${name}({ form }) {`);
	expect(start).toBeGreaterThanOrEqual(0);

	const end =
		name === "CreateCustomSectionFormRenderer" ? source.indexOf("const UpdateCustomSectionForm", start) : source.length;
	expect(end).toBeGreaterThan(start);

	return source.slice(start, end);
}

describe("custom section dialog layout", () => {
	it.each([
		"CreateCustomSectionFormRenderer",
		"UpdateCustomSectionFormRenderer",
	])("renders icon and title in one row for %s", (name) => {
		const body = rendererBody(name);
		const rowIndex = body.indexOf('"flex items-end sm:col-span-full"');
		const iconIndex = body.indexOf('name="icon"', rowIndex);
		const titleIndex = body.indexOf('name="title"', rowIndex);
		const sectionTypeIndex = body.indexOf('name="type"', rowIndex);

		expect(rowIndex).toBeGreaterThanOrEqual(0);
		expect(iconIndex).toBeGreaterThan(rowIndex);
		expect(titleIndex).toBeGreaterThan(iconIndex);
		expect(sectionTypeIndex).toBeGreaterThan(titleIndex);
		expect(body).toContain('className="rounded-r-none border-input border-e-0"');
		expect(body).toContain('className="rounded-s-none"');
	});
});
