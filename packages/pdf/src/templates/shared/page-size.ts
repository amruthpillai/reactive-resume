import type { ResumeData } from "@reactive-resume/schema/resume/data";

export const getTemplatePageSize = (format: ResumeData["metadata"]["page"]["format"]) =>
	format === "letter" ? "LETTER" : "A4";
