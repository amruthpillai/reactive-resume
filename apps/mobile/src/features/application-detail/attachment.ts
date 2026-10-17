// The server's limits for application documents (packages/api/src/dto/application.ts), checked before uploading.
// Pure: Node runs it in the M5-T2 scenarios.

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type AttachmentProblem = "not-pdf" | "too-large" | "unknown-size";

type PickedFile = { name: string; size?: number | null | undefined; mimeType?: string | null | undefined };

/** Why a picked file can't be attached, or null when it can. */
export function attachmentProblem(file: PickedFile): AttachmentProblem | null {
	const pdf = file.mimeType ? file.mimeType === "application/pdf" : /\.pdf$/i.test(file.name);
	if (!pdf) return "not-pdf";
	if (typeof file.size !== "number") return "unknown-size";
	return file.size > MAX_ATTACHMENT_BYTES ? "too-large" : null;
}
