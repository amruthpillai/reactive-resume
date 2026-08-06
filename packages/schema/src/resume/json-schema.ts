import type { CustomSectionType } from "./data";
import z from "zod";
import { customSectionItemDefinitionByType, resumeDataSchema, sectionTypeSchema } from "./data";

const toInputJsonSchema = (schema: z.ZodType) =>
	z.toJSONSchema(schema, {
		io: "input",
		unrepresentable: "any",
	});

export function createResumeDataJsonSchema() {
	return toInputJsonSchema(resumeDataSchema);
}

export function createCustomSectionItemJsonSchemas() {
	return Object.fromEntries(
		sectionTypeSchema.options.map((type) => {
			const { schemaName, schema } = customSectionItemDefinitionByType[type];
			return [type, { schemaName, schema: toInputJsonSchema(schema) }];
		}),
	) as Record<
		CustomSectionType,
		{
			schemaName: (typeof customSectionItemDefinitionByType)[CustomSectionType]["schemaName"];
			schema: ReturnType<typeof toInputJsonSchema>;
		}
	>;
}
