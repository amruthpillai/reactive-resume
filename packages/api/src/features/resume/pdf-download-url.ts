import { createHmac } from "node:crypto";
import { env } from "@reactive-resume/env/server";
import { safeEquals } from "./access";

// Long enough to click, short enough that a leaked link is useless soon after.
const TTL_SECONDS = 10 * 60;

type PdfDownloadTokenPayload = {
	v: 1;
	resumeId: string;
	userId: string;
	expiresAt: number;
	issuedAt: number;
};

type CreateResumePdfDownloadUrlInput = {
	resumeId: string;
	userId: string;
	now?: Date;
};

type VerifyResumePdfDownloadTokenInput = {
	resumeId: string;
	token: string;
	now?: Date;
};

type VerifyResumePdfDownloadTokenResult =
	| {
			ok: true;
			resumeId: string;
			userId: string;
			expiresAt: string;
	  }
	| {
			ok: false;
			reason: "expired" | "invalid_signature" | "malformed" | "resume_mismatch";
	  };

function encodeJson(value: unknown) {
	return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson(value: string): unknown {
	return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

// A key of its own, derived from AUTH_SECRET, so this signature can't stand in for any other use of the secret.
const signingKey = () => createHmac("sha256", env.AUTH_SECRET).update("reactive-resume:pdf-download:v1").digest();

function sign(payload: string) {
	return createHmac("sha256", signingKey()).update(payload).digest("base64url");
}

function parsePayload(value: unknown): PdfDownloadTokenPayload | null {
	if (!value || typeof value !== "object") return null;

	const payload = value as Partial<PdfDownloadTokenPayload>;
	if (payload.v !== 1) return null;
	if (typeof payload.resumeId !== "string" || payload.resumeId.length === 0) return null;
	if (typeof payload.userId !== "string" || payload.userId.length === 0) return null;
	if (typeof payload.expiresAt !== "number" || !Number.isFinite(payload.expiresAt)) return null;
	if (typeof payload.issuedAt !== "number" || !Number.isFinite(payload.issuedAt)) return null;

	return payload as PdfDownloadTokenPayload;
}

export function createResumePdfDownloadUrl({ resumeId, userId, now = new Date() }: CreateResumePdfDownloadUrlInput) {
	const expiresInSeconds = TTL_SECONDS;
	const expiresAt = new Date(now.getTime() + expiresInSeconds * 1000);
	const payload = encodeJson({
		v: 1,
		resumeId,
		userId,
		expiresAt: expiresAt.getTime(),
		issuedAt: now.getTime(),
	} satisfies PdfDownloadTokenPayload);
	const token = `${payload}.${sign(payload)}`;
	const url = new URL(`/api/resumes/${encodeURIComponent(resumeId)}/pdf`, env.APP_URL);
	url.searchParams.set("token", token);

	return {
		url: url.toString(),
		expiresAt: expiresAt.toISOString(),
		expiresInSeconds,
	};
}

export function verifyResumePdfDownloadToken({
	resumeId,
	token,
	now = new Date(),
}: VerifyResumePdfDownloadTokenInput): VerifyResumePdfDownloadTokenResult {
	const [payload, signature, extra] = token.split(".");
	if (!payload || !signature || extra !== undefined) return { ok: false, reason: "malformed" };
	if (!safeEquals(signature, sign(payload))) return { ok: false, reason: "invalid_signature" };

	try {
		const parsed = parsePayload(decodeJson(payload));
		if (!parsed) return { ok: false, reason: "malformed" };
		if (parsed.resumeId !== resumeId) return { ok: false, reason: "resume_mismatch" };
		if (parsed.expiresAt <= now.getTime()) return { ok: false, reason: "expired" };

		return {
			ok: true,
			resumeId: parsed.resumeId,
			userId: parsed.userId,
			expiresAt: new Date(parsed.expiresAt).toISOString(),
		};
	} catch {
		return { ok: false, reason: "malformed" };
	}
}
