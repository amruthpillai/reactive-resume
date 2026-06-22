import { useEffect, useState } from "react";
import { webFontMap } from "@reactive-resume/fonts";

// Load the resume's real fonts into the page so the editor canvas renders with
// the same typography as the PDF (e.g. a serif body instead of a sans fallback).
// Standard/system fonts aren't in the web font map — the browser resolves those.

const loaded = new Set<string>();

async function loadFamily(family: string, weights: string[]): Promise<void> {
	const font = webFontMap.get(family);
	if (!font) return;

	await Promise.all(
		weights.map(async (weight) => {
			const key = `${family}:${weight}`;
			if (loaded.has(key)) return;
			const url = font.files[weight as keyof typeof font.files] ?? font.files["400"] ?? font.preview;
			if (!url) return;
			try {
				const face = new FontFace(family, `url(${url})`, { weight, display: "swap" });
				const loadedFace = await face.load();
				document.fonts.add(loadedFace);
				loaded.add(key);
			} catch {
				// Ignore individual weight failures; the canvas falls back gracefully.
			}
		}),
	);
}

export function useCanvasFonts(bodyFamily: string, headingFamily: string): void {
	const [, forceRerender] = useState(0);

	useEffect(() => {
		let cancelled = false;
		void Promise.all([
			loadFamily(bodyFamily, ["400", "600", "700"]),
			loadFamily(headingFamily, ["400", "500", "600", "700"]),
		]).then(() => {
			if (!cancelled) forceRerender((tick) => tick + 1);
		});
		return () => {
			cancelled = true;
		};
	}, [bodyFamily, headingFamily]);
}
