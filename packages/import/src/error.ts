import { ZodError } from "zod";

const MAX_LISTED_ISSUES = 3;

const describeIssuePath = (path: ReadonlyArray<PropertyKey>): string =>
	path.length > 0 ? path.map((segment) => String(segment)).join(".") : "the document";

/** Builds a short, human-readable summary from a ZodError instead of a raw JSON dump. */
const summarizeZodError = (error: ZodError): string => {
	if (error.issues.length === 0) return "The file could not be read as a valid resume.";

	const listed = error.issues
		.slice(0, MAX_LISTED_ISSUES)
		.map((issue) => `${describeIssuePath(issue.path)} (${issue.message})`)
		.join(", ");

	const remaining = error.issues.length - MAX_LISTED_ISSUES;
	const suffix = remaining > 0 ? `, and ${remaining} more field${remaining === 1 ? "" : "s"}` : "";

	return `The file could not be read as a valid resume. Problem fields: ${listed}${suffix}.`;
};

/** Rethrows a ZodError as a human-readable import error; re-throws other errors as-is. */
export function rethrowAsImportError(error: unknown): never {
	if (error instanceof ZodError) {
		throw new Error(summarizeZodError(error));
	}
	throw error;
}
