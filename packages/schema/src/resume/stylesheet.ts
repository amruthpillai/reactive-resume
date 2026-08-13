import { z } from "zod";

export const EMPTY_SEMANTIC_CSS_SOURCE = "@version 1;\n";

export const stylesheetSourceSchema = z.strictObject({
	languageVersion: z.number().int().positive(),
	text: z.string(),
});

export const semanticStylesheetSchema = z.strictObject({
	mode: z.enum(["legacy", "semantic"]),
	source: stylesheetSourceSchema,
	applied: stylesheetSourceSchema,
});

export type StylesheetSource = z.infer<typeof stylesheetSourceSchema>;
export type SemanticStylesheet = z.infer<typeof semanticStylesheetSchema>;
export type StylesheetMode = SemanticStylesheet["mode"];
