import type { Locale } from "@reactive-resume/utils/locale";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, RequestHeadersPlugin, StrictGetMethodPlugin } from "@orpc/server/plugins";
import router from "@reactive-resume/api/routers";
import { defaultLocale, isLocale } from "@reactive-resume/utils/locale";
import { getCookie, mergeResponseHeaders } from "../lib/http";

const rpcHandler = new RPCHandler(router, {
	plugins: [new BatchHandlerPlugin(), new RequestHeadersPlugin(), new StrictGetMethodPlugin()],
	interceptors: [
		onError((error) => {
			console.error("[oRPC Server]", error);
		}),
	],
});

export function getRequestLocale(request: Request): Locale {
	const locale = getCookie(request, "locale");
	return isLocale(locale) ? locale : defaultLocale;
}

export async function handleRpc(request: Request) {
	const resHeaders = new Headers();
	const { response } = await rpcHandler.handle(request, {
		prefix: "/api/rpc",
		context: { locale: getRequestLocale(request), reqHeaders: request.headers, resHeaders },
	});

	if (!response) return new Response("NOT_FOUND", { status: 404 });
	return mergeResponseHeaders(response, resHeaders);
}
