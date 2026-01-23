/**
 * This script is responsible for generating a JSON file containing the fonts served by Google Fonts.
 * The JSON file will be used to populate the typography options in the resume builder.
 *
 * Information about the Google Fonts Developer API can be found here: https://developers.google.com/fonts/docs/developer_api
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

function variantToWeight(variant: Variant): Weight | null {
	if (["100", "200", "300", "500", "600", "700", "800", "900"].includes(variant)) return variant as Weight;
	if (variant === "regular") return "400";
	return null;
}

export async function generateFonts() {
	const response = await getGoogleFontsJSON();
	console.log(`Found ${response.items.length} fonts in total.`);

	const filteredItems = response.items.filter(
		(item) => !skippedFamilies.some((family) => item.family.includes(family)),
	);

	const result: WebFont[] = filteredItems.slice(0, argLimit).map((item) => {
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

	const jsonString = argCompress ? JSON.stringify(result) : JSON.stringify(result, null, 2);
	await mkdir(FONTS_DIR, { recursive: true });
	await writeFile(WEBFONTLIST_FILE, jsonString, "utf-8");

	console.log(`Generated ${result.length} fonts in the list.`);
}

if (import.meta.main) {
	await generateFonts();
}
