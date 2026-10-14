import type { OdtBlock, OdtInline } from "./types";
import type { ZipEntry } from "./zip";
import { describe, expect, it } from "vitest";
import { getResumeExportData } from "@reactive-resume/resume/export-sections";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { buildOdtFiles, ODT_MIME_TYPE } from "./builder";
import { htmlToOdtBlocks, toSafeLink } from "./html-to-odt";
import { createZip } from "./zip";

const resolveTitle = (sectionId: string) =>
	({ summary: "Summary", experience: "Experience", education: "Education", profiles: "Profiles" })[sectionId];

function getBlock<T extends OdtBlock["type"]>(
	blocks: OdtBlock[],
	index: number,
	type: T,
): Extract<OdtBlock, { type: T }> {
	const block = blocks[index];
	if (!block || block.type !== type) throw new Error(`Expected block #${index} to be ${type}`);
	return block as Extract<OdtBlock, { type: T }>;
}

function getChildren(block: OdtBlock): OdtInline[] {
	if (block.type !== "paragraph" && block.type !== "heading") throw new Error("Block has no inline children");
	return block.children;
}

describe("toSafeLink", () => {
	it("keeps safe absolute links", () => {
		expect(toSafeLink("https://example.com")).toBe("https://example.com/");
		expect(toSafeLink("http://example.com/path")).toBe("http://example.com/path");
		expect(toSafeLink("mailto:test@example.com")).toBe("mailto:test@example.com");
		expect(toSafeLink("tel:+15551234567")).toBe("tel:+15551234567");
	});

	it("drops unsafe schemes and relative URLs", () => {
		expect(toSafeLink("javascript:alert(1)")).toBeNull();
		expect(toSafeLink("data:text/html,<script>")).toBeNull();
		expect(toSafeLink("/relative")).toBeNull();
		expect(toSafeLink("")).toBeNull();
		expect(toSafeLink("   ")).toBeNull();
	});
});

describe("createZip", () => {
	it("produces a valid ZIP with CRC32 and central directory", () => {
		const entries: ZipEntry[] = [
			{ path: "mimetype", content: ODT_MIME_TYPE },
			{ path: "content.xml", content: "<test/>" },
		];
		const archive = createZip(entries);
		expect(archive.length).toBeGreaterThan(100);
		// local file header signature
		expect(archive[0]).toBe(0x50);
		expect(archive[1]).toBe(0x4b);
		expect(archive[2]).toBe(0x03);
		expect(archive[3]).toBe(0x04);
		// end of central directory signature
		expect(archive.slice(-22)[0]).toBe(0x50);
		expect(archive.slice(-22)[1]).toBe(0x4b);
		expect(archive.slice(-22)[2]).toBe(0x05);
		expect(archive.slice(-22)[3]).toBe(0x06);
	});

	it("is deterministic for identical input", () => {
		const entries: ZipEntry[] = [{ path: "a.txt", content: "hello" }];
		expect(createZip(entries)).toEqual(createZip(entries));
	});
});

describe("htmlToOdtBlocks", () => {
	it("converts basic inline formatting", () => {
		const blocks = htmlToOdtBlocks(
			"<p>Plain <strong>bold</strong> <em>italic</em> <u>underline</u> <s>strike</s> <code>code</code></p>",
		);
		expect(blocks).toHaveLength(1);
		expect(getBlock(blocks, 0, "paragraph").type).toBe("paragraph");
	});

	it("converts links", () => {
		const blocks = htmlToOdtBlocks('<p>See <a href="https://example.com">Example</a></p>');
		const children = getChildren(getBlock(blocks, 0, "paragraph"));
		const link = children.find((child): child is Extract<OdtInline, { type: "link" }> => child.type === "link");
		expect(link).toBeDefined();
		expect(link?.href).toBe("https://example.com/");
	});

	it("converts headings", () => {
		const blocks = htmlToOdtBlocks("<h2>Section</h2><h3>Sub</h3>");
		expect(blocks).toHaveLength(2);
		expect(getBlock(blocks, 0, "heading").level).toBe(2);
	});

	it("converts lists", () => {
		const blocks = htmlToOdtBlocks("<ul><li>One</li><li>Two</li></ul><ol><li>First</li></ol>");
		expect(blocks).toHaveLength(2);
		expect(getBlock(blocks, 0, "list").ordered).toBe(false);
		expect(getBlock(blocks, 1, "list").ordered).toBe(true);
	});

	it("converts blockquote to quote paragraphs", () => {
		const blocks = htmlToOdtBlocks("<blockquote><p>Quoted text</p></blockquote>");
		expect(blocks).toHaveLength(1);
		expect(getBlock(blocks, 0, "paragraph").preset).toBe("quote");
	});

	it("converts pre to code block", () => {
		const blocks = htmlToOdtBlocks("<pre>code</pre>");
		expect(getBlock(blocks, 0, "paragraph").preset).toBe("code");
	});

	it("converts hr to rule", () => {
		const blocks = htmlToOdtBlocks("<hr>");
		expect(getBlock(blocks, 0, "rule").type).toBe("rule");
	});
});

