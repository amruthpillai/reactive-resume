/// <reference path="./wink-porter2-stemmer.d.ts" />
import porter2 from "wink-porter2-stemmer";
import { SKILL_SURFACE_FORMS } from "./aliases";

const MAX_STEM_LENGTH = 64;

/**
 * Stems free-text vocabulary only.
 *
 * "Managed" and "managing" should meet in the middle; "Kubernetes" should not become "kubernet".
 * Anything the alias map knows as a skill surface form is returned untouched, and so is anything
 * carrying the punctuation that makes a technical name what it is.
 */
export function stemFreeText(token: string): string {
	if (SKILL_SURFACE_FORMS.has(token)) return token;
	if (/[+#./]/.test(token)) return token;
	// The stemmer is quadratic in word length; no real word is this long.
	if (token.length < 4 || token.length > MAX_STEM_LENGTH) return token;
	if (!/^[a-z][a-z-]*$/.test(token)) return token;

	return porter2(token);
}
