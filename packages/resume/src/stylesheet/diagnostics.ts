import type { RrssDiagnostic, SourceRange } from "./types";

export const EMPTY_SOURCE_RANGE: SourceRange = {
	start: { line: 1, column: 1, offset: 0 },
	end: { line: 1, column: 1, offset: 0 },
};

export function createDiagnostic(
	code: string,
	severity: RrssDiagnostic["severity"],
	message: string,
	range: SourceRange = EMPTY_SOURCE_RANGE,
): RrssDiagnostic {
	return { code, severity, message, range };
}
