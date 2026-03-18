import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "@/utils/env";

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

export const hasResumeAccess = (resumeId: string, passwordHash: string | null) => {
	if (!passwordHash) return false;
	const cookieName = getResumeAccessCookieName(resumeId);
	const cookieValue = getCookie(cookieName);
	if (!cookieValue) return false;
	const expected = signResumeAccessToken(resumeId, passwordHash);
	return safeEquals(cookieValue, expected);
};

export const grantResumeAccess = (resumeId: string, passwordHash: string) =>
	setCookie(getResumeAccessCookieName(resumeId), signResumeAccessToken(resumeId, passwordHash), {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		maxAge: RESUME_ACCESS_TTL_SECONDS,
		secure: env.APP_URL.startsWith("https"),
	});
