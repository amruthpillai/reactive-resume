import type { InlineStyle, OdtBlock, OdtInline, OdtListItem, ParagraphPreset } from "./types";
import type { ZipEntry } from "./zip";
import type { ResumeData, SectionType } from "@reactive-resume/schema/resume/data";
import { templateLayouts } from "@reactive-resume/schema/templates";
import { parseColorString } from "@reactive-resume/utils/color";
import { isRTL } from "@reactive-resume/utils/locale";
import { toSafeLink } from "./html-to-odt";
import { renderBuiltInSection, renderCustomSection, renderSummary } from "./sections";
import { paragraph, text } from "./types";
import { escapeXml, escapeXmlText } from "./xml";

// --- ODF namespaces ---

const OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0";
const STYLE_NS = "urn:oasis:names:tc:opendocument:xmlns:style:1.0";
const TEXT_NS = "urn:oasis:names:tc:opendocument:xmlns:text:1.0";
const FO_NS = "urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const SVG_NS = "urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0";
const DC_NS = "http://purl.org/dc/elements/1.1/";
const META_NS = "urn:oasis:names:tc:opendocument:xmlns:meta:1.0";
const MANIFEST_NS = "urn:oasis:names:tc:opendocument:xmlns:manifest:1.0";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8"?>';
const NS_DECLARATIONS = [
	`xmlns:office="${OFFICE_NS}"`,
	`xmlns:style="${STYLE_NS}"`,
	`xmlns:text="${TEXT_NS}"`,
	`xmlns:fo="${FO_NS}"`,
	`xmlns:xlink="${XLINK_NS}"`,
	`xmlns:svg="${SVG_NS}"`,
].join(" ");

// --- Units and colors ---

/** Points (as stored in resume metadata) to centimetres (as ODF expects). */
function ptToCm(pt: number): string {
	return ((pt * 2.54) / 72).toFixed(3);
}

/** Rounds to a fixed number of decimals to keep the generated XML compact. */
function round(value: number, digits = 1): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

