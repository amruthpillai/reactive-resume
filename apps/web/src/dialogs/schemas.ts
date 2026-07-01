import z from "zod";
import { apiKeyDialogSchemas } from "./api-key/schema";
import { authDialogSchemas } from "./auth/schema";
import { customTemplateDialogSchemas } from "./custom-template/schema";
import { resumeDialogSchemas } from "./resume/schema";

export const dialogSchemaRegistries = [
	{ domain: "auth", schemas: authDialogSchemas },
	{ domain: "api-key", schemas: apiKeyDialogSchemas },
	{ domain: "resume", schemas: resumeDialogSchemas },
	{ domain: "custom-template", schemas: customTemplateDialogSchemas },
] as const;

const dialogSchemaEntries = [
	...authDialogSchemas,
	...apiKeyDialogSchemas,
	...resumeDialogSchemas,
	...customTemplateDialogSchemas,
] as const;

export const dialogTypeSchema = z.discriminatedUnion("type", dialogSchemaEntries);

export type DialogSchema = z.infer<typeof dialogTypeSchema>;
export type DialogType = DialogSchema["type"];

export type DialogData<T extends DialogType> = Extract<DialogSchema, { type: T }>["data"];

type DialogPropsData<T extends DialogType> =
	DialogData<T> extends undefined ? Record<string, never> : { data: DialogData<T> };

export type DialogProps<T extends DialogType> = DialogPropsData<T>;
