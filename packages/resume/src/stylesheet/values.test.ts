import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { StylesheetCompilationCache, stylesheetCacheKey } from "./cache";
import { compileStylesheet } from "./compile";
import { SEMANTIC_CSS_LIMITS_V1 } from "./limits";

function escapedIdentifier(identifier: string, escaped: readonly boolean[], uppercase: readonly boolean[]): string {
	return [...identifier]
		.map((character, index) => {
			const cased = uppercase[index] ? character.toUpperCase() : character;
			return escaped[index] ? `\\${cased.codePointAt(0)?.toString(16)} ` : cased;
		})
		.join("");
}

function mediaList(count: number): string {
	return Array.from({ length: count }, (_, index) => `(min-width: ${index + 1}pt)`).join(",");
}

function legacyFingerprint(source: string): string {
	let hash = 2_166_136_261;
	for (let index = 0; index < source.length; index++) {
		hash ^= source.charCodeAt(index);
		hash = Math.imul(hash, 16_777_619);
	}
	return `${hash >>> 0}:${source.length}`;
}

function expectedSides(tokens: readonly number[]): readonly [number, number, number, number] {
	switch (tokens.length) {
		case 1:
			return [tokens[0] as number, tokens[0] as number, tokens[0] as number, tokens[0] as number];
		case 2:
			return [tokens[0] as number, tokens[1] as number, tokens[0] as number, tokens[1] as number];
		case 3:
			return [tokens[0] as number, tokens[1] as number, tokens[2] as number, tokens[1] as number];
		default:
			return [tokens[0] as number, tokens[1] as number, tokens[2] as number, tokens[3] as number];
	}
}

