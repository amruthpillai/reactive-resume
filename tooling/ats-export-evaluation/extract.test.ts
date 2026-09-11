import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { extractDocx } from "./extract";

const numberedDocument = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="42"/></w:numPr></w:pPr><w:r><w:t>First item</w:t></w:r><w:hyperlink r:id="rId1"><w:r><w:t>link</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="42"/></w:numPr></w:pPr><w:r><w:t>Second item</w:t></w:r></w:p>
  </w:body>
</w:document>`;

const numberedDefinitions = `<?xml version="1.0" encoding="UTF-8"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="7">
    <w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl>
    <w:lvl w:ilvl="1"><w:numFmt w:val="lowerLetter"/><w:lvlText w:val="%2)"/></w:lvl>
  </w:abstractNum>
  <w:num w:numId="42"><w:abstractNumId w:val="7"/></w:num>
</w:numbering>`;

const relationships = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/item" TargetMode="External"/></Relationships>`;

function createDocxZip(entries: Record<string, string>): Promise<Uint8Array> {
	const zip = new JSZip();
	for (const [name, content] of Object.entries(entries)) zip.file(name, content);
	return zip.generateAsync({ type: "uint8array" });
}

describe("DOCX extraction", () => {
	it("extracts numbering identity and link targets in paragraph order", async () => {
		const bytes = await createDocxZip({
			"word/document.xml": numberedDocument,
			"word/numbering.xml": numberedDefinitions,
			"word/_rels/document.xml.rels": relationships,
		});

		const result = await extractDocx(bytes);

		expect(result.paragraphs).toEqual([
			{ text: "First itemlink", numbering: { numId: "42", level: "1", format: "lowerLetter", marker: "%2)" } },
			{ text: "Second item", numbering: { numId: "42", level: "0", format: "decimal", marker: "%1." } },
		]);
		expect(result.links).toEqual(["https://example.com/item"]);
		expect(result.numberedParagraphs).toBe(2);
	});

	it("handles valid DOCX archives without optional XML entries", async () => {
		const bytes = await createDocxZip({ "word/document.xml": numberedDocument });

		const result = await extractDocx(bytes);

		expect(result.paragraphs.map((paragraph) => paragraph.numbering)).toEqual([null, null]);
		expect(result.links).toEqual([]);
		expect(result.numberingDefinitions).toBe(0);
		expect(result.numberedParagraphs).toBe(0);
	});
});
