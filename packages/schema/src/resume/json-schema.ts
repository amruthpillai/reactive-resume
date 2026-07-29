import z from "zod";
import { resumeDataSchema } from "./data";

export function createResumeDataJsonSchema() {
	return z.toJSONSchema(resumeDataSchema, {
		io: "input",
		unrepresentable: "any",
	});
}
