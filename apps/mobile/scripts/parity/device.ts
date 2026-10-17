import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { Directory, File, Paths } from "expo-file-system";
import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import { nativeEngine } from "@reactive-resume/forme-native";
import { preloadResumePdf, renderResumePdf } from "@reactive-resume/pdf/native";
import { templateSchema } from "@reactive-resume/schema/templates";
import { pdfPages } from "../../modules/pdf-pages";
import { tightenResume } from "../../src/preview/fit";
import { configurePreviewResources, readCachedFont, readPreviewImage } from "../../src/preview/resources";

function check(value: unknown, message: string): asserts value {
	if (!value) throw new Error(message);
}

/** Dev-only: real native engine, font subsetter, image reader and OS rasterizer, with independent Node comparison. */
let running: Promise<void> | undefined;
export function runParity(origin: string): Promise<void> {
	return (running ??= checkParity(origin).finally(() => {
		running = undefined;
	}));
}

export async function checkPreviewResources(origin: string): Promise<ResumeData> {
	check(__DEV__, "Development build required");
	const url = new URL(origin);
	check(
		["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname) && url.port === "18086",
		"Local parity host required",
	);
	configurePreviewResources();
	const response = await expoFetch(`${origin}/fixture`);
	check(response.ok, "Fixture unavailable");
	const fixture = (await response.json()) as ResumeData;
	const inline = await readPreviewImage(fixture.picture.url, origin);
	const relative = await readPreviewImage("/picture.jpg", origin);
	check(
		inline.length > 0 && inline.length === relative.length && inline.every((byte, index) => byte === relative[index]),
		"Image source mismatch",
	);
	let rejected = false;
	try {
		await readPreviewImage("/oversize", origin);
	} catch (error) {
		rejected = error instanceof Error && error.message === "Image exceeds 12 MB";
	}
	check(rejected, "Oversized streaming image accepted");
	const escaped = await readPreviewImage("data:image/png,%89%50%4e%47", origin);
	check(escaped[0] === 137 && escaped[3] === 71, "Percent-encoded image bytes changed");
	const fontSource = `${origin}/font.ttf?platform=${Platform.OS}`;
	const firstFont = await readCachedFont(fontSource);
	const reads = await (await expoFetch(`${origin}/font-reads?platform=${Platform.OS}`)).json();
	const cachedFont = await readCachedFont(fontSource);
	check(
		firstFont.length > 0 &&
			firstFont.length === cachedFont.length &&
			firstFont.every((byte, index) => byte === cachedFont[index]),
		"Disk font bytes changed",
	);
	check(
		(await (await expoFetch(`${origin}/font-reads?platform=${Platform.OS}`)).json()) === reads,
		"Warm font hit the network",
	);
	// Real filesystem failure, inside this disposable simulator's sandbox: a file blocks directory creation.
	const directory = new Directory(Paths.cache, "pdf-fonts-v1");
	const originalUri = directory.uri;
	await directory.move(new Directory(Paths.cache, "pdf-fonts-v1-backup"));
	const blocker = new File(originalUri.replace(/\/$/, ""));
	try {
		await blocker.write("cache unavailable");
		const fallback = await readCachedFont(`${fontSource}&disk-error=1`);
		check(fallback.length === firstFont.length, "Disk error blocked network fallback");
	} finally {
		if (blocker.exists) blocker.delete();
		await directory.move(new Directory(originalUri));
	}
	const compact = structuredClone(fixture);
	for (let step = 0; step < 16 && tightenResume(compact); step++) {
		/* Exercise the bounded design ladder. */
	}
	check(compact.metadata.typography.body.fontSize >= 9 && !tightenResume(compact), "Fit floor failed");
	check(compact.summary.content === fixture.summary.content, "Fit changed content");
	console.info(
		`[parity] ${Platform.OS} image streaming/data/relative, persistent fonts, disk fallback and fit floor PASS`,
	);
	await preloadResumePdf(fixture);
	return fixture;
}

async function checkParity(origin: string): Promise<void> {
	const fixture = await checkPreviewResources(origin);
	for (const name of [...templateSchema.options, "free-form"]) {
		const data = structuredClone(fixture);
		if (name === "free-form") data.metadata.page.format = "free-form";
		let passes = 0;
		let pageCount = 0;
		const start = performance.now();
		const bytes = await renderResumePdf(
			{
				...nativeEngine,
				renderSerializedDocWithLayout: (document) => {
					passes++;
					return nativeEngine.renderSerializedDocWithLayout(document);
				},
			},
			{
				data,
				template: name === "free-form" ? "azurill" : templateSchema.parse(name),
				readImage: readPreviewImage,
				onPageMap: (map) => {
					pageCount = map.pages.length;
					check(map.nodes.length > 0, "Empty page map");
				},
			},
		);
		if (name === "free-form") check(passes >= 2, "Measured second pass not exercised");
		const milliseconds = Math.round(performance.now() - start);
		const document = await pdfPages.open(bytes);
		let rasterized = 0;
		try {
			check(document.pages.length === pageCount, "Rasterizer page count differs");
			if (name === "azurill") {
				let invalidPageRejected = false;
				try {
					await pdfPages.rasterize(document.id, [-1], 1);
				} catch {
					invalidPageRejected = true;
				}
				check(invalidPageRejected, "Invalid page accepted");
			}
			const pages = await pdfPages.rasterize(document.id, [0, document.pages.length - 1], 1);
			check(pages.length === 2 && pages.every((page) => page.uri.startsWith("file:")), "Rasterizer result invalid");
			for (const page of pages) {
				const png = await new File(page.uri).bytes();
				check(png[0] === 137 && png[1] === 80 && png[2] === 78 && png[3] === 71, "Rasterizer did not write PNG bytes");
			}
			rasterized = pages.length;
		} finally {
			await pdfPages.close(document.id);
		}
		const result = await expoFetch(
			`${origin}/result?platform=${Platform.OS}&template=${name}&passes=${passes}&ms=${milliseconds}&rasterized=${rasterized}`,
			{
				method: "POST",
				headers: { "Content-Type": "application/pdf" },
				body: bytes.slice().buffer,
			},
		);
		check(result.ok && ((await result.json()) as { pass: boolean }).pass, `Parity mismatch: ${name}`);
		console.info(`[parity] ${Platform.OS} ${name} PASS (${pageCount} pages, ${passes} passes)`);
	}
}
