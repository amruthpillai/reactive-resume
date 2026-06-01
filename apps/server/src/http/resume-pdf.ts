import { createResumePdfDownload, verifyResumePdfDownloadToken } from "@reactive-resume/api/features/resume/export";

function unauthorizedResponse() {
	return new Response("Unauthorized", {
		status: 401,
		headers: {
			"Cache-Control": "private, no-store",
		},
	});
}

function expiredResponse() {
	return new Response("Download link expired", {
		status: 410,
		headers: {
			"Cache-Control": "private, no-store",
		},
	});
}

function errorStatus(error: unknown) {
	const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
	return code === "NOT_FOUND" ? 404 : 500;
}

export async function handleResumePdfDownload(request: Request, id: string) {
	const token = new URL(request.url).searchParams.get("token");
	if (!token) return unauthorizedResponse();

	const verification = verifyResumePdfDownloadToken({ resumeId: id, token });
	if (!verification.ok) return verification.reason === "expired" ? expiredResponse() : unauthorizedResponse();

	try {
		const download = await createResumePdfDownload({ id, userId: verification.userId });

		return new Response(download.body, {
			headers: {
				"Content-Type": download.body.type || "application/pdf",
				"Content-Disposition": download.headers["content-disposition"],
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		console.error("[PDF Download]", error);
		return new Response("Failed to generate resume PDF", {
			status: errorStatus(error),
			headers: {
				"Cache-Control": "private, no-store",
			},
		});
	}
}
