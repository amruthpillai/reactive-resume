import type { CustomSectionType } from "./data";
import z from "zod";
import { customSectionItemDefinitionByType, resumeDataSchema, sectionTypeSchema } from "./data";

const toInputJsonSchema = (schema: z.ZodType) =>
	z.toJSONSchema(schema, {
		io: "input",
		unrepresentable: "any",
	});

export function createResumeDataJsonSchema() {
	const schema = toInputJsonSchema(resumeDataSchema);
	const picture = schema.properties?.picture;
	// Zod's catch accepts an omitted fit at runtime but still marks the property required in JSON Schema.
	if (picture && typeof picture !== "boolean" && Array.isArray(picture.required)) {
		picture.required = picture.required.filter((property) => property !== "fit");
	}
	return schema;
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
