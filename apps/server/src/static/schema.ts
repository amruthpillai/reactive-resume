import { createResumeDataJsonSchema } from "@reactive-resume/schema/resume/json-schema";
import { appVersion } from "../app-version";

export function handleSchemaJson() {
	return Response.json(createResumeDataJsonSchema(), {
		status: 200,
		headers: {
			"Content-Type": "application/schema+json; charset=utf-8",
			"Cache-Control": "public, max-age=86400, immutable",
			"Surrogate-Control": "max-age=86400",
			"X-Content-Type-Options": "nosniff",
			"X-Robots-Tag": "index, follow",
			ETag: appVersion,
			Vary: "Accept",
		},
	});
}
