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

	it("rejects duplicate directives", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 1;\n@rr-version 1;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "DUPLICATE_RR_VERSION_DIRECTIVE", severity: "error" }),
		);
	});

	it("rejects malformed directives", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version one;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "INVALID_RR_VERSION", severity: "error" }),
		);
	});

	it("rejects non-positive directives", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 0;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "INVALID_RR_VERSION", severity: "error" }),
		);
	});

	it("rejects unsupported persisted language versions", () => {
		const result = compileStylesheet({ languageVersion: 2, text: "@rr-version 2;" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "UNSUPPORTED_RR_VERSION", severity: "error" }),
		);
	});

	it("does not compile a recovered CSS error", () => {
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 1;\nsection { color red; }" });

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "CSS_PARSE_ERROR", severity: "error" }));
	});
});
