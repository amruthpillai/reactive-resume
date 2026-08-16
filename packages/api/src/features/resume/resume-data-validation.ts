import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/client";
import { SEMANTIC_CSS_LIMITS_V1 } from "@reactive-resume/resume/stylesheet";
import { parseResumeData } from "@reactive-resume/schema/resume/data";

function parseApiResumeData(data: unknown, code: "BAD_REQUEST" | "INTERNAL_SERVER_ERROR", message: string): ResumeData {
	try {
		const parsed = parseResumeData(data);
		const source = parsed.metadata.stylesheet?.source.text;
		if (source !== undefined && new TextEncoder().encode(source).byteLength > SEMANTIC_CSS_LIMITS_V1.maxSourceBytes) {
			throw new Error("The stylesheet source exceeds the Semantic CSS byte limit.");
		}
		return parsed;
	} catch (cause) {
		throw new ORPCError(code, {
			status: code === "BAD_REQUEST" ? 400 : 500,
			message,
			cause,
		});
	}
}

export const parseWritableResumeData = (data: unknown) =>
	parseApiResumeData(data, "BAD_REQUEST", "Resume data does not match the canonical schema.");

export const parseStoredResumeData = (data: unknown) =>
	parseApiResumeData(data, "INTERNAL_SERVER_ERROR", "Stored resume data does not match the canonical schema.");
