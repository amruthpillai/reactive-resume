import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, RequestHeadersPlugin, StrictGetMethodPlugin } from "@orpc/server/plugins";
import router from "@reactive-resume/api/routers";
import { mergeResponseHeaders } from "../http/headers";
import { getRequestLocale } from "./locale";

const rpcHandler = new RPCHandler(router, {
	plugins: [new BatchHandlerPlugin(), new RequestHeadersPlugin(), new StrictGetMethodPlugin()],
	interceptors: [
		onError((error) => {
			console.error("[oRPC Server]", error);
		}),
	],
});

export async function handleRpc(request: Request) {
	const resHeaders = new Headers();
	const { response } = await rpcHandler.handle(request, {
		prefix: "/api/rpc",
		context: { locale: getRequestLocale(request), reqHeaders: request.headers, resHeaders },
	});

	if (!response) return new Response("NOT_FOUND", { status: 404 });
	return mergeResponseHeaders(response, resHeaders);
}
