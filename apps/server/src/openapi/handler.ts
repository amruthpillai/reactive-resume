import { SmartCoercionPlugin } from "@orpc/json-schema";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { onError } from "@orpc/server";
import { BatchHandlerPlugin, RequestHeadersPlugin, StrictGetMethodPlugin } from "@orpc/server/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { env } from "@reactive-resume/env/server";
import { appVersion } from "../app-version";
import { mergeResponseHeaders } from "../http/headers";
import { getRequestLocale } from "../rpc/locale";
import { generateOpenApiSpec, openAPIRouter } from "./generator";

const openAPIHandler = new OpenAPIHandler(openAPIRouter, {
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
			console.error("[OpenAPI]", error);
		}),
	],
});

export async function handleOpenApi(request: Request, trustedClient = "unknown") {
	if (request.method === "GET" && (request.url.endsWith("/spec.json") || request.url.endsWith("/spec"))) {
		return Response.json(await generateOpenApiSpec({ appUrl: env.APP_URL, version: appVersion }));
	}

	const resHeaders = new Headers();
	const { response } = await openAPIHandler.handle(request, {
		prefix: "/api/openapi",
		context: { locale: getRequestLocale(request), reqHeaders: request.headers, resHeaders, trustedClient },
	});

	if (!response) return new Response("NOT_FOUND", { status: 404 });
	return mergeResponseHeaders(response, resHeaders);
}