/** Formats sRGB channels as a lowercase `rrggbb` string. */
function rgbToHex(r: number, g: number, b: number): string {
	return [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}

/** Parses an `rgba()` colour to `rrggbb`, falling back when unparsable. */
function getColorHex(rgba: string, fallback: string): string {
	const parsed = parseColorString(rgba);
	return parsed ? rgbToHex(parsed.r, parsed.g, parsed.b) : fallback;
}

// DOCX/ODT have fixed pages; free-form resumes intentionally fall back to A4.
const A4_PAGE_SIZE = { width: 21, height: 29.7 };
const LETTER_PAGE_SIZE = { width: 21.59, height: 27.94 };

const PRESET_STYLE: Record<ParagraphPreset, string> = {
	body: "Body",
	title: "Title",
	subtitle: "Subtitle",
	contact: "Contact",
	entryHeading: "EntryHeading",
	meta: "Meta",
	quote: "Quote",
	code: "CodeBlock",
};

// --- Automatic styles (content-dependent: inline colours and highlights) ---

/** Interns the automatic (content-dependent) text styles a document needs and names them. */
class StyleRegistry {
	private readonly byKey = new Map<string, string>();
	private readonly xml = new Map<string, string>();
	private counter = 0;
	private linkName: string | undefined;

	constructor(private readonly primaryColor: string) {}

	/** Interns a text style, returning an existing name when the same properties recur. */
	private registerText(key: string, properties: string): string {
		const existing = this.byKey.get(key);
		if (existing) return existing;

		const name = `T${++this.counter}`;
		this.byKey.set(key, name);
		this.xml.set(name, `<style:style style:name="${name}" style:family="text">${properties}</style:style>`);
		return name;
	}

	/** Registers and returns a text-colour style. */
	color(hex: string): string {
		return this.registerText(`color:${hex}`, `<style:text-properties fo:color="#${hex}"/>`);
	}

	/** Registers and returns a highlight (background) style. */
	highlight(hex: string): string {
		return this.registerText(`highlight:${hex}`, `<style:text-properties fo:background-color="#${hex}"/>`);
	}

	/** Links share the resume's primary colour, matching the PDF and DOCX exports. */
	link(): string {
		this.linkName ??= this.registerText(
			"link",
			`<style:text-properties fo:color="#${this.primaryColor}" style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"/>`,
		);
		return this.linkName;
	}

	/** Joins every registered automatic style into stylesheet markup. */
	serialize(): string {
		return [...this.xml.values()].join("");
	}
}

/** Maps an inline style to the ODF text styles it needs, registering colours on demand. */
function inlineStyleNames(style: InlineStyle, registry: StyleRegistry): string[] {
	const names: string[] = [];
	if (style.code) names.push("Code");
	if (style.bold) names.push("Bold");
	if (style.italic) names.push("Italic");
	if (style.underline) names.push("Underline");
	if (style.strike) names.push("Strike");
	if (style.color) names.push(registry.color(style.color));
	if (style.highlight) names.push(registry.highlight(style.highlight));
	return names;
}

/** Serialises a run of inline nodes to ODF XML. */
function serializeInline(nodes: readonly OdtInline[], registry: StyleRegistry): string {
	return nodes.map((node) => serializeInlineNode(node, registry)).join("");
}

/** Serialises a single inline node to ODF XML. */
function serializeInlineNode(node: OdtInline, registry: StyleRegistry): string {
	switch (node.type) {
		case "tab":
			return "<text:tab/>";
		case "break":
			return "<text:line-break/>";
		case "link":
			return `<text:a xlink:type="simple" xlink:href="${escapeXml(node.href)}"><text:span text:style-name="${registry.link()}">${serializeInline(node.children, registry)}</text:span></text:a>`;
		case "text": {
			let output = escapeXmlText(node.text);
			for (const style of inlineStyleNames(node.style, registry)) {
				output = `<text:span text:style-name="${style}">${output}</text:span>`;
			}
			return output;
		}
	}
}

/** Serialises one list item, nesting any blocks it contains. */
function serializeListItem(item: OdtListItem, registry: StyleRegistry): string {
	let inner = "";
	for (const block of item.blocks) {
		if (block.type === "paragraph" && !block.preset && !block.indent) {
			inner += `<text:p text:style-name="ListParagraph">${serializeInline(block.children, registry)}</text:p>`;
		} else {
			inner += serializeBlock(block, registry);
		}
	}
	return `<text:list-item>${inner || "<text:p/>"}</text:list-item>`;
}

/** Serialises a block (heading, list, paragraph or rule) to ODF XML. */
function serializeBlock(block: OdtBlock, registry: StyleRegistry): string {
	switch (block.type) {
		case "rule":
			return "<text:p/>";
		case "heading": {
			const level = Math.min(Math.max(block.level, 1), 6);
			return `<text:h text:outline-level="${level}" text:style-name="SectionHeading">${serializeInline(block.children, registry)}</text:h>`;
		}
		case "list": {
			const style = block.ordered ? "NumberList" : "BulletList";
			const items = block.items.map((item) => serializeListItem(item, registry)).join("");
			return `<text:list text:style-name="${style}">${items}</text:list>`;
		}
		case "paragraph": {
			const style = block.indent ? `Indent${Math.min(block.indent, 8)}` : PRESET_STYLE[block.preset ?? "body"];
			return `<text:p text:style-name="${style}">${serializeInline(block.children, registry)}</text:p>`;
		}
	}
}

// --- Header ---

/** True when every section in the layout is a visible cover-letter section, as in DOCX. */
function isCoverLetterOnlyDocument(data: ResumeData): boolean {
	const sectionIds = data.metadata.layout.pages.flatMap((page) => [...page.main, ...page.sidebar]);
	if (sectionIds.length === 0) return false;
	return sectionIds.every((sectionId) => {
		const section = data.customSections.find((customSection) => customSection.id === sectionId);
		return section?.type === "cover-letter" && !section.hidden && section.items.some((item) => !item.hidden);
	});
}

/** Builds the name, headline and contact line that head the document. */
function buildHeaderBlocks(data: ResumeData): OdtBlock[] {
	const { basics } = data;
	const blocks: OdtBlock[] = [];

	if (basics.name) blocks.push(paragraph([text(basics.name)], "title"));
	if (basics.headline) blocks.push(paragraph([text(basics.headline)], "subtitle"));

	const contact: OdtInline[] = [];
	const addSeparator = () => {
		if (contact.length > 0) contact.push(text("  |  "));
	};

	if (basics.email) {
		const href = toSafeLink(`mailto:${basics.email}`);
		if (href) {
			addSeparator();
			contact.push({ type: "link", href, children: [text(basics.email)] });
		}
	}

	if (basics.phone) {
		addSeparator();
		contact.push(text(basics.phone));
	}

	if (basics.location) {
		addSeparator();
		contact.push(text(basics.location));
	}

	if (basics.website.url) {
		const href = toSafeLink(basics.website.url);
		if (href) {
			addSeparator();
			contact.push({ type: "link", href, children: [text(basics.website.label || href)] });
		}
	}

	for (const field of basics.customFields) {
		if (!field.text) continue;
		addSeparator();
		const href = field.link ? toSafeLink(field.link) : null;
		if (href) contact.push({ type: "link", href, children: [text(field.text)] });
		else contact.push(text(field.text));
	}

	if (contact.length > 0) blocks.push(paragraph(contact, "contact"));

	return blocks;
}

// --- Section dispatch (mirrors the DOCX builder) ---

/** Resolves a section's (usually empty) stored title from its id — locale-aware, supplied by the caller. */
export type SectionTitleResolver = (sectionId: string) => string | undefined;

/** Fills a section's stored (usually empty) title from the locale-aware resolver. */
function titled<T extends { title: string }>(section: T, sectionId: string, resolveTitle?: SectionTitleResolver): T {
	return { ...section, title: resolveTitle?.(sectionId)?.trim() || section.title };
}

/** Renders any section id - summary, built-in or custom - to ODT blocks. */
function renderSection(sectionId: string, data: ResumeData, resolveTitle?: SectionTitleResolver): OdtBlock[] {
	if (sectionId === "summary") {
		return renderSummary(titled(data.summary, sectionId, resolveTitle));
	}

	if (sectionId in data.sections) {
		const section = data.sections[sectionId as SectionType];
		if (section) return renderBuiltInSection(sectionId as SectionType, titled(section, sectionId, resolveTitle));
		return [];
	}

	const customSection = data.customSections.find((candidate) => candidate.id === sectionId);
	if (customSection) return renderCustomSection(titled(customSection, sectionId, resolveTitle));

	return [];
}

// --- Style sheet ---

/** Declares the body, heading and code font faces used by the stylesheet. */
function fontFaceDecls(bodyFont: string, headingFont: string): string {
	return [
		"<office:font-face-decls>",
		`<style:font-face style:name="BodyFont" svg:font-family="${escapeXml(`'${bodyFont}'`)}"/>`,
		`<style:font-face style:name="HeadingFont" svg:font-family="${escapeXml(`'${headingFont}'`)}"/>`,
		`<style:font-face style:name="CodeFont" svg:font-family="${escapeXml("'Courier New', monospace")}"/>`,
		"</office:font-face-decls>",
	].join("");
}

type StyleConfig = {
	bodySize: number;
	headingSize: number;
	nameSize: number;
	codeSize: number;
	lineHeightPercent: number;
	primary: string;
	textColor: string;
	headingFont: string;
	bodyFont: string;
};

/** Builds `styles.xml`: page setup, paragraph/character styles and list styles. */
function buildStylesXml(
	config: StyleConfig,
	page: {
		width: number;
		height: number;
		marginX: number;
		marginY: number;
		background: string;
		writingMode: "lr-tb" | "rl-tb";
	},
): string {
	const textWidth = page.width - page.marginX * 2;
	const { primary, textColor } = config;

	const paragraphStyles = [
		`<style:style style:name="Standard" style:family="paragraph" style:class="text"/>`,
		`<style:style style:name="Body" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0.12cm"/></style:style>`,
		`<style:style style:name="Title" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.08cm"/><style:text-properties style:font-name="HeadingFont" fo:font-size="${config.nameSize}pt" fo:font-weight="bold" fo:color="#${primary}"/></style:style>`,
		`<style:style style:name="Subtitle" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.15cm"/><style:text-properties fo:font-size="${config.bodySize}pt" fo:font-style="italic" fo:color="#${textColor}"/></style:style>`,
		`<style:style style:name="Contact" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.35cm"/><style:text-properties fo:font-size="${config.bodySize}pt" fo:color="#${textColor}"/></style:style>`,
		`<style:style style:name="SectionHeading" style:family="paragraph" style:parent-style-name="Standard" style:default-outline-level="1"><style:paragraph-properties fo:margin-top="0.4cm" fo:margin-bottom="0.15cm" fo:border-bottom="0.5pt solid #${primary}" fo:padding-bottom="0.05cm" fo:keep-with-next="always"/><style:text-properties style:font-name="HeadingFont" fo:font-size="${config.headingSize}pt" fo:font-weight="bold" fo:color="#${primary}"/></style:style>`,
		`<style:style style:name="EntryHeading" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0.15cm" fo:margin-bottom="0.02cm"><style:tab-stops><style:tab-stop style:position="${textWidth.toFixed(3)}cm" style:type="right"/></style:tab-stops></style:paragraph-properties></style:style>`,
		`<style:style style:name="Meta" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.1cm"/><style:text-properties fo:font-style="italic" fo:color="#${textColor}"/></style:style>`,
		`<style:style style:name="Quote" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-left="0.5cm" fo:margin-bottom="0.12cm"/><style:text-properties fo:font-style="italic"/></style:style>`,
		`<style:style style:name="CodeBlock" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.12cm"/><style:text-properties style:font-name="CodeFont" fo:font-size="${config.codeSize}pt"/></style:style>`,
		`<style:style style:name="ListParagraph" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-bottom="0.05cm"/></style:style>`,
		...Array.from(
			{ length: 8 },
			(_, index) =>
				`<style:style style:name="Indent${index + 1}" style:family="paragraph" style:parent-style-name="Body"><style:paragraph-properties fo:margin-left="${((index + 1) * 0.5).toFixed(2)}cm"/></style:style>`,
		),
	].join("");

	const textStyles = [
		`<style:style style:name="Bold" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>`,
		`<style:style style:name="Italic" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>`,
		`<style:style style:name="Underline" style:family="text"><style:text-properties style:text-underline-style="solid" style:text-underline-width="auto" style:text-underline-color="font-color"/></style:style>`,
		`<style:style style:name="Strike" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>`,
		`<style:style style:name="Code" style:family="text"><style:text-properties style:font-name="CodeFont" fo:font-size="${config.codeSize}pt"/></style:style>`,
	].join("");

	const listStyles = [
		'<text:list-style style:name="BulletList">',
		'<text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.4cm"/></text:list-level-style-bullet>',
		'<text:list-level-style-bullet text:level="2" text:bullet-char="◦"><style:list-level-properties text:space-before="1cm" text:min-label-width="0.4cm"/></text:list-level-style-bullet>',
		'<text:list-level-style-bullet text:level="3" text:bullet-char="▪"><style:list-level-properties text:space-before="1.5cm" text:min-label-width="0.4cm"/></text:list-level-style-bullet>',
		"</text:list-style>",
		'<text:list-style style:name="NumberList">',
		'<text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="0.5cm" text:min-label-width="0.4cm"/></text:list-level-style-number>',
		'<text:list-level-style-number text:level="2" style:num-format="a" style:num-suffix="."><style:list-level-properties text:space-before="1cm" text:min-label-width="0.4cm"/></text:list-level-style-number>',
		'<text:list-level-style-number text:level="3" style:num-format="i" style:num-suffix="."><style:list-level-properties text:space-before="1.5cm" text:min-label-width="0.4cm"/></text:list-level-style-number>',
		"</text:list-style>",
	].join("");

	const pageLayout = [
		"<office:automatic-styles>",
		'<style:page-layout style:name="pm1">',
		`<style:page-layout-properties fo:page-width="${page.width}cm" fo:page-height="${page.height}cm" style:print-orientation="portrait" fo:margin-top="${page.marginY}cm" fo:margin-bottom="${page.marginY}cm" fo:margin-left="${page.marginX}cm" fo:margin-right="${page.marginX}cm" style:writing-mode="${page.writingMode}" fo:background-color="#${page.background}"/>`,
		"</style:page-layout>",
		"</office:automatic-styles>",
	].join("");

	return [
		XML_DECLARATION,
		`<office:document-styles ${NS_DECLARATIONS} office:version="1.3">`,
		fontFaceDecls(config.bodyFont, config.headingFont),
		"<office:styles>",
		`<style:default-style style:family="paragraph"><style:paragraph-properties fo:orphans="2" fo:widows="2" fo:line-height="${config.lineHeightPercent}%"/><style:text-properties style:font-name="BodyFont" fo:font-size="${config.bodySize}pt" fo:color="#${textColor}"/></style:default-style>`,
		`<style:style style:name="Standard" style:family="paragraph" style:class="text"/>`,
		paragraphStyles,
		textStyles,
		listStyles,
		"</office:styles>",
		pageLayout,
		'<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>',
		"</office:document-styles>",
	].join("");
}

/** Wraps the document body in the `content.xml` envelope. */
function buildContentXml(body: string, registry: StyleRegistry, config: StyleConfig): string {
	return [
		XML_DECLARATION,
		`<office:document-content ${NS_DECLARATIONS} xmlns:dc="${DC_NS}" office:version="1.3">`,
		fontFaceDecls(config.bodyFont, config.headingFont),
		`<office:automatic-styles>${registry.serialize()}</office:automatic-styles>`,
		"<office:body><office:text>",
		body,
		"</office:text></office:body>",
		"</office:document-content>",
	].join("");
}

/** Builds `meta.xml` with the document title and generator metadata. */
function buildMetaXml(title: string): string {
	return [
		XML_DECLARATION,
		`<office:document-meta xmlns:office="${OFFICE_NS}" xmlns:meta="${META_NS}" xmlns:dc="${DC_NS}" office:version="1.3">`,
		`<office:meta><dc:title>${escapeXmlText(title)}</dc:title><meta:generator>Reactive Resume</meta:generator></office:meta>`,
		"</office:document-meta>",
	].join("");
}

const MANIFEST = [
	XML_DECLARATION,
	`<manifest:manifest xmlns:manifest="${MANIFEST_NS}" manifest:version="1.3">`,
	'<manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text" manifest:version="1.3"/>',
	'<manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>',
	'<manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>',
	'<manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>',
	"</manifest:manifest>",
].join("");

export const ODT_MIME_TYPE = "application/vnd.oasis.opendocument.text";

/**
 * Builds the OpenDocument Text file set from resume data.
 *
 * Layout is intentionally single-column: pages that use a sidebar print its sections after the
 * main ones, matching the ATS-safe fallback of the PDF and DOCX exports. The result is a fully
 * editable ODT document rather than a pixel-perfect reproduction of the template.
 */
export function buildOdtFiles(data: ResumeData, resolveTitle?: SectionTitleResolver): ZipEntry[] {
	const primary = getColorHex(data.metadata.design.colors.primary, "dc2626");
	const textColor = getColorHex(data.metadata.design.colors.text, "000000");
	const background = getColorHex(data.metadata.design.colors.background, "ffffff");

	const { page, typography } = data.metadata;
	const pageSize = page.format === "letter" ? LETTER_PAGE_SIZE : A4_PAGE_SIZE;
	const bodySize = typography.body.fontSize;
	const headingSize = typography.heading.fontSize;

	const config: StyleConfig = {
		bodySize: round(bodySize),
		headingSize: round(headingSize),
		nameSize: round(headingSize * 1.25),
		codeSize: round(Math.max(bodySize - 1, 7)),
		lineHeightPercent: Math.round(typography.body.lineHeight * 100),
		primary,
		textColor,
		headingFont: typography.heading.fontFamily || "Inter",
		bodyFont: typography.body.fontFamily || "Inter",
	};

	const templateLayout = templateLayouts[data.metadata.template];
	const showHeader = !isCoverLetterOnlyDocument(data);
	const registry = new StyleRegistry(primary);
	const blocks: OdtBlock[] = [];

	if (templateLayout.headerPlacement === "full-width" && showHeader) {
		blocks.push(...buildHeaderBlocks(data));
	}

	for (const layoutPage of data.metadata.layout.pages) {
		const sidebar = layoutPage.fullWidth ? [] : layoutPage.sidebar;
		const isSplit = templateLayout.columns !== 1 && sidebar.length > 0;

		if (!isSplit) {
			for (const sectionId of [...layoutPage.main, ...sidebar]) {
				blocks.push(...renderSection(sectionId, data, resolveTitle));
			}
			continue;
		}

		if (templateLayout.headerPlacement === "main-only" && showHeader) blocks.push(...buildHeaderBlocks(data));
		for (const sectionId of layoutPage.main) blocks.push(...renderSection(sectionId, data, resolveTitle));

		if (templateLayout.headerPlacement === "sidebar-only" && showHeader) blocks.push(...buildHeaderBlocks(data));
		for (const sectionId of layoutPage.sidebar) blocks.push(...renderSection(sectionId, data, resolveTitle));
	}

	const body = blocks.map((block) => serializeBlock(block, registry)).join("");

	const styles = buildStylesXml(config, {
		width: pageSize.width,
		height: pageSize.height,
		marginX: Number(ptToCm(page.marginX)),
		marginY: Number(ptToCm(page.marginY)),
		background,
		writingMode: isRTL(page.locale) ? "rl-tb" : "lr-tb",
	});

	// ODF requires `mimetype` to be the first, uncompressed entry.
	return [
		{ path: "mimetype", content: ODT_MIME_TYPE },
		{ path: "META-INF/manifest.xml", content: MANIFEST },
		{ path: "content.xml", content: buildContentXml(body, registry, config) },
		{ path: "styles.xml", content: styles },
		{ path: "meta.xml", content: buildMetaXml(data.basics.name || "Resume") },
	];
}
