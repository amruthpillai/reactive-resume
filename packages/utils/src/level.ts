/**
 * Parses a skill/language level string to a numeric value (0-5).
 * Supports numeric values, text levels (beginner/intermediate/advanced/expert),
 * and CEFR levels (A1-C2).
 */
export function parseLevel(level?: string): number {
	if (!level) return 0;

	const levelLower = level.toLowerCase();

	// Try to parse numeric values
	const numeric = Number.parseInt(levelLower, 10);
	if (!Number.isNaN(numeric) && numeric >= 0 && numeric <= 5) return numeric;

	// Map text levels to numbers
	if (levelLower.includes("native") || levelLower.includes("expert") || levelLower.includes("master")) return 5;
	if (levelLower.includes("fluent") || levelLower.includes("advanced") || levelLower.includes("proficient")) return 4;
	if (levelLower.includes("intermediate") || levelLower.includes("conversational")) return 3;
	if (levelLower.includes("beginner") || levelLower.includes("basic") || levelLower.includes("elementary")) return 2;
	if (levelLower.includes("novice")) return 1;

	// CEFR levels
	if (levelLower.includes("c2")) return 5;
	if (levelLower.includes("c1")) return 4;
	if (levelLower.includes("b2")) return 3;
	if (levelLower.includes("b1")) return 2;
	if (levelLower.includes("a2")) return 1;
	if (levelLower.includes("a1")) return 1;

	return 0;
}
