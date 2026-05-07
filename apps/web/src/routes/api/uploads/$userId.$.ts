import { createFileRoute } from "@tanstack/react-router";
import { handler } from "../../uploads/$userId.$";

export const Route = createFileRoute("/api/uploads/$userId/$")({
	server: { handlers: { GET: handler } },
});
