import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { downloadResumePdfProcedure } from "@reactive-resume/api/features/resume/export";
import router from "@reactive-resume/api/routers";
import { resumeDataSchema } from "@reactive-resume/schema/resume/data";

export const openAPIRouter = {
	...router,
	resume: {
		...router.resume,
		downloadPdf: downloadResumePdfProcedure,
	},
};

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

type GenerateOpenApiSpecOptions = {
	appUrl: string;
	version: string;
};

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
		externalDocs: { url: "https://docs.rxresu.me", description: "Reactive Resume Documentation" },
		commonSchemas: {
			ResumeData: { schema: resumeDataSchema },
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