describe("buildOdtFiles", () => {
	it("generates all required ODF entries in order", () => {
		const files = buildOdtFiles(sampleResumeData, resolveTitle);
		expect(files.map((file) => file.path)).toEqual([
			"mimetype",
			"META-INF/manifest.xml",
			"content.xml",
			"styles.xml",
			"meta.xml",
		]);
		expect(files[0]?.content).toBe(ODT_MIME_TYPE);
	});

	it("includes resume data in content.xml", () => {
		const files = buildOdtFiles(sampleResumeData, resolveTitle);
		const content = files.find((file) => file.path === "content.xml")?.content ?? "";
		expect(content).toContain("David Kowalski");
		expect(content).toContain("Game Developer");
		expect(content).toContain("Experience");
		expect(content).toContain("Education");
	});

	it("includes style config in styles.xml", () => {
		const files = buildOdtFiles(sampleResumeData, resolveTitle);
		const styles = files.find((file) => file.path === "styles.xml")?.content ?? "";
		expect(styles).toContain("font-face-decls");
		expect(styles).toContain("SectionHeading");
		expect(styles).toContain("EntryHeading");
		expect(styles).toContain("BulletList");
	});

	it("generates valid meta.xml with title", () => {
		const files = buildOdtFiles(sampleResumeData, resolveTitle);
		const meta = files.find((file) => file.path === "meta.xml")?.content ?? "";
		expect(meta).toContain("<dc:title>David Kowalski</dc:title>");
		expect(meta).toContain("Reactive Resume");
	});

	it("generates valid manifest.xml", () => {
		const files = buildOdtFiles(sampleResumeData, resolveTitle);
		const manifest = files.find((file) => file.path === "META-INF/manifest.xml")?.content ?? "";
		expect(manifest).toContain("manifest:file-entry");
		expect(manifest).toContain("content.xml");
		expect(manifest).toContain("styles.xml");
		expect(manifest).toContain("meta.xml");
	});
});

describe("buildOdt end-to-end", () => {
	it("produces a valid Blob with correct MIME type", async () => {
		const { buildOdt } = await import("./index");
		const blob = await buildOdt(sampleResumeData, resolveTitle);
		expect(blob).toBeInstanceOf(Blob);
		expect(blob.type).toBe(ODT_MIME_TYPE);
		expect(blob.size).toBeGreaterThan(1000);
	});

	it("produces deterministic output", async () => {
		const { buildOdt } = await import("./index");
		const a = await buildOdt(sampleResumeData, resolveTitle);
		const b = await buildOdt(sampleResumeData, resolveTitle);
		expect(await a.arrayBuffer()).toEqual(await b.arrayBuffer());
	});
});

describe("export sections scope", () => {
	it("cover-letter scope excludes header and only includes letter sections", async () => {
		const { buildOdt } = await import("./index");

		const data = structuredClone(sampleResumeData);
		data.customSections.push({
			id: "letter-section",
			type: "cover-letter",
			title: "Cover Letter",
			icon: "mail",
			columns: 1,
			hidden: false,
			showHeading: true,
			keepTogether: false,
			startOnNewPage: false,
			items: [
				{
					id: "letter-item",
					hidden: false,
					recipient: "<p>Hiring Manager</p>",
					content: "<p>Dear Hiring Manager,</p><p>I'm excited to apply.</p>",
				},
			],
		});
		data.metadata.layout.pages.push({ fullWidth: true, main: ["letter-section"], sidebar: [] });

		const coverExport = getResumeExportData(data, "cover-letter");
		const blob = await buildOdt(coverExport, resolveTitle);
		const fullText = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));

		expect(fullText).toContain("Dear Hiring Manager");
		expect(fullText).not.toContain("Game Developer");
		expect(fullText).not.toContain("Cover Letter");
	});

	it("resume scope includes header and resume sections", async () => {
		const { buildOdt } = await import("./index");
		const resumeExport = getResumeExportData(sampleResumeData, "resume");
		const blob = await buildOdt(resumeExport, resolveTitle);
		const fullText = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()));

		expect(fullText).toContain("David Kowalski");
		expect(fullText).toContain("Game Developer");
		expect(fullText).toContain("Experience");
		expect(fullText).toContain("Education");
	});
});
