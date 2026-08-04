import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { parseJSONResume } from "@reactive-resume/import/json-resume";
import { parseReactiveResumeJSON } from "@reactive-resume/import/reactive-resume-json";
import { parseReactiveResumeV4JSON } from "@reactive-resume/import/reactive-resume-v4-json";

export type ResumeJsonFormat = "reactive-resume-json" | "reactive-resume-v4-json" | "json-resume-json";

const PARSERS: Record<ResumeJsonFormat, (json: string) => ResumeData> = {
	"reactive-resume-json": parseReactiveResumeJSON,
	"reactive-resume-v4-json": parseReactiveResumeV4JSON,
	"json-resume-json": parseJSONResume,
};

// Strict, specific formats first; the permissive JSON Resume parser last so it
// never wins over a real Reactive Resume export.
const FORMAT_ORDER: readonly ResumeJsonFormat[] = [
	"reactive-resume-json",
	"reactive-resume-v4-json",
	"json-resume-json",
];

export type ParsedResumeJson = { format: ResumeJsonFormat; data: ResumeData };

/**
 * Parses a JSON resume by trying each supported format and returning the first that
 * succeeds. The detected/selected `preferred` format is attempted first, so a correct
 * guess is used as-is; a wrong guess transparently falls back to the other formats
 * instead of surfacing a crash or a "wrong type" error to the user.
 */
export function parseResumeJson(text: string, preferred?: ResumeJsonFormat): ParsedResumeJson {
	const order: ResumeJsonFormat[] = [];
	if (preferred) order.push(preferred);
	for (const format of FORMAT_ORDER) {
		if (format !== preferred) order.push(format);
	}

	let firstError: Error | undefined;
	for (const format of order) {
		try {
			return { format, data: PARSERS[format](text) };
		} catch (error) {
			firstError ??= error instanceof Error ? error : new Error(String(error));
		}
	}

	// All formats failed. Malformed JSON surfaces as a low-level SyntaxError from
	// every parser, so give it a friendly message; otherwise re-throw the preferred
	// parser's already human-readable error (the readable Zod summary or v4 guard).
	if (firstError instanceof SyntaxError) {
		throw new Error("We couldn't read this file as a resume. It doesn't look like valid JSON.");
	}
	throw firstError ?? new Error("We couldn't read this file as a resume.");
}
