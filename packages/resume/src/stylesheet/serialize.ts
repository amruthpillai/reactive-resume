import { compileSelector } from "./selector";

export type GeneratedStylesheet = {
	languageVersion: number;
	blocks: readonly GeneratedStylesheetBlock[];
};

export type GeneratedStylesheetBlock = {
	comment?: string;
	selector: string;
	declarations: Readonly<Record<string, string | number>>;
};

function escapeCssIdentifier(value: string): string {
	let result = "";

	for (let index = 0; index < value.length; index++) {
		const codePoint = value.codePointAt(index);
		if (codePoint === undefined) break;
		const character = String.fromCodePoint(codePoint);
		const isFirst = index === 0;
		const isSecondAfterHyphen = index === 1 && value[0] === "-";
		const isControl = codePoint <= 0x1f || codePoint === 0x7f;
		const isDigit = codePoint >= 0x30 && codePoint <= 0x39;
		const isIdentifierCharacter =
			codePoint >= 0x80 ||
			character === "-" ||
			character === "_" ||
			(isDigit && !isFirst && !isSecondAfterHyphen) ||
			(codePoint >= 0x41 && codePoint <= 0x5a) ||
			(codePoint >= 0x61 && codePoint <= 0x7a);

		if (codePoint === 0) result += "�";
		else if (isControl || (isDigit && (isFirst || isSecondAfterHyphen))) result += `\\${codePoint.toString(16)} `;
		else if (isIdentifierCharacter) result += character;
		else result += `\\${character}`;

		if (codePoint > 0xffff) index++;
	}

	return result;
}

function kebabCase(value: string): string {
	return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function escapeCssValue(value: string | number): string {
	const text = String(value).trim();
	if (text.length === 0 || /[\0;{}]|\/\*/.test(text)) throw new Error("unsafe CSS declaration value");
	return text;
}

export function escapeCssComment(value: string): string {
	return value.replaceAll("*/", "*\\/");
}

export function escapeCssString(value: string): string {
	let result = '"';

	for (const character of value) {
		const codePoint = character.codePointAt(0);
		if (codePoint === undefined) continue;
		if (codePoint === 0) result += "�";
		else if (character === '"' || character === "\\") result += `\\${character}`;
		else if (codePoint <= 0x1f || codePoint === 0x7f) result += `\\${codePoint.toString(16)} `;
		else result += character;
	}

	return `${result}"`;
}

export function serializeGeneratedStylesheet(stylesheet: GeneratedStylesheet): string {
	if (!Number.isSafeInteger(stylesheet.languageVersion) || stylesheet.languageVersion < 1) {
		throw new Error("RRSS language version must be a positive integer");
	}

	const blocks = stylesheet.blocks.map((block) => {
		const selector = compileSelector(block.selector);
		if (!selector.selector) throw new Error(`unsafe generated RRSS selector: ${selector.error}`);

		const declarations = Object.entries(block.declarations)
			.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
			.map(([property, value]) => `\t${escapeCssIdentifier(kebabCase(property))}: ${escapeCssValue(value)};`)
			.join("\n");
		if (declarations.length === 0) throw new Error("generated RRSS blocks require at least one declaration");

		const comment = block.comment === undefined ? "" : `/* ${escapeCssComment(block.comment)} */\n`;
		return `${comment}${block.selector} {\n${declarations}\n}`;
	});

	return `@rr-version ${stylesheet.languageVersion};\n${blocks.length > 0 ? `\n${blocks.join("\n\n")}\n` : ""}`;
}
