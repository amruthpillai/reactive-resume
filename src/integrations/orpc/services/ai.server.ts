import { extractRawText } from "mammoth";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(base64Data: string): Promise<string> {
	const pdfParse = new PDFParse({ data: base64Data });
	const data = await pdfParse.getText();
	return data.text;
}

export async function extractDocxText(base64Data: string): Promise<string> {
	const buffer = Buffer.from(base64Data, "base64");
	const data = await extractRawText({ buffer });
	return data.value;
}
