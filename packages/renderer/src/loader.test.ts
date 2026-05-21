import { describe, expect, it } from "vitest";
import nunjucks from "nunjucks";
import { FileMapLoader } from "./loader";

const files = {
	"index.html": "<p>Hello</p>",
	"sections/experience.html": "<section>Experience</section>",
};

describe("FileMapLoader", () => {
	it("resolves a known file", () => {
		const loader = new FileMapLoader(files);
		const src = loader.getSource("index.html");
		expect(src).not.toBeNull();
		if (src) expect(src.src).toBe("<p>Hello</p>");
	});

	it("resolves a file in a subdirectory", () => {
		const loader = new FileMapLoader(files);
		const src = loader.getSource("sections/experience.html");
		if (src) expect(src.src).toBe("<section>Experience</section>");
	});

	it("returns null for an unknown file", () => {
		const loader = new FileMapLoader(files);
		const src = loader.getSource("sections/awards.html");
		expect(src).toBeNull();
	});

	it("resolves dynamic include paths in a real Nunjucks render", () => {
		const loader = new FileMapLoader({
			"index.html": '{% include "sections/" + sectionId + ".html" ignore missing %}',
			"sections/experience.html": "<p>Experience</p>",
		});
		const env = new nunjucks.Environment(loader as unknown as nunjucks.ILoader, { autoescape: false });
		const result = env.render("index.html", { sectionId: "experience" });
		expect(result.indexOf("<p>Experience</p>")).toBeGreaterThan(-1);
	});

	it("silently skips missing includes when ignore missing is used", () => {
		const loader = new FileMapLoader({ "index.html": '{% include "sections/awards.html" ignore missing %}' });
		const env = new nunjucks.Environment(loader as unknown as nunjucks.ILoader, { autoescape: false });
		expect(() => env.render("index.html", {})).not.toThrow();
	});

	it("falls back to sections/default.html for unknown section files", () => {
		const loader = new FileMapLoader({
			"index.html": "<p>Main</p>",
			"sections/default.html": "<p>Default section</p>",
		});
		const src = loader.getSource("sections/custom-uuid-123.html");
		expect(src).not.toBeNull();
		if (src) {
			expect(src.src).toBe("<p>Default section</p>");
			expect(src.path).toBe("sections/default.html");
		}
	});

	it("returns null for unknown section file when no default.html exists", () => {
		const loader = new FileMapLoader({ "index.html": "<p>Main</p>" });
		const src = loader.getSource("sections/custom-uuid-123.html");
		expect(src).toBeNull();
	});
});
