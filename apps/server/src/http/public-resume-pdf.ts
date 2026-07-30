import type { PublicResumePdfMismatchReason } from "@reactive-resume/api/features/resume/public-pdf";
import {
	createPublicResumePdf,
	PUBLIC_RESUME_PDF_MISMATCH_REASONS,
} from "@reactive-resume/api/features/resume/public-pdf";

const noStoreResponse = (body: string, status: number) =>
	new Response(body, { status, headers: { "Cache-Control": "private, no-store" } });

const errorStatus = (error: unknown): number => {
	const code = typeof error === "object" && error && "code" in error ? (error as { code?: unknown }).code : undefined;
	if (code === "BAD_REQUEST") return 400;
	if (code === "NEED_PASSWORD") return 401;
	if (code === "NOT_FOUND") return 404;
	if (code === "RATE_LIMIT_EXCEEDED") return 429;
	return 500;
};

const fingerprint = (value: string | null): string | undefined => {
	if (value === null) return;
	return /^[a-f0-9]{64}$/.test(value) ? value : undefined;
};

export async function handlePublicResumePdf(
	request: Request,
	username: string,
	slug: string,
	trustedClient = "unknown",
): Promise<Response> {
	const searchParams = new URL(request.url).searchParams;
	const rawReason = searchParams.get("reason") ?? "missing-projection";
	if (!PUBLIC_RESUME_PDF_MISMATCH_REASONS.includes(rawReason as PublicResumePdfMismatchReason)) {
		return noStoreResponse("Invalid fallback metadata", 400);
	}
	const rawRegistryFingerprint = searchParams.get("registryFingerprint");
	const rawAdapterFingerprint = searchParams.get("adapterFingerprint");
	const clientRegistryFingerprint = fingerprint(rawRegistryFingerprint);
	const clientAdapterFingerprint = fingerprint(rawAdapterFingerprint);
	if (
		(rawRegistryFingerprint !== null && clientRegistryFingerprint === undefined) ||
		(rawAdapterFingerprint !== null && clientAdapterFingerprint === undefined)
	) {
		return noStoreResponse("Invalid fallback metadata", 400);
	}

	try {
		const result = await createPublicResumePdf({
			username,
			slug,
			requestHeaders: request.headers,
			trustedClient,
			mismatchReason: rawReason as PublicResumePdfMismatchReason,
			...(clientRegistryFingerprint ? { clientRegistryFingerprint } : {}),
			...(clientAdapterFingerprint ? { clientAdapterFingerprint } : {}),
		});

		return new Response(result.body, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${result.filename.replaceAll('"', "")}"`,
				"Cache-Control": "private, no-store",
				"X-Content-Type-Options": "nosniff",
			},
		});
	} catch (error) {
		const status = errorStatus(error);
		return noStoreResponse(
			status === 500 ? "Failed to generate public resume PDF" : "Public resume PDF unavailable",
			status,
		);
	}
}
