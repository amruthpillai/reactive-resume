/**
 * This script generates a JSON file containing the fonts served by Google Fonts,
 * and also injects the Computer Modern font families as served by https://github.com/bitmaks/cm-web-fonts
 * to ensure they appear in the application's typography options.
 *
 * See:
 * - Google Fonts API: https://developers.google.com/fonts/docs/developer_api
 * - Computer Modern Web Fonts: https://github.com/bitmaks/cm-web-fonts
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import type { APIResponse, Variant, WebFont, Weight } from "./types";

const args = process.argv.slice(2);
const argForce = args.includes("--force");
const argCompress = args.includes("--compress");
const argLimit = args.includes("--limit") ? parseInt(args[args.indexOf("--limit") + 1], 10) : 500;

const skippedFamilies = ["Material Icons", "Material Symbols", "Noto Color Emoji"];

const FONTS_DIR = "./scripts/fonts";
const RESPONSE_FILE = `${FONTS_DIR}/response.json`;
const WEBFONTLIST_FILE = `${FONTS_DIR}/webfontlist.json`;

/** Returns JSON from Google Fonts API or (unless --force) from local cache if it exists */
async function getGoogleFontsJSON() {
	let contents: string | null = null;

	try {
		contents = await readFile(RESPONSE_FILE, "utf-8");
	} catch {
		// If the file doesn't exist or there's an error reading, just continue.
	}

	if (!argForce && contents) return JSON.parse(contents) as APIResponse;

	const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
	if (!apiKey) throw new Error("GOOGLE_CLOUD_API_KEY is not set");

	const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`;
	const response = await fetch(url);
	const data = (await response.json()) as APIResponse;

	const jsonString = argCompress ? JSON.stringify(data) : JSON.stringify(data, null, 2);
	await mkdir(FONTS_DIR, { recursive: true });
	await writeFile(RESPONSE_FILE, jsonString, "utf-8");

	return data;
}

/** Map Google Fonts API variant strings to simple weights */
function variantToWeight(variant: Variant): Weight | null {
	if (["100", "200", "300", "500", "600", "700", "800", "900"].includes(variant)) return variant as Weight;
	if (variant === "regular") return "400";
	return null;
}

/**
 * Helper: Get additional Computer Modern webfonts (manually curated from https://github.com/bitmaks/cm-web-fonts)
 * These do NOT come from Google Fonts but should appear in webfontlist.json output.
 * Files are delivered via jsDelivr CDN.
 */
function getComputerModernWebFonts(): WebFont[] {
	const CDN = "https://cdn.jsdelivr.net/gh/bitmaks/cm-web-fonts@latest/font";

	return [
		{
			type: "web",
			category: "display",
			family: "Computer Modern Bright",
			weights: ["400", "700"],
			preview: `${CDN}/Bright/cmunbmr.woff`,
			files: {
				"400": `${CDN}/Bright/cmunbmr.woff`,
				"400italic": `${CDN}/Bright/cmunbmo.woff`,
				"700": `${CDN}/Bright/cmunbbx.woff`,
				"700italic": `${CDN}/Bright/cmunbxo.woff`,
			},
		},
		{
			type: "web",
			category: "serif",
			family: "Computer Modern Concrete",
			weights: ["400", "700"],
			preview: `${CDN}/Concrete/cmunorm.woff`,
			files: {
				"400": `${CDN}/Concrete/cmunorm.woff`,
				"400italic": `${CDN}/Concrete/cmunobi.woff`,
				"700": `${CDN}/Concrete/cmunobx.woff`,
				"700italic": `${CDN}/Concrete/cmunoti.woff`,
			},
		},
		{
			type: "web",
			category: "sans-serif",
			family: "Computer Modern Sans",
			weights: ["400", "700"],
			preview: `${CDN}/Sans/cmunss.woff`,
			files: {
				"400": `${CDN}/Sans/cmunss.woff`,
				"400italic": `${CDN}/Sans/cmunsl.woff`,
				"700": `${CDN}/Sans/cmunsx.woff`,
				"700italic": `${CDN}/Sans/cmunsi.woff`,
			},
		},
		{
			type: "web",
			category: "serif",
			family: "Computer Modern Serif",
			weights: ["400", "700"],
			preview: `${CDN}/Serif/cmunrm.woff`,
			files: {
				"400": `${CDN}/Serif/cmunrm.woff`,
				"400italic": `${CDN}/Serif/cmunti.woff`,
				"700": `${CDN}/Serif/cmunbx.woff`,
				"700italic": `${CDN}/Serif/cmunbi.woff`,
			},
		},
		{
			type: "web",
			category: "monospace",
			family: "Computer Modern Typewriter",
			weights: ["400", "700"],
			preview: `${CDN}/Typewriter/cmuntt.woff`,
			files: {
				"400": `${CDN}/Typewriter/cmuntt.woff`,
				"400italic": `${CDN}/Typewriter/cmunit.woff`,
				"700": `${CDN}/Typewriter/cmuntx.woff`,
				"700italic": `${CDN}/Typewriter/cmuntb.woff`,
			},
		},
	];
}

export async function generateFonts() {
	const response = await getGoogleFontsJSON();
	console.log(`Found ${response.items.length} fonts in total (Google Fonts).`);

	const filteredItems = response.items.filter(
		(item) => !skippedFamilies.some((family) => item.family.includes(family)),
	);

	const googleFontResults: WebFont[] = filteredItems.slice(0, argLimit).map((item) => {
		// 1. weights: Only non-italic, convert "regular" to "400"
		const weights: Weight[] = item.variants.map((v) => variantToWeight(v)).filter((w): w is Weight => !!w);

		// 2. files: all files, but change "regular"->"400", "italic"->"400italic"
		const files: Record<string, string> = {};

		for (const [variant, url] of Object.entries(item.files)) {
			let key = variant;
			if (variant === "regular") key = "400";
			else if (variant === "italic") key = "400italic";
			files[key] = url;
		}

		return {
			type: "web",
			category: item.category,
			family: item.family,
			weights,
			preview: item.menu,
			files,
		} satisfies WebFont;
	});

	// Manually append Computer Modern web fonts
	const computerModernFonts = getComputerModernWebFonts();
	const allWebFonts: WebFont[] = [...computerModernFonts, ...googleFontResults];

	console.log(
		`Added ${computerModernFonts.length} Computer Modern Web Fonts. Total output: ${allWebFonts.length} web fonts.`,
	);

	const jsonString = argCompress ? JSON.stringify(allWebFonts) : JSON.stringify(allWebFonts, null, 2);
	await mkdir(FONTS_DIR, { recursive: true });
	await writeFile(WEBFONTLIST_FILE, jsonString, "utf-8");

	console.log(`Generated ${allWebFonts.length} fonts in the list (including Computer Modern web fonts).`);
}

if (import.meta.main) {
	await generateFonts();
}
