import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { BatchHandlerPlugin, RequestHeadersPlugin, StrictGetMethodPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createFileRoute } from "@tanstack/react-router";
import router from "@/integrations/orpc/router";
import { resumeDataSchema } from "@/schema/resume/data";
import { env } from "@/utils/env";
import { getLocale } from "@/utils/locale";

const openAPIHandler = new OpenAPIHandler(router, {
	plugins: [
		new BatchHandlerPlugin(),
		new RequestHeadersPlugin(),
		new StrictGetMethodPlugin(),
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(`ERROR [OpenAPI]: ${error}`);
		}),
	],
});

const openAPIGenerator = new OpenAPIGenerator({
	schemaConverters: [new ZodToJsonSchemaConverter()],
});

async function handler({ request }: { request: Request }) {
	const locale = await getLocale();

	if (request.method === "GET" && request.url.endsWith("/spec.json")) {
		const spec = await openAPIGenerator.generate(router, {
			info: {
				title: "Reactive Resume",
				version: __APP_VERSION__,
				description: "Reactive Resume API",
				license: { name: "MIT", url: "https://github.com/amruthpillai/reactive-resume/blob/main/LICENSE" },
				contact: { name: "Amruth Pillai", email: "hello@amruthpillai.com", url: "https://amruthpillai.com" },
			},
			servers: [{ url: `${env.APP_URL}/api/openapi` }],
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

		return Response.json(spec);
	}

	const { response } = await openAPIHandler.handle(request, {
		prefix: "/api/openapi",
		context: { locale, reqHeaders: request.headers },
	});

	if (!response) {
		return new Response("NOT_FOUND", { status: 404 });
	}

	return response;
}

export const Route = createFileRoute("/api/openapi/$")({
	server: {
		handlers: {
			ANY: handler,
		},
	},
});
