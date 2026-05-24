import type { Layout, ResumeData, TypographySlotValue } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";
import { buildResumeFontFamily, getLoadableWebFontWeights, getWebFont } from "@reactive-resume/fonts";

const joinFont = (fontFamily: string): string => buildResumeFontFamily(fontFamily);

const parseWeight = (w: string | undefined, fallback: number): number => {
	const n = Number.parseInt(w ?? String(fallback), 10);
	return Number.isNaN(n) ? fallback : n;
};

const buildPageRule = (format: string): string => {
	const size = format === "letter" ? "letter" : format === "free-form" ? "auto" : "A4";
	return `  @page {\n    size: ${size};\n    margin: 0;\n  }`;
};

const buildTypographyFontDeclarations = (data: ResumeData, metadata: TemplateMetadata): string[] => {
	const declarations: string[] = [];
	const seen = new Set<string>();
	const bodyWeights = data.metadata.typography.body.fontWeights;
	const headingWeights = data.metadata.typography.heading.fontWeights;
	const slotOverrides: Record<string, TypographySlotValue> = data.metadata.typography.slots ?? {};
	const requestedFonts = new Map<string, string[]>();

	requestedFonts.set(data.metadata.typography.body.fontFamily, [...bodyWeights, "700"]);
	requestedFonts.set(data.metadata.typography.heading.fontFamily, [
		...(requestedFonts.get(data.metadata.typography.heading.fontFamily) ?? []),
		...headingWeights,
	]);

	for (const slot of metadata.typography ?? []) {
		const override = slotOverrides[slot.id];
		const family = override?.fontFamily ?? slot.defaultFont;
		if (!family) continue;
		const weight = String(override?.fontWeight ?? slot.defaultWeight ?? 400);
		requestedFonts.set(family, [...(requestedFonts.get(family) ?? []), weight]);
	}

	for (const [family, preferredWeights] of requestedFonts) {
		const webFont = getWebFont(family);
		if (!webFont) continue;

		for (const weight of getLoadableWebFontWeights(family, preferredWeights)) {
			const key = `${family}:${weight}`;
			if (seen.has(key)) continue;
			seen.add(key);
			const src = webFont.files[weight] ?? webFont.preview;
			declarations.push(
				`@font-face {\n  font-family: ${JSON.stringify(family)};\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(${JSON.stringify(src)}) format("truetype");\n}`,
			);
		}
	}

	return declarations;
};

const buildFontFaceBlock = (
	data: ResumeData,
	metadata: TemplateMetadata,
	templateId: string,
	baseUrl: string,
): string => {
	const declarations: string[] = [];
	declarations.push(...buildTypographyFontDeclarations(data, metadata));
	for (const font of metadata.fonts) {
		if (font.source === "google") continue;
		for (const [weight, path] of Object.entries(font.files ?? {})) {
			declarations.push(
				`@font-face {\n  font-family: ${JSON.stringify(font.family)};\n  font-style: normal;\n  font-weight: ${weight};\n  font-display: swap;\n  src: url(${JSON.stringify(`${baseUrl}/api/templates/${templateId}/fonts/${path}`)}) format("woff2");\n}`,
			);
		}
	}
	if (declarations.length === 0) return "";
	return `<style id="resume-fonts">\n${declarations.join("\n")}\n</style>`;
};

const slotLine = (id: string, font: string, size: number, weight: number, lineHeight: number): string =>
	`  --resume-font-${id}: ${joinFont(font)};\n  --resume-size-${id}: ${size}px;\n  --resume-weight-${id}: ${weight};\n  --resume-line-height-${id}: ${lineHeight};`;

const buildTypographySlotVars = (data: ResumeData, tmplMeta: TemplateMetadata): string => {
	const t = data.metadata.typography;
	const bodyWeight = parseWeight(t.body.fontWeights[0], 400);
	const bodyBoldWeight = parseWeight(t.body.fontWeights.at(-1), 600);
	const headWeight = parseWeight(t.heading.fontWeights.at(-1), 600);

	const lines: string[] = [
		slotLine("body", t.body.fontFamily, t.body.fontSize, bodyWeight, t.body.lineHeight),
		`  --resume-weight-body-bold: ${bodyBoldWeight};`,
		slotLine("heading", t.heading.fontFamily, t.heading.fontSize, headWeight, t.heading.lineHeight),
	];

	const userSlots: Record<string, TypographySlotValue> = t.slots ?? {};

	for (const slot of tmplMeta.typography ?? []) {
		if (slot.id === "body" || slot.id === "heading") continue;
		const u = userSlots[slot.id] ?? {};
		const font = u.fontFamily ?? slot.defaultFont ?? t.body.fontFamily;
		const size = u.fontSize ?? slot.defaultSize ?? t.body.fontSize;
		const weight = u.fontWeight ?? slot.defaultWeight ?? bodyWeight;
		const lh = u.lineHeight ?? slot.defaultLineHeight ?? t.body.lineHeight;
		lines.push(slotLine(slot.id, font, size, weight, lh));
	}

	return lines.join("\n");
};

