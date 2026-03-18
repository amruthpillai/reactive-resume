import { createIsomorphicFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "./env";

const PRINTER_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generates a time-limited token for printer route access.
 * Token format: base64(resumeId:timestamp).signature
 */
export const generatePrinterToken = createIsomorphicFn().server((resumeId: string) => {
  const timestamp = Date.now();
  const payload = `${resumeId}:${timestamp}`;
  const payloadBase64 = Buffer.from(payload).toString("base64url");

  // Create HMAC signature using AUTH_SECRET
  const signature = createHash("sha256").update(`${payloadBase64}.${env.AUTH_SECRET}`).digest("hex");

  return `${payloadBase64}.${signature}`;
});

/**
 * Verifies a printer token and returns the resume ID if valid.
 * Throws an error if the token is invalid or expired.
 */
export const verifyPrinterToken = createIsomorphicFn().server((token: string) => {
  const parts = token.split(".");
  if (parts.length !== 2) throw new Error("Invalid token format");

  const [payloadBase64, signature] = parts;

  // Verify signature
  const expectedSignature = createHash("sha256").update(`${payloadBase64}.${env.AUTH_SECRET}`).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Invalid token signature");
  }

  // Decode payload
  const payload = Buffer.from(payloadBase64, "base64url").toString("utf-8");
  const [resumeId, timestampStr] = payload.split(":");
  if (!resumeId || !timestampStr) throw new Error("Invalid token payload");

  const timestamp = Number.parseInt(timestampStr, 10);
  if (Number.isNaN(timestamp)) throw new Error("Invalid timestamp");

  // Check expiration
  const age = Date.now() - timestamp;
  if (age < 0 || age > PRINTER_TOKEN_TTL_MS) throw new Error("Token expired");

  return resumeId;
});
