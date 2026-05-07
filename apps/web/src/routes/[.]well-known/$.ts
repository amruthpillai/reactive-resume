import { createFileRoute } from "@tanstack/react-router";

const okResponse = () => new Response("OK", { status: 200 });

export const Route = createFileRoute("/.well-known/$")({
	server: {
		handlers: {
			GET: () => okResponse(),
			HEAD: () => okResponse(),
		},
	},
});
