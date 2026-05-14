import { createHash, timingSafeEqual } from "node:crypto";
import { env } from "@reactive-resume/env/server";

const RESUME_ACCESS_COOKIE_PREFIX = "resume_access";
const RESUME_ACCESS_TTL_SECONDS = 60 * 10; // 10 minutes

const getResumeAccessCookieName = (resumeId: string) => `${RESUME_ACCESS_COOKIE_PREFIX}_${resumeId}`;

const signResumeAccessToken = (resumeId: string, passwordHash: string): string =>
	createHash("sha256").update(`${resumeId}:${passwordHash}`).digest("hex");

const safeEquals = (value: string, expected: string) => {
	const valueBuffer = Buffer.from(value);
	const expectedBuffer = Buffer.from(expected);
	if (valueBuffer.length !== expectedBuffer.length) return false;
	return timingSafeEqual(valueBuffer, expectedBuffer);
};

const parseCookieHeader = (cookieHeader: string | null): Map<string, string> => {
	const cookies = new Map<string, string>();
	if (!cookieHeader) return cookies;

	for (const part of cookieHeader.split(";")) {
		const [rawName, ...rawValue] = part.trim().split("=");
		if (!rawName || rawValue.length === 0) continue;

		cookies.set(rawName, rawValue.join("="));
	}

	return cookies;
};

const serializeCookie = (
	name: string,
	value: string,
	options: { path: string; httpOnly: boolean; sameSite: "lax"; maxAge: number; secure: boolean },
) => {
	const parts = [`${name}=${value}`, `Path=${options.path}`, `Max-Age=${options.maxAge}`, "SameSite=Lax"];
	if (options.httpOnly) parts.push("HttpOnly");
	if (options.secure) parts.push("Secure");
	return parts.join("; ");
};

export const hasResumeAccess = (requestHeaders: Headers, resumeId: string, passwordHash: string | null) => {
	if (!passwordHash) return false;
	const cookieName = getResumeAccessCookieName(resumeId);
	const cookieValue = parseCookieHeader(requestHeaders.get("cookie")).get(cookieName);
	if (!cookieValue) return false;
	const expected = signResumeAccessToken(resumeId, passwordHash);
	return safeEquals(cookieValue, expected);
};

export const grantResumeAccess = (responseHeaders: Headers, resumeId: string, passwordHash: string) => {
	const cookie = serializeCookie(getResumeAccessCookieName(resumeId), signResumeAccessToken(resumeId, passwordHash), {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		maxAge: RESUME_ACCESS_TTL_SECONDS,
		secure: env.APP_URL.startsWith("https"),
	});

	responseHeaders.append("Set-Cookie", cookie);
};
