import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseTemplate, TemplateParseError } from "./parse-template";

const validMeta = {
	id: "test",
	name: "Test",
	sidebarPosition: "none",
};

async function makeZip(files: Record<string, string>): Promise<Buffer> {
	const zip = new JSZip();
	for (const [name, content] of Object.entries(files)) {
		zip.file(name, content);
	}
	return zip.generateAsync({ type: "nodebuffer" });
}

describe("parseTemplate", () => {
	it("extracts metadata from template.json", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><head></head><body></body></html>",
		});
		const result = await parseTemplate(buf);
		expect(result.metadata.id).toBe("test");
		expect(result.metadata.sidebarPosition).toBe("none");
	});

	it("returns empty inputs when no resume-slot tags", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><head></head><body></body></html>",
		});
		const result = await parseTemplate(buf);
		expect(result.inputs).toEqual([]);
	});

	it("extracts resume-slot tags from section files", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><head></head><body></body></html>",
			"sections/experience.html": `<resume-slot id="additionalHtml" item-type="experienceItem" type="rich-text" label="Additional section" />`,
		});
		const result = await parseTemplate(buf);
		expect(result.inputs).toHaveLength(1);
		expect(result.inputs[0]).toMatchObject({
			id: "additionalHtml",
			itemType: "experienceItem",
			type: "rich-text",
			label: "Additional section",
			required: false,
		});
	});

	it("includes all files in the returned files map", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html></html>",
			"sections/skills.html": "<p>Skills</p>",
		});
		const result = await parseTemplate(buf);
		expect(result.files["index.html"]).toBe("<html></html>");
		expect(result.files["sections/skills.html"]).toBe("<p>Skills</p>");
	});

	it("throws TemplateParseError when template.json is missing", async () => {
		const buf = await makeZip({ "index.html": "<html></html>" });
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when index.html is missing", async () => {
		const buf = await makeZip({ "template.json": JSON.stringify(validMeta) });
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when template.json has invalid JSON", async () => {
		const buf = await makeZip({
			"template.json": "not valid json",
			"index.html": "<html></html>",
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when metadata fails schema validation", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify({ id: "test" }), // missing required name + sidebarPosition
			"index.html": "<html></html>",
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when a resume-slot has an unknown item-type", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html></html>",
			"sections/experience.html": `<resume-slot id="f" item-type="unknownItem" type="text" label="F" />`,
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError for path traversal filenames", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html></html>",
			"../etc/passwd": "root:x:0:0",
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError for Nunjucks syntax errors (Layer 3)", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html>{% for item in %}</html>", // broken Nunjucks
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when dry-run render crashes (Layer 5)", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "{{ undefinedVar.deeply.nested.crash() }}",
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("throws TemplateParseError when template contains script tag (Layer 6)", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><head><script>alert(1)</script></head><body></body></html>",
		});
		await expect(parseTemplate(buf)).rejects.toThrow(TemplateParseError);
	});

	it("emits sidebar-not-rendered warning when sidebar declared but not referenced", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify({ ...validMeta, sidebarPosition: "left" }),
			"index.html":
				"<html><body>{% for page in metadata.layout.pages %}{% for id in page.main %}{{ id }}{% endfor %}{% endfor %}</body></html>",
		});
		const result = await parseTemplate(buf);
		expect(result.warnings.some((w) => w.type === "sidebar-not-rendered")).toBe(true);
	});

	it("emits section-not-implemented warnings when sections have no file and no default.html", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><body></body></html>",
		});
		const result = await parseTemplate(buf);
		expect(result.warnings.some((w) => w.type === "section-not-implemented")).toBe(true);
	});

	it("does not emit section-not-implemented when sections/default.html exists", async () => {
		const buf = await makeZip({
			"template.json": JSON.stringify(validMeta),
			"index.html": "<html><body></body></html>",
			"sections/default.html": "<p>{{ sectionId }}</p>",
		});
		const result = await parseTemplate(buf);
		expect(result.warnings.filter((w) => w.type === "section-not-implemented")).toHaveLength(0);
	});

	it("extracts binary font files as base64 strings", async () => {
		// Create a minimal valid WOFF2 magic-bytes buffer
		const woff2Magic = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0x00, 0x01, 0x00, 0x00]);
		const zip = new JSZip();
		zip.file(
			"template.json",
			JSON.stringify({
				...validMeta,
				fonts: [{ family: "TestFont", weights: [400], source: "bundled", files: { "400": "fonts/test-400.woff2" } }],
			}),
		);
		zip.file("index.html", "<html></html>");
		zip.file("fonts/test-400.woff2", woff2Magic);
		const buf = await zip.generateAsync({ type: "nodebuffer" });
		const result = await parseTemplate(buf);
		// Font file stored as base64, not raw binary string
		expect(typeof result.files["fonts/test-400.woff2"]).toBe("string");
		expect(result.files["fonts/test-400.woff2"]).toBe(woff2Magic.toString("base64"));
	});
});
