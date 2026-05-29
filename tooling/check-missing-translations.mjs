import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const localeDir = join(process.cwd(), "apps", "web", "locales");

function unescapePo(value) {
	return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function readPoString(lines, startIndex) {
	const initial = lines[startIndex].match(/^msg(?:id|str)\s+"(.*)"$/);
	if (!initial) return null;

	let value = unescapePo(initial[1]);
	for (let index = startIndex + 1; index < lines.length; index++) {
		const match = lines[index].match(/^"(.*)"$/);
		if (!match) break;

		value += unescapePo(match[1]);
	}

	return value;
}

const failures = [];

for (const file of readdirSync(localeDir).filter((name) => name.endsWith(".po"))) {
	const contents = readFileSync(join(localeDir, file), "utf8").replace(/\r\n/g, "\n");

	for (const block of contents.split(/\n\n+/)) {
		const lines = block.split("\n");
		const msgidIndex = lines.findIndex((line) => line.startsWith("msgid "));
		const msgstrIndex = lines.findIndex((line) => line.startsWith("msgstr "));
		if (msgidIndex === -1 || msgstrIndex === -1) continue;

		const msgid = readPoString(lines, msgidIndex);
		const msgstr = readPoString(lines, msgstrIndex);
		if (!msgid || msgstr !== "") continue;

		failures.push(`${file}: ${msgid}`);
	}
}

if (failures.length > 0) {
	console.error(failures.join("\n"));
	process.exit(1);
}

console.log("No missing translations.");
