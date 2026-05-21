import type { FontDeclaration } from "@reactive-resume/schema/template-metadata";

type FontFileEntry = {
	data: string; // base64
	contentType: string;
};

// In-memory font store keyed by `${templateId}/${relativePath}`.
// Populated at server startup from the `templates.`files` JSONB column.
let _fontStore: Record<string, FontFileEntry> = {};

export const getFontFileStore = (): Record<string, FontFileEntry> => _fontStore;

export const setFontFileStore = (store: Record<string, FontFileEntry>): void => {
	_fontStore = store;
};

export const upsertTemplateFonts = (
	templateId: string,
	files: Record<string, string>,
	metadata: { fonts: FontDeclaration[] },
): void => {
	for (const font of metadata.fonts ?? []) {
		if (font.source !== "bundled" || !font.files) continue;
		for (const [, relativePath] of Object.entries(font.files)) {
			const raw = files[relativePath];
			if (!raw) continue;
			const key = `${templateId}/${relativePath}`;
			const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
			const contentType =
				ext === "woff"
					? "font/woff"
					: ext === "woff2"
						? "font/woff2"
						: ext === "ttf"
							? "font/ttf"
							: ext === "otf"
								? "font/otf"
								: "application/octet-stream";
			_fontStore[key] = { data: raw, contentType };
		}
	}
};

export async function handleTemplateFont(
	_request: Request,
	_templateId: string,
	_filename: string,
	_fontMap: Record<string, FontFileEntry>,
): Promise<Response> {
	// Font serving wired here; functional when font store is seeded (Phase 5).
	// During Phase 3/4 the route exists but returns 404 until the store is populated.
	return new Response("Not Found", { status: 404 });
}
