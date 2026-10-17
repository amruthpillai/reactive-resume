import { CryptoDigestAlgorithm, digestStringAsync } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { pdfPages } from "../../modules/pdf-pages";
import { readCachedFont } from "../../src/preview/resources";
import { checkPreviewResources } from "./device";

function check(value: unknown, message: string): asserts value {
	if (!value) throw new Error(message);
}

/** Sparse files exercise the real 200 MB accounting without allocating 200 MB of device memory or disk blocks. */
async function sparseFont(directory: Directory, name: string) {
	const file = new File(directory, name);
	file.create();
	const handle = file.open();
	try {
		await handle.writeBytes(new Uint8Array([0, 1, 0, 0]));
		handle.offset = 105_000_000 - 1;
		await handle.writeBytes(new Uint8Array([0]));
	} finally {
		await handle.close();
	}
	return file;
}

function rasterFixture() {
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 50000] /Resources << >> /Contents 5 0 R >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << >> /Contents 5 0 R >>",
		`<< /Length ${"0 0 1 rg 0 0 600 800 re f\n".length} >>\nstream\n0 0 1 rg 0 0 600 800 re f\nendstream`,
	];
	let pdf = "%PDF-1.4\n";
	const offsets = [0];
	for (const [index, object] of objects.entries()) {
		offsets.push(pdf.length);
		pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
	}
	const start = pdf.length;
	pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
	pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
	return new TextEncoder().encode(pdf);
}

/** Real filesystem, HTTP 200 validation and OS rasterization: no production test seam. */
export async function runReviewChecks(origin: string) {
	const fixture = await checkPreviewResources(origin);
	const directory = new Directory(Paths.cache, "pdf-fonts-v1");
	const source = `${origin}/font.ttf?platform=${Platform.OS}&review=1`;
	const valid = await readCachedFont(source);
	const file = new File(directory, await digestStringAsync(CryptoDigestAlgorithm.SHA256, source));
	await file.write("<html>HTTP 200 error</html>");
	const repaired = await readCachedFont(source);
	check(repaired.length === valid.length && repaired[0] === valid[0], "Corrupt cached font was not repaired");
	const invalidSource = `${origin}/invalid-font`;
	let rejected = false;
	try {
		await readCachedFont(invalidSource);
	} catch (error) {
		rejected = error instanceof Error && error.message === "Invalid font signature";
	}
	check(rejected, "HTTP 200 error body accepted as font");
	check(
		!new File(directory, await digestStringAsync(CryptoDigestAlgorithm.SHA256, invalidSource)).exists,
		"Invalid network font persisted",
	);

	const originalUri = directory.uri;
	await directory.move(new Directory(Paths.cache, "pdf-fonts-review-backup"));
	const isolated = new Directory(originalUri);
	try {
		isolated.create();
		const oldest = await sparseFont(isolated, "oldest");
		await new Promise((resolve) => setTimeout(resolve, 1100)); // Separate filesystem timestamps, including coarse clocks.
		const newest = await sparseFont(isolated, "newest");
		await readCachedFont(`${source}&eviction=1`);
		check(!oldest.exists && newest.exists, "Font eviction was not oldest first");
		check(isolated.size !== null && isolated.size <= 200_000_000, "Font cache exceeded 200 MB");
	} finally {
		if (isolated.exists) isolated.delete();
		await directory.move(new Directory(originalUri));
	}

	const temporary = Platform.OS === "ios" ? new Directory(Paths.document, "..", "tmp") : Paths.cache;
	check(!new Directory(temporary, "rr-pdf-M3T4-stale").exists, "Stale raster directory survived module startup");
	const document = await pdfPages.open(rasterFixture());
	try {
		const pages = await pdfPages.rasterize(document.id, [0, 1], 6);
		check(pages.length === 2, "Tall page prevented other pages rasterizing");
		for (const page of pages) {
			const png = await new File(page.uri).bytes();
			const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
			const width = view.getUint32(16);
			const height = view.getUint32(20);
			check(width * height <= 25_000_000, "Raster exceeded 25 MP");
			if (page.index === 1) check(width === 3600 && height === 4800, "Scale was capped for the entire document");
		}
		const replacement = await pdfPages.rasterize(document.id, [0], 0.5);
		check(replacement[0] && new File(replacement[0].uri).exists, "Replacement raster missing");
		check(pages[0] && !new File(pages[0].uri).exists, "Old scale PNG survived replacement");
		check(pages[1] && new File(pages[1].uri).exists, "Another page's PNG was removed");
	} finally {
		await pdfPages.close(document.id);
	}
	console.info(`[preview-review] ${Platform.OS} cache validation/eviction, 25 MP per-page cap and PNG lifecycle PASS`);
	return fixture;
}
