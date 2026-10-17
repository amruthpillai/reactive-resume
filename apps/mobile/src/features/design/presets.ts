// Port of apps/web/src/features/resume/editor/design/presets.ts and the Advanced option lists. Pure: no React.
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { DateFormat } from "@reactive-resume/schema/resume/dates";
import type { Template } from "@reactive-resume/schema/templates";
import type { WritableDraft } from "immer";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { templateLayouts, templateSchema } from "@reactive-resume/schema/templates";
import { contrastOnWhite } from "@reactive-resume/utils/color";

type Metadata = ResumeData["metadata"];

/** Five traditional resume faces. Families that aren't a pairing leave the control with no selection. */
export const FONT_PAIRINGS = [
	{ id: "classic", label: "Classic", heading: "EB Garamond", body: "EB Garamond", headingWeight: "600" },
	{ id: "traditional", label: "Traditional", heading: "Tinos", body: "Tinos", headingWeight: "700" },
	{ id: "balanced", label: "Balanced", heading: "Source Serif 4", body: "Source Sans 3", headingWeight: "600" },
	{ id: "professional", label: "Professional", heading: "Carlito", body: "Carlito", headingWeight: "700" },
	{ id: "clean", label: "Clean", heading: "Lato", body: "Lato", headingWeight: "700" },
] as const;

export type FontPairingId = (typeof FONT_PAIRINGS)[number]["id"];

export function matchFontPairing(metadata: Pick<Metadata, "typography">): FontPairingId | null {
	const { heading, body } = metadata.typography;
	return (
		FONT_PAIRINGS.find((pairing) => pairing.heading === heading.fontFamily && pairing.body === body.fontFamily)?.id ??
		null
	);
}

export function applyFontPairing(metadata: WritableDraft<Metadata>, id: FontPairingId) {
	const pairing = FONT_PAIRINGS.find((candidate) => candidate.id === id);
	if (!pairing) return;
	metadata.typography.heading.fontFamily = pairing.heading;
	metadata.typography.heading.fontWeights = [pairing.headingWeight];
	metadata.typography.body.fontFamily = pairing.body;
	metadata.typography.body.fontWeights = ["400", "700"];
}

/** Density sets the body line height and the gap between entries. Same values as web and the page's Fit. */
const DENSITIES = {
	compact: { lineHeight: 1.35, gapY: 4 },
	normal: { lineHeight: 1.5, gapY: 6 },
	roomy: { lineHeight: 1.65, gapY: 8 },
} as const;

export type DensityId = keyof typeof DENSITIES;

export function matchDensity(metadata: Metadata): DensityId | null {
	const { lineHeight } = metadata.typography.body;
	const { gapY } = metadata.page;
	const match = Object.entries(DENSITIES).find(([, value]) => value.lineHeight === lineHeight && value.gapY === gapY);
	return (match?.[0] as DensityId | undefined) ?? null;
}

export function applyDensity(metadata: WritableDraft<Metadata>, id: DensityId) {
	metadata.typography.body.lineHeight = DENSITIES[id].lineHeight;
	metadata.page.gapY = DENSITIES[id].gapY;
}

const MARGINS = {
	narrow: { marginX: 10, marginY: 8 },
	normal: { marginX: 14, marginY: 12 },
	wide: { marginX: 19, marginY: 16 },
} as const;

export type MarginId = keyof typeof MARGINS;

export function matchMargins(metadata: Metadata): MarginId | null {
	const { marginX, marginY } = metadata.page;
	const match = Object.entries(MARGINS).find(([, value]) => value.marginX === marginX && value.marginY === marginY);
	return (match?.[0] as MarginId | undefined) ?? null;
}

export function applyMargins(metadata: WritableDraft<Metadata>, id: MarginId) {
	metadata.page.marginX = MARGINS[id].marginX;
	metadata.page.marginY = MARGINS[id].marginY;
}

export const TEXT_SIZE = { min: 9, max: 12.5, step: 0.5 } as const;

/** Sets the body size and scales the heading with it, keeping their ratio. */
export function applyTextSize(metadata: WritableDraft<Metadata>, size: number) {
	const { body, heading } = metadata.typography;
	const ratio = body.fontSize > 0 ? heading.fontSize / body.fontSize : 1.4;
	body.fontSize = size;
	heading.fontSize = Math.round(size * ratio * 2) / 2;
}

/** Eight accents, all readable on white. Hex values are resume colours, not app tokens. */
export const ACCENTS = [
	{ label: "Moss", hex: "#3E6B4F" },
	{ label: "Ink blue", hex: "#2F5A8A" },
	{ label: "Teal", hex: "#1F6E73" },
	{ label: "Plum", hex: "#6B3E6E" },
	{ label: "Rust", hex: "#A0442A" },
	{ label: "Burgundy", hex: "#8A2C3F" },
	{ label: "Ochre", hex: "#7A5A12" },
	{ label: "Graphite", hex: "#3B3F45" },
] as const;

