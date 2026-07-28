import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { StylesheetCompilationCache } from "./cache";
import { compileStylesheet } from "./compile";

describe("RRSS value compilation", () => {
	it("compiles and caches the portable version-one fixture as plain data", () => {
		const text = readFileSync(new URL("./__fixtures__/v1/portable-theme.css", import.meta.url), "utf8");
		const first = compileStylesheet({ languageVersion: 1, text });
		const second = compileStylesheet({ languageVersion: 1, text });

		expect(first.program).not.toBeNull();
		expect(second.program).toBe(first.program);
		expect(() => structuredClone(first.program)).not.toThrow();
	});

	it("rejects assignments to reserved system variables", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@rr-version 1; :root { --rr-primary-color: red; } name { color: blue; }",
		});

		expect(result.program).toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "SYSTEM_VARIABLE_READONLY", severity: "error" }),
		);
	});

	it("revalidates custom-property values so forbidden functions cannot hide", () => {
		for (const value of ["url('https://example.com/x')", "URL(x)", "u\\72l(x)"]) {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@rr-version 1; :root { --asset: ${value}; } picture { background-color: var(--asset); }`,
			});

			expect(result.program, value).toBeNull();
			expect(result.diagnostics, value).toContainEqual(
				expect.objectContaining({ code: "FORBIDDEN_CSS_VALUE", severity: "error" }),
			);
		}
	});

	it("allows technically renderable values and warns about extreme aesthetics", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@rr-version 1; field { font-size: 3pt; }",
		});

		expect(result.program).not.toBeNull();
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "EXTREME_VALUE", severity: "warning" }));
	});

	it("rejects non-finite or technically unrenderable absolute lengths", () => {
		for (const value of ["100001pt", "1e309pt"]) {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@rr-version 1; field { margin-top: ${value}; }`,
			});
			expect(result.program, value).toBeNull();
			expect(result.diagnostics, value).toContainEqual(
				expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }),
			);
		}
	});

	it("enforces source, rule, declaration, function, and media limits with one diagnostic code", () => {
		const cases = [
			`@rr-version 1;${" ".repeat(131_059)}`,
			`@rr-version 1;${"field{color:red}".repeat(1_025)}`,
			`@rr-version 1;field{${"color:red;".repeat(8_193)}}`,
			`@rr-version 1;field{color:${"rgb(".repeat(17)}0${")".repeat(17)}}`,
			`@rr-version 1;${"@media (width: 1pt){".repeat(5)}field{color:red}${"}".repeat(5)}`,
		];

		for (const text of cases) {
			const result = compileStylesheet({ languageVersion: 1, text });
			expect(result.program).toBeNull();
			expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }));
		}
	});

	it("uses a bounded least-recently-used cache", () => {
		const cache = new StylesheetCompilationCache();
		const result = compileStylesheet({ languageVersion: 1, text: "@rr-version 1;" });

		cache.set("first", result);
		for (let index = 0; index < 128; index++) cache.set(`next-${index}`, result);

		expect(cache.get("first")).toBeUndefined();
		expect(cache.get("next-0")).toBe(result);
		cache.set("last", result);
		expect(cache.get("next-1")).toBeUndefined();

		cache.set("oversized", {
			program: null,
			diagnostics: [
				{
					code: "LARGE",
					severity: "warning",
					message: "x".repeat(16 * 1024 * 1024),
					range: {
						start: { line: 1, column: 1, offset: 0 },
						end: { line: 1, column: 1, offset: 0 },
					},
				},
			],
		});
		expect(cache.get("oversized")).toBeUndefined();
	});

	it("never throws for malformed Unicode or case/escape-varied attack values", () => {
		fc.assert(
			fc.property(
				fc.string({ unit: fc.integer({ min: 0, max: 0xffff }).map((codeUnit) => String.fromCharCode(codeUnit)) }),
				(body) => {
					expect(() => compileStylesheet({ languageVersion: 1, text: `@rr-version 1;${body}` })).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
		fc.assert(
			fc.property(
				fc.constantFrom(
					"@IMPORT 'x';",
					"@\\69mport 'x';",
					"@FONT-FACE { src: URL(x); }",
					":root { --x: u\\72l(x); } field { color: var(--x); }",
				),
				(body) => {
					const result = compileStylesheet({ languageVersion: 1, text: `@rr-version 1;${body}` });
					expect(result.program).toBeNull();
				},
			),
			{ numRuns: 20 },
		);
	});

	it("keeps every successful compiled program structured-clone-safe", () => {
		fc.assert(
			fc.property(fc.constantFrom("red", "#123456", "rgb(1, 2, 3)", "var(--accent, blue)"), (color) => {
				const result = compileStylesheet({
					languageVersion: 1,
					text: `@rr-version 1; name { color: ${color}; }`,
				});
				expect(result.program).not.toBeNull();
				expect(() => structuredClone(result.program)).not.toThrow();
			}),
			{ numRuns: 20 },
		);
	});
});
