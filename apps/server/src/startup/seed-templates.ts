import { templateService } from "@reactive-resume/api/features/templates";
import { parseTemplate } from "@reactive-resume/renderer";

type SeededTemplate = {
	id: string;
	zipBuffer: Buffer;
};

/**
 * Built-in template archives (phase 7 provides actual .rxt bytes).
 * Until then this array is empty and the seeding hook is a no-op.
 */
const BUILTIN_TEMPLATES: readonly SeededTemplate[] = [];

/**
 * Seed built-in templates on server startup (idempotent upsert).
 * Called from runStartupChecks after migrations complete.
 */
export async function seedTemplates(): Promise<void> {
	if (BUILTIN_TEMPLATES.length === 0) {
		console.info("[Seed Templates] No built-in templates registered yet.");
		return;
	}

	console.info(`[Seed Templates] Seeding ${BUILTIN_TEMPLATES.length} built-in template(s)...`);

	for (const { id, zipBuffer } of BUILTIN_TEMPLATES) {
		try {
			const parsed = await parseTemplate(zipBuffer);

			await templateService.upsert({
				id,
				name: parsed.metadata.name,
				tags: parsed.metadata.tags,
				files: parsed.files,
				metadata: parsed.metadata,
				inputs: parsed.inputs,
				...(parsed.metadata.description !== undefined ? { description: parsed.metadata.description } : {}),
				...(parsed.metadata.author !== undefined ? { author: parsed.metadata.author } : {}),
			});

			console.info(`[Seed Templates] ✓ ${id}`);
		} catch (error) {
			console.error(`[Seed Templates] ✗ ${id}`, error);
		}
	}

	console.info("[Seed Templates] Done.");
}
