import { ORPCError } from "@orpc/client";
import { assertResumeData } from "@reactive-resume/schema/resume/data";

function assertApiResumeData(data: unknown, code: "BAD_REQUEST" | "INTERNAL_SERVER_ERROR", message: string) {
	try {
		assertResumeData(data);
	} catch (cause) {
		throw new ORPCError(code, {
			status: code === "BAD_REQUEST" ? 400 : 500,
			message,
			cause,
		});
	}
}

export function assertWritableResumeData(data: unknown) {
	assertApiResumeData(data, "BAD_REQUEST", "Resume data does not match the canonical schema.");
}

export function assertStoredResumeData(data: unknown) {
	assertApiResumeData(data, "INTERNAL_SERVER_ERROR", "Stored resume data does not match the canonical schema.");
}
