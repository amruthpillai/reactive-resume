import type { InferSchemaOutput, Schema } from "@orpc/server";
import type { RrssDiagnostic } from "@reactive-resume/resume/stylesheet";
import type z from "zod";
import type { resumeDto } from "../../dto/resume";
import { describe, expect, expectTypeOf, it } from "vitest";
import { stylesheetRouter } from "./stylesheet";

type MutateErrorMap = (typeof stylesheetRouter.mutate)["~orpc"]["errorMap"];
type ErrorData<TKey extends keyof MutateErrorMap> = MutateErrorMap[TKey] extends {
	data: infer TSchema extends Schema<unknown, unknown>;
}
	? InferSchemaOutput<TSchema>
	: never;
type StylesheetState = z.infer<typeof resumeDto.stylesheet.getState.output>;

const source = { languageVersion: 1, text: "@rr-version 1;\n" };
const state = {
	stylesheet: { mode: "semantic" as const, source, applied: source },
	revision: 4,
	renderDataVersion: 8,
};
const diagnostic = {
	code: "PARSE_ERROR",
	severity: "error" as const,
	message: "Invalid stylesheet.",
	range: {
		start: { line: 1, column: 1, offset: 0 },
		end: { line: 1, column: 1, offset: 0 },
	},
};

const dataSchema = (code: keyof MutateErrorMap) => {
	const error = stylesheetRouter.mutate["~orpc"].errorMap[code];
	const schema = error && "data" in error ? error.data : undefined;
	expect(schema, `${String(code)} must declare an oRPC data schema`).toBeDefined();
	return schema as z.ZodType;
};

describe("resume stylesheet route error contract", () => {
	it("exposes strict validation diagnostic data at runtime and in the inferred client error", () => {
		const schema = dataSchema("STYLESHEET_VALIDATION_FAILED");

		expect(schema.safeParse({ diagnostics: [diagnostic] }).success).toBe(true);
		expect(schema.safeParse({ diagnostics: [diagnostic], source }).success).toBe(false);
		expect(schema.safeParse({ diagnostics: [{ ...diagnostic, source }] }).success).toBe(false);
		expectTypeOf<ErrorData<"STYLESHEET_VALIDATION_FAILED">>().toEqualTypeOf<{
			diagnostics: RrssDiagnostic[];
		}>();
	});

	it("exposes strict parity mismatch data at runtime and in the inferred client error", () => {
		const schema = dataSchema("STYLESHEET_PARITY_FAILED");

		expect(schema.safeParse({ mismatches: ["onyx: page 1"] }).success).toBe(true);
		expect(schema.safeParse({ mismatches: ["onyx: page 1"], source }).success).toBe(false);
		expectTypeOf<ErrorData<"STYLESHEET_PARITY_FAILED">>().toEqualTypeOf<{ mismatches: string[] }>();
	});

	it("exposes strict canonical conflict state for type-safe client rebasing", () => {
		const schema = dataSchema("STYLESHEET_REVISION_CONFLICT");

		expect(schema.safeParse({ state }).success).toBe(true);
		expect(schema.safeParse({ state, expectedRevision: 3 }).success).toBe(false);
		expect(schema.safeParse({ state: { ...state, source } }).success).toBe(false);
		expectTypeOf<ErrorData<"STYLESHEET_REVISION_CONFLICT">>().toEqualTypeOf<{
			state: StylesheetState;
		}>();
	});

	it("does not invent data for the message-only unavailable error", () => {
		expect("data" in stylesheetRouter.mutate["~orpc"].errorMap.SEMANTIC_STYLESHEET_UNAVAILABLE).toBe(false);
	});
});
