import type { ExtractedDocument, PdfDocumentLike, RawExtraction } from "@reactive-resume/resume/ats-pdf";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { buildExtractedDocument, harvestPdfDocument } from "@reactive-resume/resume/ats-pdf";

export type PdfExtraction = {
	raw: RawExtraction;
	document: ExtractedDocument;
	paragraphs: readonly string[];
	links: readonly string[];
};

type DocxParagraph = {
	text: string;
	numbering: { numId: string; level: string; format: string; marker: string } | null;
};

export type DocxExtraction = {
	paragraphs: readonly DocxParagraph[];
	links: readonly string[];
	numberingDefinitions: number;
	numberedParagraphs: number;
};

const unescapeXml = (value: string): string =>
	value
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&apos;", "'")
		.replaceAll("&amp;", "&");

const attribute = (attributes: string, name: string): string | null => {
	const match = attributes.match(new RegExp(`(?:^|\\s)(?:[A-Za-z][\\w-]*:)?${name}="([^"]*)"`));
	return match ? unescapeXml(match[1] ?? "") : null;
};

const zipEntry = (archive: JSZip, entry: string): Promise<string | null> => {
	const file = archive.file(entry);
	return Promise.resolve(file ? file.async("string") : null);
};

export async function extractPdf(bytes: Uint8Array): Promise<PdfExtraction> {
	const loadingTask = getDocument({ data: new Uint8Array(bytes), fontExtraProperties: true });
	try {
		const document = (await loadingTask.promise) as unknown as PdfDocumentLike;
		const raw = await harvestPdfDocument(document, {
			file: { name: "synthetic-resume.pdf", sizeBytes: bytes.byteLength, magicBytesOk: true },
		});
		const extracted = buildExtractedDocument(raw);
		return {
			raw,
			document: extracted,
			paragraphs: extracted.lines.map((line) => line.text),
			links: raw.links.flatMap((link) => (link.url ? [link.url] : [])),
		};
	} finally {
		await loadingTask.destroy();
	}
}

function parseNumbering(numberingXml: string): Map<string, { format: string; marker: string }> {
	const formats = new Map<string, { format: string; marker: string }>();
	const abstractDefinitions = new Map<string, { format: string; marker: string }>();
	for (const abstract of numberingXml.matchAll(/<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g)) {
		const abstractId = attribute(abstract[1] ?? "", "abstractNumId");
		if (!abstractId) continue;
		for (const level of (abstract[2] ?? "").matchAll(/<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g)) {
			const levelId = attribute(level[1] ?? "", "ilvl") ?? "0";
			const format = attribute(level[2] ?? "", "val") ?? "unknown";
			const marker = attribute((level[2] ?? "").match(/<w:lvlText\b([^>]*)\/>/)?.[1] ?? "", "val") ?? "";
			abstractDefinitions.set(`${abstractId}:${levelId}`, { format, marker });
		}
	}
	for (const numbering of numberingXml.matchAll(/<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g)) {
		const numId = attribute(numbering[1] ?? "", "numId");
		const abstractId = attribute((numbering[2] ?? "").match(/<w:abstractNumId\b([^>]*)\/>/)?.[1] ?? "", "val");
		if (!numId || !abstractId) continue;
		for (const level of ["0", "1", "2", "3", "4", "5", "6", "7", "8"]) {
			const definition = abstractDefinitions.get(`${abstractId}:${level}`);
			if (definition) formats.set(`${numId}:${level}`, definition);
		}
	}
	return formats;
}

function parseDocxParagraphs(documentXml: string, numbering: Map<string, { format: string; marker: string }>) {
	const paragraphs: DocxParagraph[] = [];
	for (const paragraph of documentXml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)) {
		const body = paragraph[1] ?? "";
		const text = [...body.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)]
			.map((match) => unescapeXml(match[1] ?? ""))
			.join("");
		const numPr = body.match(/<w:numPr\b[^>]*>([\s\S]*?)<\/w:numPr>/)?.[1];
		const numId = numPr ? numPr.match(/<w:numId\b([^>]*)\/>/) : null;
		const level = numPr ? numPr.match(/<w:ilvl\b([^>]*)\/>/) : null;
		const numIdValue = numId ? attribute(numId[1] ?? "", "val") : null;
		const levelValue = level ? (attribute(level[1] ?? "", "val") ?? "0") : null;
		const definition = numIdValue && levelValue ? numbering.get(`${numIdValue}:${levelValue}`) : undefined;
		paragraphs.push({
			text,
			numbering:
				numIdValue && levelValue && definition
					? { numId: numIdValue, level: levelValue, format: definition.format, marker: definition.marker }
					: null,
		});
	}
	return paragraphs;
}

function parseDocxLinks(documentXml: string, relationshipsXml: string): string[] {
	const relationships = new Map<string, string>();
	for (const relationship of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
		const id = attribute(relationship[1] ?? "", "Id");
		const target = attribute(relationship[1] ?? "", "Target");
		if (id && target) relationships.set(id, target);
	}
	const links: string[] = [];
	for (const hyperlink of documentXml.matchAll(/<w:hyperlink\b([^>]*)>/g)) {
		const id = attribute(hyperlink[1] ?? "", "id");
		const target = id ? relationships.get(id) : undefined;
		if (target) links.push(target);
	}
	return links;
}

export async function extractDocx(bytes: Uint8Array): Promise<DocxExtraction> {
	const archive = await JSZip.loadAsync(bytes);
	const [documentXml, numberingXml, relationshipsXml] = await Promise.all([
		zipEntry(archive, "word/document.xml"),
		zipEntry(archive, "word/numbering.xml"),
		zipEntry(archive, "word/_rels/document.xml.rels"),
	]);
	if (!documentXml) throw new Error("DOCX archive is missing word/document.xml");
	const numbering = parseNumbering(numberingXml ?? "");
	const paragraphs = parseDocxParagraphs(documentXml, numbering);
	return {
		paragraphs,
		links: parseDocxLinks(documentXml, relationshipsXml ?? ""),
		numberingDefinitions: numbering.size,
		numberedParagraphs: paragraphs.filter((paragraph) => paragraph.numbering !== null).length,
	};
}
