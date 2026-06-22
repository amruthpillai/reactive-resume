import type { CustomTemplateData } from "@reactive-resume/schema/custom-template";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import { sampleResumeData } from "@reactive-resume/schema/resume/sample";
import { rgbaStringToHex } from "@reactive-resume/utils/color";

// The WYSIWYG canvas is filled with a fixed, realistic resume so the user can
// see how their template lays out real content. This is the same fixture the
// built-in templates ship as their preview, so the PDF-preview toggle and the
// DOM canvas render identical content.
export const demoResumeData: ResumeData = sampleResumeData;

// ─── Canvas theme ─────────────────────────────────────────────────────────────
//
// Mirrors `useBaseStyles` in packages/pdf/.../custom/CustomTemplatePage.tsx so
// the DOM approximation matches the real PDF. Custom templates render with a
// GENERIC base style (not the base template's bespoke look): colors come from
// `data.page` overrides falling back to the resume's design colors, and
// typography comes from the resume's typography settings. The canvas is drawn at
// A4 width (595px) where 1px ≈ 1pt, so point sizes map 1:1 to pixels.

export type WysiwygTheme = {
	foreground: string;
	background: string;
	primary: string;
	bodyFontFamily: string;
	bodyFontSize: number;
	bodyLineHeight: number;
	headingFontFamily: string;
	headingFontSize: number;
	headingLineHeight: number;
};

// Exact webfonts are registered for @react-pdf only; in the DOM we fall back to
// generic families. The PDF-preview toggle shows the precise fonts.
const SANS_FALLBACK = `, "Helvetica Neue", ui-sans-serif, system-ui, sans-serif`;

export const withFontFallback = (family: string): string => `"${family}"${SANS_FALLBACK}`;

export function getWysiwygTheme(data: CustomTemplateData): WysiwygTheme {
	const { design, typography } = demoResumeData.metadata;

	return {
		foreground: data.page?.textColor ?? rgbaStringToHex(design.colors.text),
		background: data.page?.backgroundColor ?? rgbaStringToHex(design.colors.background),
		primary: data.page?.primaryColor ?? rgbaStringToHex(design.colors.primary),
		bodyFontFamily: typography.body.fontFamily,
		bodyFontSize: typography.body.fontSize,
		bodyLineHeight: typography.body.lineHeight,
		headingFontFamily: typography.heading.fontFamily,
		headingFontSize: typography.heading.fontSize,
		headingLineHeight: typography.heading.lineHeight,
	};
}

// ─── PDF-preview data ─────────────────────────────────────────────────────────
//
// Build a ResumeData that renders the demo content through the user's custom
// template — exactly how a real resume using this template would render in the
// builder. Inlining `customTemplate` makes ResumeDocument switch to
// CustomTemplatePage (see packages/pdf/src/document.tsx).

export function buildDemoResumeData(data: CustomTemplateData): ResumeData {
	return {
		...demoResumeData,
		metadata: {
			...demoResumeData.metadata,
			template: data.baseTemplate,
			customTemplateId: "preview",
			customTemplate: structuredClone(data),
		},
	};
}
