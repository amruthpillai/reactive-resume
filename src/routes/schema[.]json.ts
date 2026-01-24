import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import { resumeDataSchema } from "@/schema/resume/data";

function handler() {
	const resumeDataJSONSchema = z.toJSONSchema(resumeDataSchema);

	return Response.json(resumeDataJSONSchema, {
		status: 200,
		headers: {
			"Content-Type": "application/schema+json; charset=utf-8",
			"Cache-Control": "public, max-age=86400, immutable",
			"Surrogate-Control": "max-age=86400",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "index, follow",
			ETag: `"v5.0.0"`,
			Vary: "Accept",
		},
	});
}

export const Route = createFileRoute("/schema.json")({
	server: {
		handlers: {
			GET: handler,
		},
	},
});
