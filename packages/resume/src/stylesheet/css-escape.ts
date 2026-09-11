export function escapeCssIdentifier(value: string): string {
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
