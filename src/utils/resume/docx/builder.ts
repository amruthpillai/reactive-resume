import {
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

import type { ResumeData, SectionType } from "@/schema/resume/data";

import { parseColorString } from "@/utils/color";

import { renderBuiltInSection, renderCustomSection, renderSummary, setRenderConfig } from "./section-renderers";

// --- Color helpers ---

function rgbToHex(r: number, g: number, b: number): string {
  return [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function getColorHex(rgba: string, fallback: string): string {
  const parsed = parseColorString(rgba);
  if (!parsed) return fallback;
  return rgbToHex(parsed.r, parsed.g, parsed.b);
}

// --- Unit conversion helpers ---

/** Convert pt font size to docx half-points (docx uses half-pt units). */
function ptToHalfPt(pt: number): number {
  return Math.round(pt * 2);
}

/** Convert pt spacing to twips (1pt = 20 twips). */
function ptToTwips(pt: number): number {
  return Math.round(pt * 20);
}

// --- Page size constants (in mm) ---

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

// --- Invisible border preset for table cells ---

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
} as const;

// --- Template layout config ---

interface TemplateConfig {
  /** Which side the sidebar appears on */
  sidebarSide: "left" | "right";
  /** Sidebar background: "solid" = full primary color, "tint" = 20% opacity, "none" = no background */
  sidebarBackground: "solid" | "tint" | "none";
  /** Where the header is rendered */
  headerPosition: "full-width" | "main-only" | "sidebar-only";
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  azurill: { sidebarSide: "left", sidebarBackground: "none", headerPosition: "full-width" },
  bronzor: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
  chikorita: { sidebarSide: "right", sidebarBackground: "solid", headerPosition: "main-only" },
  ditgar: { sidebarSide: "left", sidebarBackground: "tint", headerPosition: "sidebar-only" },
  ditto: { sidebarSide: "left", sidebarBackground: "none", headerPosition: "full-width" },
  gengar: { sidebarSide: "left", sidebarBackground: "tint", headerPosition: "sidebar-only" },
  glalie: { sidebarSide: "left", sidebarBackground: "tint", headerPosition: "sidebar-only" },
  kakuna: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
  lapras: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
  leafish: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
  onyx: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
  pikachu: { sidebarSide: "left", sidebarBackground: "none", headerPosition: "main-only" },
  rhyhorn: { sidebarSide: "right", sidebarBackground: "none", headerPosition: "full-width" },
};

const DEFAULT_TEMPLATE_CONFIG: TemplateConfig = {
  sidebarSide: "left",
  sidebarBackground: "none",
  headerPosition: "full-width",
};

/**
 * Blends a hex color toward white at the given opacity (0-1).
 * Used to approximate CSS `background-color: rgba(r,g,b, 0.2)` on a white background.
 */
function blendWithWhite(hex: string, opacity: number): string {
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const blend = (c: number) => Math.round(c * opacity + 255 * (1 - opacity));
  return [blend(r), blend(g), blend(b)].map((c) => c.toString(16).padStart(2, "0")).join("");
}

// --- Section rendering dispatch ---

const BUILT_IN_SECTIONS = new Set<string>([
  "profiles",
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "interests",
  "awards",
  "certifications",
  "publications",
  "volunteer",
  "references",
]);

function renderSection(sectionId: string, data: ResumeData, colorHex: string): Paragraph[] {
  if (sectionId === "summary") {
    return renderSummary(data.summary, colorHex);
  }

  if (BUILT_IN_SECTIONS.has(sectionId)) {
    const section = data.sections[sectionId as SectionType];
    if (section) {
      return renderBuiltInSection(sectionId as SectionType, section, colorHex);
    }
    return [];
  }

  const customSection = data.customSections.find((cs) => cs.id === sectionId);
  if (customSection) {
    return renderCustomSection(customSection, colorHex);
  }

  return [];
}

// --- Header ---

function buildHeader(data: ResumeData, colorHex: string, textColorHex: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const { basics } = data;
  const headingFont = data.metadata.typography.heading.fontFamily || "Calibri";
  const bodyFont = data.metadata.typography.body.fontFamily || "Calibri";
  // h2 = calc(var(--page-heading-font-size) * 1.25pt)
  const nameSize = ptToHalfPt(data.metadata.typography.heading.fontSize * 1.25);
  const bodySize = ptToHalfPt(data.metadata.typography.body.fontSize);

  if (basics.name) {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: basics.name,
            bold: true,
            size: nameSize,
            font: headingFont,
            color: colorHex,
          }),
        ],
      }),
    );
  }

  if (basics.headline) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: basics.headline,
            italics: true,
            size: bodySize,
            font: bodyFont,
            color: textColorHex,
          }),
        ],
      }),
    );
  }

  const contactParts: (TextRun | ExternalHyperlink)[] = [];
  const addSeparator = () => {
    if (contactParts.length > 0) {
      contactParts.push(new TextRun({ text: "  |  ", color: "999999", size: bodySize, font: bodyFont }));
    }
  };

  if (basics.email) {
    addSeparator();
    contactParts.push(
      new ExternalHyperlink({
        link: `mailto:${basics.email}`,
        children: [new TextRun({ text: basics.email, color: colorHex, underline: {}, size: bodySize, font: bodyFont })],
      }),
    );
  }

  if (basics.phone) {
    addSeparator();
    contactParts.push(new TextRun({ text: basics.phone, size: bodySize, font: bodyFont, color: textColorHex }));
  }

  if (basics.location) {
    addSeparator();
    contactParts.push(new TextRun({ text: basics.location, size: bodySize, font: bodyFont, color: textColorHex }));
  }

  if (basics.website.url) {
    addSeparator();
    contactParts.push(
      new ExternalHyperlink({
        link: basics.website.url,
        children: [
          new TextRun({
            text: basics.website.label || basics.website.url,
            color: colorHex,
            underline: {},
            size: bodySize,
            font: bodyFont,
          }),
        ],
      }),
    );
  }

  for (const field of basics.customFields) {
    if (!field.text) continue;
    addSeparator();
    if (field.link) {
      contactParts.push(
        new ExternalHyperlink({
          link: field.link,
          children: [
            new TextRun({
              text: field.text,
              color: colorHex,
              underline: {},
              size: bodySize,
              font: bodyFont,
            }),
          ],
        }),
      );
    } else {
      contactParts.push(new TextRun({ text: field.text, size: bodySize, font: bodyFont, color: textColorHex }));
    }
  }

  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        spacing: { after: 200 },
        children: contactParts,
      }),
    );
  }

  return paragraphs;
}

