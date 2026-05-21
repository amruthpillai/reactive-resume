import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { templateService } from "@reactive-resume/api/features/templates";
import { parseTemplate } from "@reactive-resume/renderer";
import { upsertTemplateFonts } from "../http/fonts";

const resolveTemplatesDir = (): string => {
	let dir = fileURLToPath(new URL(".", import.meta.url));
	while (dir !== "/") {
		const candidate = join(dir, "packages/pdf/src/templates");
		try {
			readdirSync(candidate);
			return candidate;
		} catch {
			const parent = join(dir, "..");
			if (parent === dir) break;
			dir = parent;
		}
	}
	throw new Error("Could not locate packages/pdf/src/templates from seed-templates.ts");
};

export async function seedTemplates(): Promise<void> {
	let templatesDir: string;
	try {
		templatesDir = resolveTemplatesDir();
	} catch (e) {
		console.warn("[Seed Templates] Could not find templates directory:", e);
		return;
	}

	const rxtFiles = readdirSync(templatesDir).filter((f) => f.endsWith(".rxt"));

	if (rxtFiles.length === 0) {
		console.info(
			"[Seed Templates] No .rxt files found — run `pnpm --filter @reactive-resume/pdf build:rxt` to build them.",
		);
		return;
	}

	console.info(`[Seed Templates] Seeding ${rxtFiles.length} built-in template(s)...`);

	for (const file of rxtFiles) {
		const id = file.slice(0, -".rxt".length);
		try {
			const zipBuffer = readFileSync(join(templatesDir, file));
			const parsed = await parseTemplate(zipBuffer);

			const record = await templateService.upsert({
				id,
				name: parsed.metadata.name,
				tags: parsed.metadata.tags,
				files: parsed.files,
				metadata: parsed.metadata,
				inputs: parsed.inputs,
				...(parsed.metadata.description !== undefined ? { description: parsed.metadata.description } : {}),
				...(parsed.metadata.author !== undefined ? { author: parsed.metadata.author } : {}),
			});

			// Populate in-memory font store so bundled fonts are served by the /fonts route.
			const metaWithFonts = record.metadata as typeof parsed.metadata;
			upsertTemplateFonts(record.id, record.files, { fonts: metaWithFonts.fonts ?? [] });

			console.info(`[Seed Templates] ✓ ${id}`);
		} catch (error) {
			console.error(`[Seed Templates] ✗ ${id}`, error);
		}
	}

	console.info("[Seed Templates] Done.");
}
