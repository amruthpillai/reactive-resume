import { escapeCssComment, escapeCssIdentifier } from "./css-escape";
import { compileSelector } from "./selector";

export { escapeCssComment, escapeCssString } from "./css-escape";

export type GeneratedStylesheet = {
	languageVersion: number;
	blocks: readonly GeneratedStylesheetBlock[];
};

export type GeneratedStylesheetBlock = {
	comment?: string;
	selector: string;
	declarations: Readonly<Record<string, string | number>>;
};

function kebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function escapeCssValue(value: string | number): string {
	const text = String(value).trim();
	if (text.length === 0 || /[\0;{}]|\/\*/.test(text)) throw new Error("unsafe CSS declaration value");
	return text;
}

export function serializeGeneratedStylesheet(stylesheet: GeneratedStylesheet): string {
	if (!Number.isSafeInteger(stylesheet.languageVersion) || stylesheet.languageVersion < 1) {
		throw new Error("Semantic CSS language version must be a positive integer");
	}

	const blocks = stylesheet.blocks.map((block) => {
		const selector = compileSelector(block.selector);
		if (!selector.selector) throw new Error(`unsafe generated Semantic CSS selector: ${selector.error}`);

		const declarations = Object.entries(block.declarations)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([property, value]) => `\t${escapeCssIdentifier(kebabCase(property))}: ${escapeCssValue(value)};`)
			.join("\n");
		if (declarations.length === 0) throw new Error("generated Semantic CSS blocks require at least one declaration");

		const comment = block.comment === undefined ? "" : `/* ${escapeCssComment(block.comment)} */\n`;
		return `${comment}${block.selector} {\n${declarations}\n}`;
	});

	return `@version ${stylesheet.languageVersion};\n${blocks.length > 0 ? `\n${blocks.join("\n\n")}\n` : ""}`;
}