// --- Two-column table layout ---

function buildTwoColumnTable(
  mainParagraphs: Paragraph[],
  sidebarParagraphs: Paragraph[],
  sidebarWidthPct: number,
  gapXTwips: number,
  sidebarSide: "left" | "right",
  sidebarShadingHex?: string,
): Table {
  const mainWidthPct = 100 - sidebarWidthPct;

  // DOCX table cells require at least one child
  const mainChildren = mainParagraphs.length > 0 ? mainParagraphs : [new Paragraph({})];
  const sidebarChildren = sidebarParagraphs.length > 0 ? sidebarParagraphs : [new Paragraph({})];

  const sidebarShading = sidebarShadingHex
    ? { fill: sidebarShadingHex, type: ShadingType.CLEAR, color: "auto" }
    : undefined;

  const sidebarCell = new TableCell({
    width: { size: sidebarWidthPct, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    margins: sidebarSide === "left" ? { right: gapXTwips } : { left: gapXTwips },
    children: sidebarChildren,
    ...(sidebarShading ? { shading: sidebarShading } : {}),
  });

  const mainCell = new TableCell({
    width: { size: mainWidthPct, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    margins: sidebarSide === "left" ? { left: gapXTwips } : { right: gapXTwips },
    children: mainChildren,
  });

  const cells = sidebarSide === "left" ? [sidebarCell, mainCell] : [mainCell, sidebarCell];

  return new Table({
    rows: [new TableRow({ children: cells })],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
  });
}

/**
 * Builds a complete docx Document from resume data.
 *
 * Mirrors the resume builder's visual layout:
 * - Header with name, headline, and contact info (centered, full-width)
 * - Two-column table layout (main + sidebar) matching `metadata.layout`
 * - Typography (font family, size, line height) from `metadata.typography`
 * - Page margins and format (A4/Letter) from `metadata.page`
 * - Primary, text, and background colors from `metadata.design.colors`
 */
export function buildDocument(data: ResumeData): Document {
  const colorHex = getColorHex(data.metadata.design.colors.primary, "DC2626");
  const textColorHex = getColorHex(data.metadata.design.colors.text, "000000");
  const bgColorHex = getColorHex(data.metadata.design.colors.background, "FFFFFF");

  const bodyFont = data.metadata.typography.body.fontFamily || "Calibri";
  const bodySize = ptToHalfPt(data.metadata.typography.body.fontSize);
  const lineSpacing = Math.round(data.metadata.typography.body.lineHeight * 240);

  const { page } = data.metadata;
  const pageSize = PAGE_SIZES[page.format] ?? PAGE_SIZES.a4;
  // Margins and gaps are defined in points (pt), not mm
  const marginXTwips = ptToTwips(page.marginX);
  const marginYTwips = ptToTwips(page.marginY);
  const gapXTwips = ptToTwips(page.gapX);

  const sidebarWidth = data.metadata.layout.sidebarWidth;

  // Template-aware layout config
  const templateConfig = TEMPLATE_CONFIGS[data.metadata.template] ?? DEFAULT_TEMPLATE_CONFIG;

  // Compute sidebar background shading hex
  let sidebarShadingHex: string | undefined;
  if (templateConfig.sidebarBackground === "solid") {
    sidebarShadingHex = colorHex;
  } else if (templateConfig.sidebarBackground === "tint") {
    sidebarShadingHex = blendWithWhite(colorHex, 0.2);
  }

  // Determine sidebar text colors — inverted when sidebar has a solid background
  const sidebarTextColorHex = templateConfig.sidebarBackground === "solid" ? bgColorHex : textColorHex;
  const sidebarHeadingColorHex = templateConfig.sidebarBackground === "solid" ? bgColorHex : colorHex;

  // Configure heading typography for section renderers
  const headingFont = data.metadata.typography.heading.fontFamily || "Calibri";
  const headingSize = ptToHalfPt(data.metadata.typography.heading.fontSize);

  const documentChildren: (Paragraph | Table)[] = [];

  // Header placement depends on template
  if (templateConfig.headerPosition === "full-width") {
    // Configure colors for main content
    setRenderConfig({
      headingFont,
      headingSizeHalfPt: headingSize,
      bodyFont,
      bodySizeHalfPt: bodySize,
      textColorHex,
      primaryColorHex: colorHex,
    });
    documentChildren.push(...buildHeader(data, colorHex, textColorHex));
  }

  // Process each page in the layout
  for (const layoutPage of data.metadata.layout.pages) {
    const isFullWidth = layoutPage.fullWidth || layoutPage.sidebar.length === 0;

    if (isFullWidth) {
      setRenderConfig({
        headingFont,
        headingSizeHalfPt: headingSize,
        bodyFont,
        bodySizeHalfPt: bodySize,
        textColorHex,
        primaryColorHex: colorHex,
      });
      for (const sectionId of [...layoutPage.main, ...layoutPage.sidebar]) {
        documentChildren.push(...renderSection(sectionId, data, colorHex));
      }
    } else {
      // Render main sections with normal colors
      setRenderConfig({
        headingFont,
        headingSizeHalfPt: headingSize,
        bodyFont,
        bodySizeHalfPt: bodySize,
        textColorHex,
        primaryColorHex: colorHex,
      });

      const mainParagraphs: Paragraph[] = [];
      if (templateConfig.headerPosition === "main-only") {
        mainParagraphs.push(...buildHeader(data, colorHex, textColorHex));
      }
      for (const sectionId of layoutPage.main) {
        mainParagraphs.push(...renderSection(sectionId, data, colorHex));
      }

      // Render sidebar sections with potentially inverted colors
      setRenderConfig({
        headingFont,
        headingSizeHalfPt: headingSize,
        bodyFont,
        bodySizeHalfPt: bodySize,
        textColorHex: sidebarTextColorHex,
        primaryColorHex: sidebarHeadingColorHex,
      });

      const sidebarParagraphs: Paragraph[] = [];
      if (templateConfig.headerPosition === "sidebar-only") {
        sidebarParagraphs.push(...buildHeader(data, sidebarHeadingColorHex, sidebarTextColorHex));
      }
      for (const sectionId of layoutPage.sidebar) {
        sidebarParagraphs.push(...renderSection(sectionId, data, sidebarHeadingColorHex));
      }

      if (mainParagraphs.length > 0 || sidebarParagraphs.length > 0) {
        documentChildren.push(
          buildTwoColumnTable(
            mainParagraphs,
            sidebarParagraphs,
            sidebarWidth,
            gapXTwips,
            templateConfig.sidebarSide,
            sidebarShadingHex,
          ),
        );
      }
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: bodyFont,
            size: bodySize,
            color: textColorHex,
          },
          paragraph: {
            spacing: { line: lineSpacing },
          },
        },
      },
    },
    background: bgColorHex !== "FFFFFF" ? { color: bgColorHex } : undefined,
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(pageSize.width),
              height: convertMillimetersToTwip(pageSize.height),
            },
            margin: {
              top: marginYTwips,
              bottom: marginYTwips,
              left: marginXTwips,
              right: marginXTwips,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });
}
