import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { basename, extname, normalize } from "node:path";

import { getStorageService, inferContentType } from "@/integrations/orpc/services/storage";
import { env } from "@/utils/env";

const storageService = getStorageService();

export const Route = createFileRoute("/uploads/$userId/$")({
	server: { handlers: { GET: handler } },
});

/**
 * Handler for GET requests to serve uploaded files, supporting ETags, content security, and path validation.
 * Handles nested paths like:
 * - /uploads/{userId}/pictures/{timestamp}.webp
 * - /uploads/{userId}/screenshots/{resumeId}/{timestamp}.webp
 * - /uploads/{userId}/pdfs/{resumeId}/{timestamp}.pdf
 */
async function handler({ request }: { request: Request }) {
	const { userId, filePath } = parseRouteParams(request.url);

	if (!userId || !filePath) return new Response("Bad Request", { status: 400 });

	if (!isValidPath(userId) || !isValidPathSegments(filePath)) return new Response("Forbidden", { status: 403 });

	// Build the full storage key: uploads/{userId}/{filePath}
	const key = `uploads/${userId}/${filePath}`;
	const storedFile = await storageService.read(key);

	if (!storedFile) return new Response("Not Found", { status: 404 });

	const filename = filePath.split("/").pop() ?? filePath;
	const ext = extname(filename).toLowerCase();
	const contentType = storedFile.contentType ?? inferContentType(filename);
	const etag = createEtag(storedFile);

	if (isNotModified(request.headers, etag)) return makeNotModifiedResponse(etag);

	const shouldForceDownload = [".pdf"].includes(ext);
	const headers = buildResponseHeaders({
		filename,
		storedFile,
		contentType,
		etag,
		shouldForceDownload,
	});

	const buffer = toArrayBuffer(storedFile.data);

	return new Response(buffer, { headers });
}

/**
 * Extracts userId and the remaining file path from the request URL.
 */
function parseRouteParams(url: string): { userId: string | undefined; filePath: string | undefined } {
	const pathname = new URL(url).pathname;
	const pathAfterUploads = pathname.replace("/uploads/", "");
	const firstSlashIndex = pathAfterUploads.indexOf("/");

	if (firstSlashIndex === -1) {
		return { userId: pathAfterUploads, filePath: undefined };
	}

	const userId = pathAfterUploads.slice(0, firstSlashIndex);
	const filePath = pathAfterUploads.slice(firstSlashIndex + 1);

	return { userId, filePath: filePath || undefined };
}

/**
 * Validates that a path segment does not contain directory traversal attempts.
 */
function isValidPath(segment: string): boolean {
	const normalized = normalize(segment).replace(/^(\.\.(\/|\\|$))+/, "");

	return normalized === segment;
}

/**
 * Validates all segments in a path for directory traversal attempts.
 */
function isValidPathSegments(path: string): boolean {
	const segments = path.split("/");

	return segments.every((segment) => isValidPath(segment));
}

/**
 * Checks for ETag match for conditional GET requests.
 */
function isNotModified(headers: Headers, etag: string): boolean {
	const ifNoneMatch = headers.get("If-None-Match");
	const candidates = ifNoneMatch?.split(",").map((s) => s.trim()) ?? [];

	return candidates.includes(etag);
}

/**
 * Returns a 304 Not Modified response with caching headers.
 */
function makeNotModifiedResponse(etag: string): Response {
	return new Response(null, {
		status: 304,
		headers: { ETag: etag, "Cache-Control": "public, max-age=31536000, immutable" },
	});
}

type BuildResponseHeaderArgs = {
	filename: string;
	storedFile: { size: number };
	contentType: string;
	etag: string;
	shouldForceDownload: boolean;
};

/**
 * Builds all headers for serving the file, including caching, security, and download headers.
 */
function buildResponseHeaders({
	filename,
	storedFile,
	contentType,
	etag,
	shouldForceDownload,
}: BuildResponseHeaderArgs): Headers {
	const headers = new Headers();

	headers.set("Content-Type", shouldForceDownload ? "application/octet-stream" : contentType);
	headers.set("Content-Length", storedFile.size.toString());

	if (shouldForceDownload) {
		headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(basename(filename))}"`);
	}

	headers.set("Cache-Control", "public, max-age=31536000, immutable");
	headers.set("ETag", etag);

	// Security Headers
	headers.set("X-Content-Type-Options", "nosniff");
	headers.set("X-Robots-Tag", "noindex, nofollow");
	headers.set("Cross-Origin-Resource-Policy", "same-site");
	headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	headers.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox;");
	headers.set("X-Frame-Options", "DENY");
	headers.set("X-Download-Options", "noopen");
	headers.set("Access-Control-Allow-Origin", env.APP_URL);

	return headers;
}

/**
 * Converts a Uint8Array to ArrayBuffer efficiently.
 */
function toArrayBuffer(data: Uint8Array): ArrayBuffer {
	return data.byteOffset === 0 && data.byteLength === data.buffer.byteLength
		? (data.buffer as ArrayBuffer)
		: (data.slice().buffer as ArrayBuffer);
}

/**
 * Generates or returns the ETag for a stored file.
 */
function createEtag(storedFile: { data: Uint8Array; size: number; etag?: string }): string {
	if (storedFile.etag) {
		const tag = storedFile.etag.trim();

		if (tag.startsWith("W/") || tag.startsWith('"')) {
			return tag;
		}
		return `"${tag}"`;
	}

	const hash = createHash("sha256").update(storedFile.data).digest("hex");

	return `"${storedFile.size}-${hash}"`;
}
