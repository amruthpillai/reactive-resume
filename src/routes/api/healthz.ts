import { createFileRoute } from "@tanstack/react-router";
import { healthHandler } from "./health";

export const Route = createFileRoute("/api/healthz")({
	server: {
		handlers: {
			GET: healthHandler,
		},
	},
});
