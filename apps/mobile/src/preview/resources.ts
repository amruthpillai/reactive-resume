import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { configureFontReader, configureImageFetch, downloadFont } from "@reactive-resume/pdf/native";
import { getServer } from "@/auth/session";

const MAX_IMAGE_BYTES = 12_000_000;
let configured = false;

/** Disk failures never prevent a network font download. Store raw bytes; pdf owns WOFF conversion. */
export async function readCachedFont(source: string): Promise<Uint8Array> {
	let file: File | undefined;
	try {
		const directory = new Directory(Paths.document, "pdf-fonts-v1");
		directory.create({ intermediates: true, idempotent: true });
		file = new File(directory, await digestStringAsync(CryptoDigestAlgorithm.SHA256, source));
		if (file.exists) {
			const bytes = await file.bytes();
			if (bytes.length > 0) return bytes;
		}
	} catch {
		file = undefined;
	}
	const bytes = await downloadFont(source);
	if (file) {
		const temporary = new File(`${file.uri}.tmp`);
		try {
			await temporary.write(bytes);
			await temporary.move(file, { overwrite: true });
		} catch {
			// Disk full, permissions, or interrupted writes: keep the successfully downloaded font in memory.
			try {
				if (temporary.exists) temporary.delete();
			} catch {
				/* Cache cleanup is best effort. */
			}
		}
	}
	return bytes;
}

export function configurePreviewResources() {
	if (configured) return;
	configured = true;
	configureFontReader(readCachedFont);
	configureImageFetch(expoFetch as unknown as typeof fetch);
}

/** Android expo/fetch cannot be relied on for data: URLs. Decode locally, then enforce the same byte limit. */
export async function readPreviewImage(source: string, server = getServer()): Promise<Uint8Array> {
	if (source.startsWith("data:")) {
		const comma = source.indexOf(",");
		if (comma < 0) throw new Error("Invalid image data URI");
		const header = source.slice(0, comma);
		const payload = source.slice(comma + 1);
		const base64 = /;base64$/i.test(header);
		if (payload.length > MAX_IMAGE_BYTES * (base64 ? 1.4 : 3) + 100) throw new Error("Image exceeds 12 MB");
		const binary = base64
			? atob(decodeURIComponent(payload))
			: payload.replace(/%([0-9a-f]{2})/gi, (_match, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)));
		if (binary.length > MAX_IMAGE_BYTES) throw new Error("Image exceeds 12 MB");
		return Uint8Array.from(binary, (character) => character.charCodeAt(0));
	}
	const url = new URL(source, server);
	if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported image URL");
	const response = await expoFetch(url.href, { signal: AbortSignal.timeout(10_000) });
	if (!response.ok) throw new Error(`Image HTTP ${response.status}`);
	const reader = response.body?.getReader();
	if (!reader) throw new Error("Image has no streaming body");
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			length += value.byteLength;
			if (length > MAX_IMAGE_BYTES) throw new Error("Image exceeds 12 MB");
			chunks.push(value);
		}
	} finally {
		await reader.cancel();
	}
	const bytes = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.length;
	}
	return bytes;
}
