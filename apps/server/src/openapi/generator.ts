import type { OpenAPI } from "@orpc/openapi";
import { OpenAPIGenerator } from "@orpc/openapi";
import { JSON_SCHEMA_INPUT_REGISTRY, ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { downloadResumePdfProcedure } from "@reactive-resume/api/features/resume/export";
import router from "@reactive-resume/api/routers";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";
import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";
import { writableResumeDataSchema } from "@reactive-resume/schema/resume/write";

export const openAPIRouter = {
	...router,
	resume: {
		...router.resume,
		downloadPdf: downloadResumePdfProcedure,
	},
};

const { $schema: _dialect, ...resumeDataInputSchema } = createResumeDataJsonSchema();
type ResumeDataInputJsonSchema = Parameters<typeof JSON_SCHEMA_INPUT_REGISTRY.add<typeof resumeDataSchema>>[1];
JSON_SCHEMA_INPUT_REGISTRY.add(resumeDataSchema, resumeDataInputSchema as unknown as ResumeDataInputJsonSchema);
JSON_SCHEMA_INPUT_REGISTRY.add(writableResumeDataSchema, resumeDataInputSchema as unknown as ResumeDataInputJsonSchema);
const importResumeInputSchema = openAPIRouter.resume.import["~orpc"].inputSchema;
if (importResumeInputSchema) {
	JSON_SCHEMA_INPUT_REGISTRY.add(importResumeInputSchema, {
		type: "object",
		properties: {
			data: { $ref: "#/components/schemas/ResumeData" },
		},
		required: ["data"],
	});
}

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [
		new ZodToJsonSchemaConverter({
			interceptors: [
				({ options, next }) => {
					const [required, schema] = next();
					const impossible =
						Object.keys(schema).length === 1 &&
						typeof schema.not === "object" &&
						schema.not !== null &&
						Object.keys(schema.not).length === 0;
					return options.strategy === "input" && impossible ? [required, {}] : [required, schema];
				},
			],
		}),
	],
});

type GenerateOpenApiSpecOptions = {
	appUrl: string;
	version: string;
};

const healthDependencySchema = {
	type: "object",
	properties: {
		status: { type: "string", enum: ["healthy", "unhealthy"] },
		latencyMs: { type: "number" },
		error: { type: "string", description: "Generic failure message. Detailed diagnostics are logged on the server." },
	},
	required: ["status", "latencyMs"],
	additionalProperties: true,
} satisfies OpenAPI.SchemaObject;

const healthResponseSchema = {
	type: "object",
	properties: {
		service: { type: "string", enum: ["reactive-resume"] },
		version: { type: "string", description: "The running application's build version." },
		status: { type: "string", enum: ["healthy", "unhealthy"] },
		timestamp: { type: "string", format: "date-time" },
		uptime: { type: "string" },
		database: healthDependencySchema,
		storage: healthDependencySchema,
	},
	required: ["service", "version", "status", "timestamp", "uptime", "database", "storage"],
} satisfies OpenAPI.SchemaObject;

export async function generateOpenApiSpec({ appUrl, version }: GenerateOpenApiSpecOptions) {
	return await openAPIGenerator.generate(openAPIRouter, {
		info: {
			title: "Reactive Resume",
			version,
			description: "Reactive Resume API",
			license: { name: "MIT", url: "https://github.com/amruthpillai/reactive-resume/blob/main/LICENSE" },
			contact: { name: "Amruth Pillai", email: "hello@amruthpillai.com", url: "https://amruthpillai.com" },
		},
		servers: [{ url: `${appUrl}/api/openapi` }],
		paths: {
			"/api/health": {
				get: {
					operationId: "getHealth",
					tags: ["System"],
					summary: "Get application health and version",
					description: "Checks database and storage availability. Does not require authentication.",
					servers: [{ url: appUrl }],
					security: [],
					responses: {
						"200": {
							description: "The application and its dependencies are healthy.",
							content: { "application/json": { schema: healthResponseSchema } },
						},
						"503": {
							description: "One or more application dependencies are unhealthy.",
							content: { "application/json": { schema: healthResponseSchema } },
						},
					},
				},
			},
		},
		externalDocs: { url: "https://docs.rxresu.me", description: "Reactive Resume Documentation" },
		commonSchemas: {
			ResumeData: { schema: writableResumeDataSchema, strategy: "input" },
		},
		components: {
			securitySchemes: {
				apiKey: {
					type: "apiKey",
					name: "x-api-key",
					in: "header",
					description: "The API key to authenticate requests.",
				},
			},
		},
		security: [{ apiKey: [] }],
		filter: ({ contract }) => !contract["~orpc"].route.tags?.includes("Internal"),
	});
}
