import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { ORPCError } from "@orpc/client";
import { parseResumeData } from "@reactive-resume/schema/resume/data";

function parseApiResumeData(data: unknown, code: "BAD_REQUEST" | "INTERNAL_SERVER_ERROR", message: string): ResumeData {
	try {
		return parseResumeData(data);
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
