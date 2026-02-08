import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { BatchHandlerPlugin, RequestHeadersPlugin } from "@orpc/server/plugins";
import { createFileRoute } from "@tanstack/react-router";
import router from "@/integrations/orpc/router";
import { getLocale } from "@/utils/locale";

const rpcHandler = new RPCHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(`ERROR [oRPC]: ${error}`);
		}),
	],
	plugins: [new BatchHandlerPlugin(), new RequestHeadersPlugin()],
});

async function handler({ request }: { request: Request }) {
	const { response } = await rpcHandler.handle(request, {
		prefix: "/api/rpc",
		context: { locale: await getLocale() },
	});

	if (!response) return new Response("NOT_FOUND", { status: 404 });

	return response;
}

export const Route = createFileRoute("/api/rpc/$")({
	server: {
		handlers: {
			ANY: handler,
		},
	},
});
