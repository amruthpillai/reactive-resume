import { getFont } from "@reactive-resume/fonts";

type Weight = "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";

export function getNextWeights(fontFamily: string): Weight[] | null {
	const fontData = getFont(fontFamily);
	if (!fontData || !Array.isArray(fontData.weights) || fontData.weights.length === 0) return null;

	const uniqueWeights = [...new Set(fontData.weights)] as Weight[];

	// Try to pick 400 and 600 if available
	const weights: Weight[] = [];

	if (uniqueWeights.includes("400")) weights.push("400");
	if (uniqueWeights.includes("600")) weights.push("600");

	const selectedWeights = new Set(weights);

	// If we didn't find both, fill in with first/last, ensuring uniqueness
	while (weights.length < 2 && uniqueWeights.length > 0) {
		// candidateIndex: 0 (first), 1 (last)
		const lastIndex = uniqueWeights.length - 1;
		const candidate = weights.length === 0 ? uniqueWeights[0] : uniqueWeights[lastIndex];
		if (!selectedWeights.has(candidate)) {
			weights.push(candidate);
			selectedWeights.add(candidate);
		} else break;
	}

	return weights.length > 0 ? weights : null;
}
