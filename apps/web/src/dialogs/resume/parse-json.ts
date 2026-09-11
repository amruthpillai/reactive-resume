import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { parseJSONResume } from "@reactive-resume/import/json-resume";
import { parseReactiveResumeJSON } from "@reactive-resume/import/reactive-resume-json";
import { parseReactiveResumeV4JSON } from "@reactive-resume/import/reactive-resume-v4-json";

export type ResumeJsonFormat = "reactive-resume-json" | "reactive-resume-v4-json" | "json-resume-json";

export function parseResumeJson(text: string, format: ResumeJsonFormat): ResumeData {
	if (format === "reactive-resume-json") return parseReactiveResumeJSON(text);
	if (format === "reactive-resume-v4-json") return parseReactiveResumeV4JSON(text);
	return parseJSONResume(text);
}
