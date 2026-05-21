import type { Layout, ResumeData, TypographySlotValue } from "@reactive-resume/schema/resume/data";
import type { TemplateMetadata } from "@reactive-resume/schema/template-metadata";

const joinFont = (fontFamily: string): string => `"${fontFamily}"`;

const parseWeight = (w: string | undefined, fallback: number): number => {
	const n = Number.parseInt(w ?? String(fallback), 10);
	return Number.isNaN(n) ? fallback : n;
};

const buildPageRule = (format: string): string => {
	const size = format === "letter" ? "letter" : format === "free-form" ? "auto" : "A4";
	return `  @page {\n    size: ${size};\n    margin: 0;\n  }`;
};

const buildFontFaceBlock = (metadata: TemplateMetadata, templateId: string, baseUrl: string): string => {
	const declarations: string[] = [];
	for (const font of metadata.fonts) {
		if (font.source === "google") continue;
		for (const [weight, path] of Object.entries(font.files ?? {})) {
			declarations.push(
				`@font-face {\n  font-family: ${JSON.stringify(font.family)};\n  font-weight: ${weight};\n  src: url(${JSON.stringify(`${baseUrl}/api/templates/${templateId}/fonts/${path}`)}) format("woff2");\n}`,
			);
		}
	}
	if (declarations.length === 0) return "";
	return `<style id="resume-fonts">\n${declarations.join("\n")}\n</style>`;
};

const buildGoogleFontsLink = (metadata: TemplateMetadata): string => {
	const googleFonts = metadata.fonts.filter((f) => f.source === "google");
	if (googleFonts.length === 0) return "";
	const families = googleFonts
		.map((f) => `${f.family.replace(/ /g, "+")}:wght@${f.weights.join(";")}`)
		.join("&family=");
	return `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${families}&display=swap" />`;
};

const slotLine = (id: string, font: string, size: number, weight: number, lineHeight: number): string =>
	`  --resume-font-${id}: ${joinFont(font)};\n  --resume-size-${id}: ${size}pt;\n  --resume-weight-${id}: ${weight};\n  --resume-line-height-${id}: ${lineHeight};`;

const buildTypographySlotVars = (data: ResumeData, tmplMeta: TemplateMetadata): string => {
	const t = data.metadata.typography;
	const bodyWeight = parseWeight(t.body.fontWeights[0], 400);
	const headWeight = parseWeight(t.heading.fontWeights.at(-1), 600);

	const lines: string[] = [
		slotLine("body", t.body.fontFamily, t.body.fontSize, bodyWeight, t.body.lineHeight),
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
	const areas = side === "right" ? '"main sidebar"' : '"sidebar main"';
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

	const fontFaceBlock = buildFontFaceBlock(templateMetadata, templateId, baseUrl);
	const googleFontsLink = buildGoogleFontsLink(templateMetadata);
	const typographyVars = buildTypographySlotVars(data, templateMetadata);
	const sidebarVars = buildSidebarVars(templateMetadata, data);
	const pageRule = buildPageRule(page.format);

	const cssVarsBlock = `<style id="resume-css-vars">
${pageRule}

  :root {
  --resume-primary: ${design.colors.primary};
  --resume-foreground: ${design.colors.text};
  --resume-background: ${design.colors.background};
  --resume-page-padding-x: ${page.marginX}pt;
  --resume-page-padding-y: ${page.marginY}pt;
  --resume-sidebar-width: ${sidebarWidth}%;
${sidebarVars ? `${sidebarVars}\n` : ""}  --resume-section-gap: ${page.gapY}pt;
  --resume-column-gap: ${page.gapX}pt;
${typographyVars}
}
</style>`;

	return [googleFontsLink, fontFaceBlock, cssVarsBlock].filter(Boolean).join("\n");
};
