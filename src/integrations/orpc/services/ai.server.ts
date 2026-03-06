export async function extractPdfText(base64Data: string): Promise<string> {
	// @ts-ignore
	const mod = await import("pdf-parse/lib/pdf-parse.js");
	const pdfParse = mod.default || mod;
	const buffer = Buffer.from(base64Data, "base64");
	const data = await pdfParse(buffer);
	return data.text;
}

export async function extractDocxText(base64Data: string): Promise<string> {
	const mammoth = await import("mammoth");
	const buffer = Buffer.from(base64Data, "base64");
	const data = await mammoth.extractRawText({ buffer });
	return data.value;
}
