// The design presets a letter shares with the resume, ported from apps/web/src/features/resume/editor/design/presets.ts.
// ponytail: M4-T1 ports the same table for resume Design in parallel; keep one copy once both have merged.
import type { LetterDocument } from "@/draft/types";
import type { I18n } from "@lingui/core";
import type { Template } from "@reactive-resume/schema/templates";
import type { WritableDraft } from "immer";
import { msg } from "@lingui/core/macro";

type Metadata = LetterDocument["style"]["metadata"];

/** Five traditional resume faces. Families that aren't a pairing leave the control with no selection. */
export const FONT_PAIRINGS = [
	{ id: "classic", label: msg`Classic`, heading: "EB Garamond", body: "EB Garamond", headingWeight: "600" },
	{ id: "traditional", label: msg`Traditional`, heading: "Tinos", body: "Tinos", headingWeight: "700" },
	{ id: "balanced", label: msg`Balanced`, heading: "Source Serif 4", body: "Source Sans 3", headingWeight: "600" },
	{ id: "professional", label: msg`Professional`, heading: "Carlito", body: "Carlito", headingWeight: "700" },
	{ id: "clean", label: msg`Clean`, heading: "Lato", body: "Lato", headingWeight: "700" },
] as const;

export type FontPairingId = (typeof FONT_PAIRINGS)[number]["id"];

export const matchFontPairing = ({ typography }: Metadata) =>
	FONT_PAIRINGS.find(
		(pairing) => pairing.heading === typography.heading.fontFamily && pairing.body === typography.body.fontFamily,
	) ?? null;

export function applyFontPairing(metadata: WritableDraft<Metadata>, id: FontPairingId) {
	const pairing = FONT_PAIRINGS.find((candidate) => candidate.id === id);
	if (!pairing) return;
	metadata.typography.heading.fontFamily = pairing.heading;
	metadata.typography.heading.fontWeights = [pairing.headingWeight];
	metadata.typography.body.fontFamily = pairing.body;
	metadata.typography.body.fontWeights = ["400", "700"];
}

export const TEXT_SIZE = { min: 9, max: 12.5, step: 0.5 } as const;

/** Page margins in points. "Normal" is the default. */
export const MARGINS = {
	narrow: { marginX: 10, marginY: 8 },
	normal: { marginX: 14, marginY: 12 },
	wide: { marginX: 19, marginY: 16 },
} as const;

export type MarginId = keyof typeof MARGINS;

export const matchMargins = ({ page }: Metadata) =>
	(Object.keys(MARGINS) as MarginId[]).find(
		(id) => MARGINS[id].marginX === page.marginX && MARGINS[id].marginY === page.marginY,
	) ?? null;

/** Eight accents, all readable on white. Document colours, not app colours, so not tokens. */
export const ACCENTS = [
	{ label: msg`Moss`, hex: "#3E6B4F" },
	{ label: msg`Ink blue`, hex: "#2F5A8A" },
	{ label: msg`Teal`, hex: "#1F6E73" },
	{ label: msg`Plum`, hex: "#6B3E6E" },
	{ label: msg`Rust`, hex: "#A0442A" },
	{ label: msg`Burgundy`, hex: "#8A2C3F" },
	{ label: msg`Ochre`, hex: "#7A5A12" },
	{ label: msg`Graphite`, hex: "#3B3F45" },
] as const;

const HEX = /^#?([0-9a-f]{6})$/i;

export const isValidHex = (hex: string) => HEX.test(hex.trim());

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

/** "onyx" → "Onyx": web's template names are the ids, capitalised. */
export const templateName = (id: Template) => id.charAt(0).toUpperCase() + id.slice(1);

/** "Onyx, Balanced type, Moss" for the Write pane's design note; `typeLabel` words the pairing ("Balanced type"). */
export function designSummary(metadata: Metadata, i18n: I18n, typeLabel: (pairing: string) => string) {
	const pairing = matchFontPairing(metadata)?.label;
	const accent = ACCENTS.find((option) => option.hex === rgbaToHex(metadata.design.colors.primary))?.label;
	return [templateName(metadata.template), pairing && typeLabel(i18n._(pairing)), accent && i18n._(accent)]
		.filter(Boolean)
		.join(", ");
}
