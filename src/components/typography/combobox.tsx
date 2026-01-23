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

export function getNextWeight(fontFamily: string): Weight | null {
	const fontData = webFontMap.get(fontFamily);
	if (!fontData || !Array.isArray(fontData.weights) || fontData.weights.length === 0) return null;
	if (fontData.weights.includes("400")) return "400";
	return fontData.weights[0] as Weight;
}

type FontFamilyComboboxProps = Omit<ComboboxProps, "options">;

export function FontFamilyCombobox({ className, ...props }: FontFamilyComboboxProps) {
	const options = useMemo(() => {
		return [...localFontList, ...webFontList].map((font: LocalFont | WebFont) => ({
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
		const fontData = webFontMap.get(fontFamily);

		let weights: string[] = [];

		if (!fontData || !Array.isArray(fontData.weights)) {
			// Provide all possible options for local fonts or unknown fontFamily
			weights = ["100", "200", "300", "400", "500", "600", "700", "800", "900"];
		} else {
			weights = fontData.weights as string[];
		}

		return weights.map((variant: string) => ({
			value: variant,
			label: variant,
			keywords: [variant],
		}));
	}, [fontFamily]);

	return <MultipleCombobox options={options} {...props} />;
}
