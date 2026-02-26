import { useMemo } from "react";
import { cn } from "@/utils/style";
import { Combobox, type ComboboxProps } from "../ui/combobox";
import { MultipleCombobox, type MultipleComboboxProps } from "../ui/multiple-combobox";
import { FontDisplay } from "./font-display";
import type { LocalFont, WebFont } from "./types";
import webFontListJSON from "./webfontlist.json";

type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

const localFontList = [
	{ type: "local", category: "sans-serif", family: "Arial", weights: ["400", "600", "700"] },
	{ type: "local", category: "sans-serif", family: "Calibri", weights: ["400", "600", "700"] },
	{ type: "local", category: "sans-serif", family: "Helvetica", weights: ["400", "600", "700"] },
	{ type: "local", category: "sans-serif", family: "Tahoma", weights: ["400", "600", "700"] },
	{ type: "local", category: "sans-serif", family: "Trebuchet MS", weights: ["400", "600", "700"] },
	{ type: "local", category: "sans-serif", family: "Verdana", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Bookman", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Cambria", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Garamond", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Georgia", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Palatino", weights: ["400", "600", "700"] },
	{ type: "local", category: "serif", family: "Times New Roman", weights: ["400", "600", "700"] },
] as LocalFont[];

const webFontList = webFontListJSON as WebFont[];

function buildWebFontMap() {
	const webFontMap = new Map<string, WebFont>();

	for (const font of webFontList) {
		webFontMap.set(font.family, font);
	}

	return webFontMap;
}

const webFontMap: Map<string, WebFont> = buildWebFontMap();

export function getNextWeights(fontFamily: string): Weight[] | null {
	const fontData = webFontMap.get(fontFamily);
	if (!fontData || !Array.isArray(fontData.weights) || fontData.weights.length === 0) return null;

	const uniqueWeights = Array.from(new Set(fontData.weights)) as Weight[];

	// Try to pick 400 and 600 if available
	const weights: Weight[] = [];

	if (uniqueWeights.includes("400")) weights.push("400");
	if (uniqueWeights.includes("600")) weights.push("600");

	// If we didn't find both, fill in with first/last, ensuring uniqueness
	while (weights.length < 2 && uniqueWeights.length > 0) {
		// candidateIndex: 0 (first), 1 (last)
		const lastIndex = uniqueWeights.length - 1;
		const candidate = weights.length === 0 ? uniqueWeights[0] : uniqueWeights[lastIndex];
		if (!weights.includes(candidate)) weights.push(candidate);
		else break;
	}

	return weights.length > 0 ? weights : null;
}

type FontFamilyComboboxProps = Omit<ComboboxProps, "options">;

export function FontFamilyCombobox({ className, ...props }: FontFamilyComboboxProps) {
	const options = useMemo(() => {
		return [...webFontList, ...localFontList].map((font: LocalFont | WebFont) => ({
			value: font.family,
			keywords: [font.family],
			label: <FontDisplay name={font.family} type={font.type} url={"preview" in font ? font.preview : undefined} />,
		}));
	}, []);

	return <Combobox options={options} className={cn("w-full", className)} {...props} />;
}

type FontWeightComboboxProps = Omit<MultipleComboboxProps, "options"> & { fontFamily: string };

export function FontWeightCombobox({ fontFamily, ...props }: FontWeightComboboxProps) {
	const options = useMemo(() => {
		const webFontData = webFontMap.get(fontFamily);
		const localFontData = localFontList.find((font) => font.family === fontFamily);

		let weights: string[] = [];

		if (webFontData && Array.isArray(webFontData.weights) && webFontData.weights.length > 0) {
			weights = webFontData.weights as string[];
		} else if (localFontData && Array.isArray(localFontData.weights) && localFontData.weights.length > 0) {
			weights = localFontData.weights as string[];
		} else {
			// Fallback to all possible weights
			weights = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
		}

		return weights.map((variant: string) => ({
			value: variant,
			label: variant,
			keywords: [variant],
		}));
	}, [fontFamily]);

	return <MultipleCombobox options={options} {...props} />;
}
