// Run after iOS/Android exports with --source-maps; committed notices let clean checkouts build without this step.
const { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const appRoot = resolve(__dirname, "../../..");
const repoRoot = resolve(appRoot, "../..");
const sourceMaps = process.argv.slice(2);
if (!sourceMaps.length) throw new Error("Usage: node generate.cjs <ios.hbc.map> <android.hbc.map>");
const packages = new Map();
for (const sourceMap of sourceMaps) {
	const { sources } = JSON.parse(readFileSync(sourceMap, "utf8"));
	for (const source of sources) {
		// Expo maps use workspace-root paths. App/workspace code and virtual modules have no third-party owner.
		if (!source.startsWith("/node_modules/")) continue;
		let root = dirname(resolve(repoRoot, source.slice(1)));
		let manifest;
		while (root !== repoRoot) {
			const file = join(root, "package.json");
			if (existsSync(file)) {
				const candidate = JSON.parse(readFileSync(file, "utf8"));
				// Nested ESM/CJS scope manifests may omit version/licence; use the published package owner.
				if (typeof candidate.name === "string" && typeof candidate.version === "string") {
					manifest = candidate;
					break;
				}
			}
			const parent = dirname(root);
			if (parent === root) break;
			root = parent;
		}
		if (!manifest) throw new Error(`No installed package for ${source}; install and export again.`);
		root = realpathSync(root);
		packages.set(`${manifest.name} ${manifest.version}`, { root, manifest });
	}
}

const notices = [];
for (const { root, manifest } of packages.values()) {
	const files = readdirSync(root)
		.filter((name) => /^(licen[cs]e|copying|notice)([.-]|$)/i.test(name))
		.sort();
	const texts = files
		.filter((name) => !name.endsWith(".json") && statSync(join(root, name)).isFile())
		.map((name) => `${name}\n${readFileSync(join(root, name), "utf8").replace(/\r\n/g, "\n").trim()}`);
	notices.push({
		title: `${manifest.name} ${manifest.version}`,
		text: [
			typeof manifest.license === "string" ? manifest.license : "Licence not declared in package metadata.",
			...texts,
		].join("\n\n"),
	});
}
notices.sort((a, b) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
const native = readFileSync(join(repoRoot, "packages/forme-native/THIRD_PARTY_NOTICES.md"), "utf8");
const nativeNotices = native.split(/^## /m).map((section, index) => {
	const newline = section.indexOf("\n");
	return { title: index === 0 ? "Forme native" : section.slice(0, newline), text: section.slice(newline + 1).trim() };
});
const fontRoot = join(appRoot, "assets/fonts");
const fontNotices = readdirSync(fontRoot)
	.filter((name) => /OFL|LICEN[CS]E/i.test(name))
	.sort()
	.map((name) => ({ title: name, text: readFileSync(join(fontRoot, name), "utf8").trim() }));

// Paragraph-level interning preserves repeated licence wording while sharing it across JS, crates and fonts.
const licenceTexts = [];
const textIds = new Map();
function intern(entries) {
	return entries.map(({ title, text }) => ({
		title,
		textIds: text.split(/\n\s*\n/).map((paragraph) => {
			if (!textIds.has(paragraph)) {
				textIds.set(paragraph, licenceTexts.length);
				licenceTexts.push(paragraph);
			}
			return textIds.get(paragraph);
		}),
	}));
}
const nativeEntries = intern([...nativeNotices, ...fontNotices]);
const javascriptEntries = intern(notices);
const output = `// Generated from native notices, font OFLs and iOS/Android runtime source maps; see README.md.\n// prettier-ignore\nexport const licenceTexts = ${JSON.stringify(licenceTexts)};\n// prettier-ignore\nexport const nativeNotices = ${JSON.stringify(nativeEntries)};\n// prettier-ignore\nexport const javascriptNotices = ${JSON.stringify(javascriptEntries)};\n`;
const target = join(__dirname, "notices.ts");
if (!existsSync(target) || readFileSync(target, "utf8") !== output) writeFileSync(target, output);
