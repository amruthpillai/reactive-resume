import { syllables } from "@react-pdf/hyphenate/de-1996";
import { letters as cjkLetters } from "cjk-regex";

type HyphenationOptions = {
	locale: string;
	automatic: boolean;
	cjk: boolean;
};

const cjkLetterRegex = cjkLetters().toRegExp();
// Keep addresses, URLs, identifiers, hard hyphens and other scripts intact.
const germanWord = /^([("'„“«‹]*)([\p{Script=Latin}][\p{Script=Latin}\p{M}]*)([.,;:!?…)"'“”’»›]*)$/u;

/** Each document owns its callback; concurrent exports never switch its language. */
export function createHyphenationCallback({ locale, automatic, cjk }: HyphenationOptions) {
	const german = automatic && /^de(?:-|$)/i.test(locale);
	return (word: string): string[] => {
		if (cjk) {
			if (word === " ") return ["\u200C "];
			if (cjkLetterRegex.test(word)) return [...word].flatMap((letter) => [letter, ""]);
		}
		if (!german) return [word];
		if (word.includes("\u00AD")) {
			const parts = word.split("\u00AD").filter(Boolean);
			return parts.length > 0 ? parts : [""];
		}
		const match = germanWord.exec(word);
		if (!match) return [word];
		const [, prefix = "", content = "", suffix = ""] = match;
		const parts: string[] = [];
		for (const part of syllables(content)) {
			// A break must never separate a combining mark from its preceding letter.
			if (/^\p{M}/u.test(part) && parts.length > 0) parts[parts.length - 1] += part;
			else parts.push(part);
		}
		if (parts.length === 0) return [word];
		parts[0] = prefix + parts[0];
		parts[parts.length - 1] += suffix;
		return parts;
	};
}
