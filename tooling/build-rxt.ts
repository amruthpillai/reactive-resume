import { createWriteStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "..");
const templatesDir = join(repoRoot, "packages/pdf/src/templates");
const sharedHtmlDir = join(templatesDir, "shared-html");
const sharedMacros = readFileSync(join(sharedHtmlDir, "macros.html"), "utf-8");

const collectSharedSections = (): Record<string, string> => {
	const sectionsDir = join(sharedHtmlDir, "sections");
	const result: Record<string, string> = {};
	for (const f of readdirSync(sectionsDir)) {
		result[`sections/${f}`] = readFileSync(join(sectionsDir, f), "utf-8");
	}
	return result;
};

const addDirToZip = (zip: JSZip, dir: string, base: string): void => {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const rel = relative(base, full);
		if (statSync(full).isDirectory()) {
			addDirToZip(zip, full, base);
		} else {
			const ext = entry.slice(entry.lastIndexOf(".")).toLowerCase();
			const isBinary = [".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg"].includes(ext);
			zip.file(rel, isBinary ? readFileSync(full) : readFileSync(full, "utf-8"));
		}
	}
};

async function buildAll(): Promise<void> {
	const sharedSections = collectSharedSections();
	const templateDirs = readdirSync(templatesDir).filter((d) => {
		const full = join(templatesDir, d);
		const htmlDir = join(full, "html");
		return statSync(full).isDirectory() && existsSync(htmlDir);
	});

	for (const name of templateDirs) {
		const htmlDir = join(templatesDir, name, "html");
		const outPath = join(templatesDir, `${name}.rxt`);

		const zip = new JSZip();

		// 1. Inject shared macros
		zip.file("macros.html", sharedMacros);

		// 2. Inject shared section files (don't overwrite template-specific ones)
		const templateSectionsDir = join(htmlDir, "sections");
		const existingFiles = new Set<string>();
		if (existsSync(templateSectionsDir)) {
			for (const f of readdirSync(templateSectionsDir)) {
				existingFiles.add(`sections/${f}`);
			}
		}
		for (const [path, content] of Object.entries(sharedSections)) {
			if (!existingFiles.has(path)) {
				zip.file(path, content);
			}
		}

		// 3. Add template-specific files
		addDirToZip(zip, htmlDir, htmlDir);

		const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
		const ws = createWriteStream(outPath);
		await new Promise<void>((resolve, reject) => {
			ws.on("finish", resolve);
			ws.on("error", reject);
			ws.write(buffer);
			ws.end();
		});

		console.log(`✓ ${name}.rxt (${(buffer.length / 1024).toFixed(1)} KB)`);
	}
}

buildAll().catch((err) => {
	console.error(err);
	process.exit(1);
});
