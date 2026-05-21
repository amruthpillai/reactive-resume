import nunjucks from "nunjucks";

export class FileMapLoader extends nunjucks.Loader {
	async = false as const;

	constructor(private readonly files: Record<string, string>) {
		super();
	}

	getSource(name: string): nunjucks.LoaderSource | null {
		const content = this.files[name];
		if (content !== undefined) {
			return { src: content, path: name, noCache: false };
		}

		// For section files not in the archive, fall back to sections/default.html.
		// This lets custom sections (whose IDs are UUIDs) render generically.
		if (name.startsWith("sections/") && name.endsWith(".html")) {
			const fallback = this.files["sections/default.html"];
			if (fallback !== undefined) {
				return { src: fallback, path: "sections/default.html", noCache: false };
			}
		}

		return null;
	}
}
