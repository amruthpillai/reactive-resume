import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./primitives.tsx", import.meta.url)), "utf8");

describe("SectionHeadingIcon", () => {
	it("passes the resolved heading icon size through the icon size prop", () => {
		expect(source).toContain("size: sizeProp");
		expect(source).toContain("{...(resolvedSize === undefined ? {} : { size: resolvedSize })}");
		expect(source).not.toContain("{ size: headingFontSize } as Style");
	});
});
