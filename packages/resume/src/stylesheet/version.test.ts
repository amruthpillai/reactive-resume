import { describe, expect, it } from "vitest";
import { compileStylesheet } from "./compile";

describe("compileStylesheet", () => {
	it("compiles canonical version-one source", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@rr-version 1;\nsection { color: #123456; }\n",
		});

		expect(result.program?.languageVersion).toBe(1);
		expect(result.diagnostics).toEqual([]);
	});

	it("warns when version-one source omits the directive", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "section { color: red; }" });

		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "MISSING_VERSION_DIRECTIVE", severity: "warning" }),
		);
	});

	it("rejects a directive that disagrees with persisted metadata", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 2;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "RR_VERSION_MISMATCH", severity: "error" }),
		);
	});
});