const buildSidebarVars = (tmpl: TemplateMetadata, data: ResumeData): string => {
	const { sidebarPosition } = tmpl;
	if (sidebarPosition === "none") return "";
	const layout = data.metadata.layout as Layout;
	const side = sidebarPosition === "either" ? (layout.sidebarPosition ?? "left") : sidebarPosition;
	const contentAreas = side === "right" ? '"main sidebar"' : '"sidebar main"';
	const areas = `"header header" ${contentAreas}`;
	const columns = side === "right" ? "1fr var(--resume-sidebar-width)" : "var(--resume-sidebar-width) 1fr";
	return `  --resume-sidebar-grid-areas: ${areas};\n  --resume-sidebar-grid-columns: ${columns};`;
};

export const buildInjectedStyles = (
	data: ResumeData,
	templateMetadata: TemplateMetadata,
	templateId: string,
	baseUrl: string,
): string => {
	const { page, layout, design } = data.metadata;
	const sidebarWidth = layout.sidebarWidth ?? 35;

	const fontFaceBlock = buildFontFaceBlock(data, templateMetadata, templateId, baseUrl);
	const typographyVars = buildTypographySlotVars(data, templateMetadata);
	const sidebarVars = buildSidebarVars(templateMetadata, data);
	const pageRule = buildPageRule(page.format);

	const cssVarsBlock = `<style id="resume-css-vars">
${pageRule}

:root {
  --resume-primary: ${design.colors.primary};
  --resume-foreground: ${design.colors.text};
  --resume-background: ${design.colors.background};
  --resume-page-padding-x: ${page.marginX}px;
  --resume-page-padding-y: ${page.marginY}px;
  --resume-sidebar-width: ${sidebarWidth}%;
${sidebarVars ? `${sidebarVars}\n` : ""}  --resume-section-gap: ${page.gapY}px;
  --resume-column-gap: ${page.gapX}px;
${typographyVars}
}

.page-sections:not(:last-child) { break-after: page; }
.page-layout:not(:last-child) { break-after: page; }

/* Rich text inline formatting — shared across all HTML templates */
.rich-text p { margin: calc(var(--resume-line-height-body, 1.5) * 0.2em) 0; }
.rich-text p:first-child { margin-top: 0; }
.rich-text p:last-child { margin-bottom: 0; }
.rich-text ul,
.rich-text ol {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rich-text li {
  position: relative;
  margin: calc(var(--resume-line-height-body, 1.5) * 0.2em) 0;
  padding-left: 1.33em;
}
.rich-text li > p {
  margin: 0;
}
.rich-text ul > li::before,
.rich-text ol > li::before {
  position: absolute;
  left: 0;
  top: 0;
  width: 1em;
  text-align: right;
  color: var(--resume-foreground, inherit);
}
.rich-text ul > li::before { content: "•"; }
.rich-text ol { counter-reset: resume-ol; }
.rich-text ol > li { counter-increment: resume-ol; }
.rich-text ol > li::before { content: counter(resume-ol) "."; }
.rich-text li > *:last-child { margin-bottom: 0; }
.rich-text .rr-pdf-mark {
  background: #ffff00;
}
.rich-text strong, .rich-text b { font-weight: var(--resume-weight-body-bold, 700); }
.rich-text em, .rich-text i { font-style: italic; }
.rich-text u { text-decoration: underline; }
.rich-text s { text-decoration: line-through; }
.rich-text a {
  color: inherit;
  text-decoration: underline;
  text-decoration-thickness: 0.5px;
  text-underline-offset: 1px;
}
</style>`;

	return [fontFaceBlock, cssVarsBlock].filter(Boolean).join("\n");
};
