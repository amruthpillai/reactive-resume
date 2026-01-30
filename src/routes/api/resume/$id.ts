import { ORPCError } from "@orpc/client";
import { createFileRoute } from "@tanstack/react-router";
import { jsonPatchSchema } from "@/integrations/orpc/helpers/resume-patch";
import { resolveUserFromHeaders } from "@/integrations/orpc/helpers/auth";
import { resumeService } from "@/integrations/orpc/services/resume";

function isJsonPatchContentType(contentType: string | null) {
	if (!contentType) return false;
	const [type] = contentType.split(";").map((segment) => segment.trim().toLowerCase());
	return type === "application/json-patch+json" || type === "application/json";
}

function handleError(error: unknown) {
	if (error instanceof ORPCError) {
		return Response.json(
			{
				code: error.code,
				message: error.message,
				data: error.data,
			},
			{ status: error.status ?? 500 },
		);
	}

	return Response.json(
		{ code: "INTERNAL_SERVER_ERROR", message: "Something went wrong. Please try again later." },
		{ status: 500 },
	);
}

export async function patchHandler({ request, params }: { request: Request; params: { id: string } }) {
	if (!isJsonPatchContentType(request.headers.get("content-type"))) {
		return Response.json(
			{
				code: "UNSUPPORTED_MEDIA_TYPE",
				message: "Expected application/json-patch+json or application/json content type.",
			},
			{ status: 415 },
		);
	}

	const user = await resolveUserFromHeaders(request.headers);
	if (!user) {
		return Response.json({ code: "UNAUTHORIZED", message: "Unauthorized." }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return Response.json({ code: "INVALID_JSON", message: "Invalid JSON body." }, { status: 400 });
	}

	const parsed = jsonPatchSchema.safeParse(payload);
	if (!parsed.success) {
		return Response.json(
			{
				code: "INVALID_PATCH",
				message: "The patch document is invalid.",
				issues: parsed.error.issues,
			},
			{ status: 400 },
		);
	}

	try {
		const result = await resumeService.patch({
			id: params.id,
			userId: user.id,
			patch: parsed.data,
		});

		return Response.json(result);
	} catch (error) {
		return handleError(error);
	}
}

export const Route = createFileRoute("/api/resume/$id")({
	server: {
		handlers: {
			PATCH: patchHandler,
		},
	},
});