/** Advanced → Design quick colours (web `quickColorOptions`, Tailwind 600s). */
export const QUICK_COLORS = [
	"rgba(231, 0, 11, 1)",
	"rgba(245, 73, 0, 1)",
	"rgba(225, 113, 0, 1)",
	"rgba(208, 135, 0, 1)",
	"rgba(94, 165, 0, 1)",
	"rgba(0, 166, 62, 1)",
	"rgba(0, 153, 102, 1)",
	"rgba(0, 150, 137, 1)",
	"rgba(0, 146, 184, 1)",
	"rgba(0, 132, 209, 1)",
	"rgba(21, 93, 252, 1)",
	"rgba(79, 57, 246, 1)",
	"rgba(127, 34, 254, 1)",
	"rgba(152, 16, 250, 1)",
	"rgba(200, 0, 222, 1)",
	"rgba(230, 0, 118, 1)",
	"rgba(236, 0, 63, 1)",
	"rgba(69, 85, 108, 1)",
	"rgba(74, 85, 101, 1)",
	"rgba(82, 82, 92, 1)",
	"rgba(82, 82, 82, 1)",
	"rgba(87, 83, 77, 1)",
] as const;

const HEX = /^#?([0-9a-f]{6})$/i;

export const hexToRgba = (hex: string) => {
	const value = Number.parseInt(HEX.exec(hex.trim())?.[1] ?? "000000", 16);
	return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, 1)`;
};

/** The hex of an `rgba(r, g, b, a)` colour (alpha ignored), or null if it isn't one. */
export function rgbaToHex(color: string): string | null {
	const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(color);
	if (!match) return HEX.test(color) ? `#${HEX.exec(color)?.[1]?.toUpperCase()}` : null;
	return `#${match
		.slice(1, 4)
		.map((channel) => Number(channel).toString(16).padStart(2, "0"))
		.join("")
		.toUpperCase()}`;
}

export const isValidHex = (hex: string) => HEX.test(hex.trim());

/** Normalises typed colour text: `#RRGGBB`/`RRGGBB` becomes rgba; `rgb(a)(…)` passes through; anything else is null. */
export function parseColorInput(text: string): string | null {
	const value = text.trim();
	if (isValidHex(value)) return hexToRgba(value);
	return /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i.test(value) ? value : null;
}

export { contrastOnWhite };

/** Below this the Color group warns (WCAG AA for normal text). */
export const MIN_CONTRAST = 4.5;

/** The same hue, darkened step by step until it reads on white (at least 4.6:1). */
export function darkenForWhite(hex: string): string {
	const value = Number.parseInt(HEX.exec(hex)?.[1] ?? "000000", 16);
	let channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
	for (let step = 0; step < 40; step++) {
		const candidate =
			`#${channels.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
		if (contrastOnWhite(candidate) >= 4.6) return candidate;
		channels = channels.map((channel) => channel * 0.93);
	}
	return "#333333";
}

/** Example labels are dates, not words, so they need no translation. */
export const DATE_FORMATS: { value: DateFormat; label: string }[] = [
	{ value: "short", label: "Mar 2022" },
	{ value: "long", label: "March 2022" },
	{ value: "numeric", label: "03/2022" },
	{ value: "iso", label: "2022-03" },
];

/**
 * Reset design defaults: typography, design, sidebar width and the look's page values. Paper, language, date
 * format, section placement and custom CSS are the user's, not the look's; they stay.
 */
export function resetDesign(metadata: WritableDraft<Metadata>) {
	const defaults = defaultResumeData.metadata;
	metadata.typography = structuredClone(defaults.typography);
	metadata.design = structuredClone(defaults.design);
	metadata.layout.sidebarWidth = defaults.layout.sidebarWidth;
	const { gapX, gapY, marginX, marginY, hideIcons, hideLinkUnderline, hideSectionIcons } = defaults.page;
	Object.assign(metadata.page, { gapX, gapY, marginX, marginY, hideIcons, hideLinkUnderline, hideSectionIcons });
}

export type TemplateFilter = "all" | "one" | "two" | "ats";

export const TEMPLATES: readonly Template[] = templateSchema.options;

export const templateName = (id: Template) => id.charAt(0).toUpperCase() + id.slice(1);

export function matchesFilter(id: Template, filter: TemplateFilter) {
	const layout = templateLayouts[id];
	if (filter === "one") return layout.columns === 1;
	if (filter === "two") return layout.columns === 2;
	if (filter === "ats") return layout.atsSafe;
	return true;
}
