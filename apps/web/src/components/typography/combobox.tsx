import type { MultiComboboxProps, SingleComboboxProps } from "@/components/ui/combobox";
import { useMemo } from "react";
import { fontList, getFont, getFontDisplayName, getFontSearchKeywords } from "@reactive-resume/fonts";
import { cn } from "@reactive-resume/utils/style";
import { Combobox } from "@/components/ui/combobox";
import { FontDisplay } from "./font-display";

type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

export function getNextWeights(fontFamily: string): Weight[] | null {
	const fontData = getFont(fontFamily);
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

type FontFamilyComboboxProps = Omit<SingleComboboxProps, "options">;

export function FontFamilyCombobox({ className, ...props }: FontFamilyComboboxProps) {
	const options = useMemo(() => {
		return fontList.map((font) => ({
			value: font.family,
			keywords: getFontSearchKeywords(font.family),
			label: (
				<FontDisplay
					family={font.family}
					label={getFontDisplayName(font.family)}
					type={font.type}
					url={"preview" in font ? font.preview : undefined}
				/>
			),
		}));
	}, []);

	return <Combobox {...props} options={options} className={cn("w-full", className)} />;
}

type FontWeightComboboxProps = Omit<MultiComboboxProps, "options" | "multiple"> & { fontFamily: string };

export function FontWeightCombobox({ fontFamily, ...props }: FontWeightComboboxProps) {
	const options = useMemo(() => {
		const fontData = getFont(fontFamily);

		let weights: string[] = [];

		if (fontData && Array.isArray(fontData.weights) && fontData.weights.length > 0) {
			weights = fontData.weights as string[];
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

	return <Combobox {...props} multiple options={options} />;
}