describe("Semantic CSS value compilation", () => {
	it("compiles and caches the portable version-one fixture as plain data", () => {
		const text = readFileSync(new URL("./__fixtures__/v1/portable-theme.css", import.meta.url), "utf8");
		const first = compileStylesheet({ languageVersion: 1, text });
		const second = compileStylesheet({ languageVersion: 1, text });

		expect(first.program).not.toBeNull();
		expect(second.program).toBe(first.program);
		expect(() => structuredClone(first.program)).not.toThrow();
	});

	it("keeps valid rules and declarations when neighboring fragments are invalid", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1; section:hover { color: red; } name { unknown: 1; color: #123456; }",
		});

		expect(result.program?.rules).toEqual([
			expect.objectContaining({
				declarations: [expect.objectContaining({ property: "color", value: "#123456" })],
			}),
		]);
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ code: "INVALID_SELECTOR", severity: "error" }),
				expect.objectContaining({ code: "UNSUPPORTED_PROPERTY", severity: "error" }),
			]),
		);
	});

	it("omits an invalid value without dropping valid declarations in the rule", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1; name { opacity: 2; color: #123456; }",
		});

		expect(result.program?.rules[0]?.declarations).toEqual([
			expect.objectContaining({ property: "color", value: "#123456" }),
		]);
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }));
	});

	it("rejects assignments to reserved system variables", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1; :root { --resume-primary-color: red; } name { color: blue; }",
		});

		expect(result.program).not.toBeNull();
		expect(result.diagnostics).toContainEqual(
			expect.objectContaining({ code: "SYSTEM_VARIABLE_READONLY", severity: "error" }),
		);
	});

	it("revalidates custom-property values so forbidden functions cannot hide", () => {
		for (const value of ["url('https://example.com/x')", "URL(x)", "u\\72l(x)"]) {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@version 1; :root { --asset: ${value}; } picture { background-color: var(--asset); }`,
			});

			expect(result.program, value).not.toBeNull();
			expect(result.diagnostics, value).toContainEqual(
				expect.objectContaining({ code: "FORBIDDEN_CSS_VALUE", severity: "error" }),
			);
		}
	});

	it("allows technically renderable values and warns about extreme aesthetics", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1; field { font-size: 3pt; }",
		});

		expect(result.program).not.toBeNull();
		expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "EXTREME_VALUE", severity: "warning" }));
	});

	it("rejects non-finite or technically unrenderable absolute lengths", () => {
		for (const value of ["100001pt", "1e309pt"]) {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@version 1; field { margin-top: ${value}; }`,
			});
			expect(result.program, value).not.toBeNull();
			expect(result.diagnostics, value).toContainEqual(
				expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }),
			);
		}
	});

	it.each(["auto", "none", "normal", "max-content", "min-content", "fit-content", "thin", "medium", "thick"])(
		"preserves the accepted generic length keyword %s when reference hints are narrower",
		(value) => {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@version 1; section { -resume-min-presence-ahead: ${value}; }`,
			});

			expect(result.program).not.toBeNull();
			expect(result.diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
		},
	);

	it.each(["none", "hidden", "double", "groove", "ridge", "inset", "outset"])(
		"rejects the undocumented border style %s",
		(value) => {
			const result = compileStylesheet({
				languageVersion: 1,
				text: `@version 1; section { border-style: ${value}; }`,
			});

			expect(result.program).not.toBeNull();
			expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }));
		},
	);

	it.each([
		{
			name: "source bytes",
			exact: (() => {
				const prefix = "@version 1;";
				return prefix + " ".repeat(SEMANTIC_CSS_LIMITS_V1.maxSourceBytes - new TextEncoder().encode(prefix).byteLength);
			})(),
			oneOver: (() => {
				const prefix = "@version 1;";
				return `${prefix}${" ".repeat(SEMANTIC_CSS_LIMITS_V1.maxSourceBytes - new TextEncoder().encode(prefix).byteLength)} `;
			})(),
			expectedRules: 0,
			expectedDeclarations: undefined,
		},
		{
			name: "rule count",
			exact: `@version 1;${"field{color:red}".repeat(SEMANTIC_CSS_LIMITS_V1.maxRules)}`,
			oneOver: `@version 1;${"field{color:red}".repeat(SEMANTIC_CSS_LIMITS_V1.maxRules + 1)}`,
			expectedRules: SEMANTIC_CSS_LIMITS_V1.maxRules,
			expectedDeclarations: 1,
		},
		{
			name: "declaration count",
			exact: `@version 1;field{${"color:red;".repeat(SEMANTIC_CSS_LIMITS_V1.maxDeclarations)}}`,
			oneOver: `@version 1;field{${"color:red;".repeat(SEMANTIC_CSS_LIMITS_V1.maxDeclarations + 1)}}`,
			expectedRules: 1,
			expectedDeclarations: SEMANTIC_CSS_LIMITS_V1.maxDeclarations,
		},
		{
			name: "function nesting",
			exact: `@version 1;field{color:${"rgb(".repeat(SEMANTIC_CSS_LIMITS_V1.maxFunctionDepth)}0${")".repeat(SEMANTIC_CSS_LIMITS_V1.maxFunctionDepth)}}`,
			oneOver: `@version 1;field{color:${"rgb(".repeat(SEMANTIC_CSS_LIMITS_V1.maxFunctionDepth + 1)}0${")".repeat(SEMANTIC_CSS_LIMITS_V1.maxFunctionDepth + 1)}}`,
			expectedRules: 1,
			expectedDeclarations: 1,
		},
		{
			name: "media nesting",
			exact: `@version 1;${"@media (width: 1pt){".repeat(SEMANTIC_CSS_LIMITS_V1.maxMediaNesting)}field{color:red}${"}".repeat(SEMANTIC_CSS_LIMITS_V1.maxMediaNesting)}`,
			oneOver: `@version 1;${"@media (width: 1pt){".repeat(SEMANTIC_CSS_LIMITS_V1.maxMediaNesting + 1)}field{color:red}${"}".repeat(SEMANTIC_CSS_LIMITS_V1.maxMediaNesting + 1)}`,
			expectedRules: 1,
			expectedDeclarations: 1,
		},
	])(
		"accepts the exact $name limit and rejects one over",
		({ exact, oneOver, expectedRules, expectedDeclarations }) => {
			const accepted = compileStylesheet({ languageVersion: 1, text: exact });
			expect(accepted.program?.rules).toHaveLength(expectedRules);
			if (expectedDeclarations !== undefined) {
				expect(accepted.program?.rules[0]?.declarations).toHaveLength(expectedDeclarations);
			}

			const rejected = compileStylesheet({ languageVersion: 1, text: oneOver });
			expect(rejected.program).toBeNull();
			expect(rejected.diagnostics).toContainEqual(
				expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }),
			);
		},
	);

	it("bounds the Cartesian product of nested media lists before construction", () => {
		fc.assert(
			fc.property(fc.integer({ min: 33, max: 40 }), (branchCount) => {
				const queries = mediaList(branchCount);
				const result = compileStylesheet({
					languageVersion: 1,
					text: `@version 1;@media ${queries}{@media ${queries}{field{color:red}}}`,
				});

				expect(result.program).toBeNull();
				expect(result.diagnostics).toContainEqual(
					expect.objectContaining({ code: "RESOURCE_LIMIT", severity: "error" }),
				);
			}),
			{ numRuns: 8 },
		);
	});

	it("rejects invalid trailing flex tokens instead of silently ignoring them", () => {
		fc.assert(
			fc.property(fc.integer({ min: 0, max: 10 }), fc.stringMatching(/^[a-z]{1,6}$/), (grow, trailing) => {
				const result = compileStylesheet({
					languageVersion: 1,
					text: `@version 1;section{flex:${grow} auto ${trailing}}`,
				});

				expect(result.program).not.toBeNull();
				expect(result.diagnostics).toContainEqual(
					expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }),
				);
			}),
			{ numRuns: 20 },
		);
	});

	it("accepts CSS-wide keywords only as whole shorthand declarations", () => {
		const accepted = compileStylesheet({
			languageVersion: 1,
			text: "@version 1;section{flex-flow:inherit}",
		});
		expect(accepted.program).not.toBeNull();

		for (const declaration of [
			"flex-flow:row inherit",
			"flex:1 inherit",
			"gap:1pt inherit",
			"margin:1pt inherit",
			"border:1pt solid inherit",
			"border-style:solid inherit",
		]) {
			const rejected = compileStylesheet({
				languageVersion: 1,
				text: `@version 1;section{${declaration}}`,
			});

			expect(rejected.program, declaration).not.toBeNull();
			expect(rejected.diagnostics, declaration).toContainEqual(
				expect.objectContaining({ code: "INVALID_VALUE", severity: "error" }),
			);
		}
	});

	it("preserves CSS-wide identifiers inside custom-property token streams", () => {
		const result = compileStylesheet({
			languageVersion: 1,
			text: "@version 1;:root{--tokens:row inherit}",
		});

		expect(result.program).not.toBeNull();
		expect(result.program?.rules[0]?.declarations).toContainEqual(
			expect.objectContaining({ property: "--tokens", value: "row inherit" }),
		);
		expect(result.diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
	});

	it("expands generated one-to-four-token shorthands with CSS side semantics", () => {
		fc.assert(
			fc.property(
				fc.constantFrom("margin", "padding", "border-width"),
				fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 1, maxLength: 4 }),
				(property, tokens) => {
					const values = tokens.map((token) => `${token}pt`).join(" ");
					const result = compileStylesheet({
						languageVersion: 1,
						text: `@version 1;section{${property}:${values}}`,
					});
					if (!result.program) throw new Error(result.diagnostics.map(({ code }) => code).join(","));
					const [top, right, bottom, left] = expectedSides(tokens);
					const expected =
						property === "border-width"
							? {
									"border-top-width": `${top}pt`,
									"border-right-width": `${right}pt`,
									"border-bottom-width": `${bottom}pt`,
									"border-left-width": `${left}pt`,
								}
							: {
									[`${property}-top`]: `${top}pt`,
									[`${property}-right`]: `${right}pt`,
									[`${property}-bottom`]: `${bottom}pt`,
									[`${property}-left`]: `${left}pt`,
								};

					expect(
						Object.fromEntries(
							(result.program.rules[0]?.declarations ?? []).map(({ property: name, value }) => [name, value]),
						),
					).toEqual(expected);
				},
			),
			{ numRuns: 60 },
		);
	});

	it("uses exact source text in cache keys even when the legacy fingerprints collide", () => {
		const first = "s0@h,]UQ";
		const second = "b(tT0e7(";

		expect(legacyFingerprint(first)).toBe(legacyFingerprint(second));
		expect(stylesheetCacheKey(1, first, "registry")).not.toBe(stylesheetCacheKey(1, second, "registry"));
	});

	it("uses a bounded least-recently-used cache by entry count and aggregate bytes", () => {
		const cache = new StylesheetCompilationCache();
		const result = compileStylesheet({ languageVersion: 1, text: "@version 1;" });

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

		const large = (code: string) => ({
			program: null,
			diagnostics: [
				{
					code,
					severity: "warning" as const,
					message: "x".repeat(9 * 1024 * 1024),
					range: {
						start: { line: 1, column: 1, offset: 0 },
						end: { line: 1, column: 1, offset: 0 },
					},
				},
			],
		});
		cache.set("large-first", large("FIRST"));
		cache.set("large-second", large("SECOND"));
		expect(cache.get("large-first")).toBeUndefined();
		expect(cache.get("large-second")).toBeDefined();
	});

	it("never throws for malformed Unicode or case/escape-varied attack values", () => {
		fc.assert(
			fc.property(
				fc.string({ unit: fc.integer({ min: 0, max: 0xffff }).map((codeUnit) => String.fromCharCode(codeUnit)) }),
				(body) => {
					expect(() => compileStylesheet({ languageVersion: 1, text: `@version 1;${body}` })).not.toThrow();
				},
			),
			{ numRuns: 100 },
		);
		const forbiddenBody = fc.oneof(
			fc
				.tuple(
					fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
					fc.array(fc.boolean(), { minLength: 6, maxLength: 6 }),
				)
				.map(([escaped, uppercase]) => ({
					body: `@${escapedIdentifier("import", escaped, uppercase)} 'x';`,
					code: "FORBIDDEN_AT_RULE",
				})),
			fc
				.tuple(
					fc.array(fc.boolean(), { minLength: 9, maxLength: 9 }),
					fc.array(fc.boolean(), { minLength: 9, maxLength: 9 }),
				)
				.map(([escaped, uppercase]) => ({
					body: `@${escapedIdentifier("font-face", escaped, uppercase)}{}`,
					code: "FORBIDDEN_AT_RULE",
				})),
			fc
				.tuple(
					fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
					fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
				)
				.map(([escaped, uppercase]) => ({
					body: `:root{--x:${escapedIdentifier("url", escaped, uppercase)}(x)}field{color:var(--x)}`,
					code: "FORBIDDEN_CSS_VALUE",
				})),
			fc
				.tuple(
					fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
					fc.array(fc.boolean(), { minLength: 3, maxLength: 3 }),
				)
				.map(([escaped, uppercase]) => ({
					body: `field{${escapedIdentifier("src", escaped, uppercase)}:x}`,
					code: "FORBIDDEN_CSS_VALUE",
				})),
		);
		fc.assert(
			fc.property(forbiddenBody, ({ body, code }) => {
				const result = compileStylesheet({ languageVersion: 1, text: `@version 1;${body}` });
				expect(result.program).not.toBeNull();
				expect(result.diagnostics).toContainEqual(expect.objectContaining({ code, severity: "error" }));
			}),
			{ numRuns: 100 },
		);
	});

	it("publishes the exact frozen version-one limits contract", () => {
		expect(SEMANTIC_CSS_LIMITS_V1).toEqual({
			maxSourceBytes: 128 * 1024,
			maxRules: 1_024,
			maxDeclarations: 8_192,
			maxSelectorsPerRule: 64,
			maxSelectorCodePoints: 2_048,
			maxCombinatorsPerSelector: 16,
			maxFunctionDepth: 16,
			maxVariableExpansionDepth: 32,
			maxMediaNesting: 4,
			maxSemanticNodes: 20_000,
			maxAbsoluteLengthPt: 100_000,
		});
		expect(Object.isFrozen(SEMANTIC_CSS_LIMITS_V1)).toBe(true);
	});

	it("keeps every successful compiled program structured-clone-safe", () => {
		fc.assert(
			fc.property(fc.constantFrom("red", "#123456", "rgb(1, 2, 3)", "var(--accent, blue)"), (color) => {
				const result = compileStylesheet({
					languageVersion: 1,
					text: `@version 1; name { color: ${color}; }`,
				});
				expect(result.program).not.toBeNull();
				expect(() => structuredClone(result.program)).not.toThrow();
			}),
			{ numRuns: 20 },
		);
	});
});
