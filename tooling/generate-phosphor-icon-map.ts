import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const phosphorJsonPath = join(repoRoot, "packages/ui/node_modules/@phosphor-icons/web/src/Phosphor.json");
const outPath = join(repoRoot, "packages/renderer/src/generated/phosphor-icons.ts");

const iconNames = [
	"envelope",
	"phone",
	"map-pin",
	"globe",
	"github-logo",
	"linkedin-logo",
	"game-controller",
	"code",
	"brackets-curly",
	"cpu",
	"brain",
	"shooting-star",
	"chart-line-up",
	"robot",
	"book-open",
	"pen-nib",
	"star",
] as const;

type PhosphorIconRecord = {
	tags?: string[];
	paths: string[];
};

type PhosphorSet = {
	metadata?: { name?: string };
	icons: PhosphorIconRecord[];
};

type PhosphorFile = {
	iconSets: PhosphorSet[];
};

const phosphor = JSON.parse(readFileSync(phosphorJsonPath, "utf8")) as PhosphorFile;
const regularSet = phosphor.iconSets.find((set) => set.metadata?.name === "Regular");

if (!regularSet) {
	throw new Error("Could not find Regular icon set in Phosphor.json");
}

const iconsByName = new Map<string, PhosphorIconRecord>();

for (const icon of regularSet.icons) {
	const name = icon.tags?.[0];
	if (!name) continue;
	iconsByName.set(name, icon);
}

const lines = [
	"export const phosphorIconMap = {",
	...iconNames.map((name) => {
		const icon = iconsByName.get(name);

		if (!icon) throw new Error(`Missing icon in Regular set: ${name}`);

		const paths = icon.paths.map((path) => `\t\t${JSON.stringify(`<path d="${path}"/>`)},`);

		return [
			`\t${JSON.stringify(name)}: {`,
			'\t\tviewBox: "0 0 256 256",',
			"\t\tfill: true,",
			"\t\tpaths: [",
			...paths,
			"\t\t],",
			"\t},",
		].join("\n");
	}),
	"} as const;",
	"",
].join("\n");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, lines);

console.log(`Wrote ${outPath}`);
