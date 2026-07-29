import {
	createSemanticCssResume,
	PORTABLE_STYLESHEET,
	seedSemanticCssResume,
	switchTemplate,
} from "../../fixtures/semantic-css";
import { expect, test } from "../../fixtures/test";

const templates = [
	"Azurill",
	"Bronzor",
	"Chikorita",
	"Ditgar",
	"Ditto",
	"Gengar",
	"Glalie",
	"Kakuna",
	"Lapras",
	"Leafish",
	"Meowth",
	"Onyx",
	"Pikachu",
	"Rhyhorn",
	"Scizor",
] as const;

test.setTimeout(240_000);

async function previewClip(page: Parameters<typeof createSemanticCssResume>[0]) {
	let previous: string | undefined;
	await expect
		.poll(
			async () => {
				const current = await page.evaluate(() => {
					const source = Array.from(
						document.querySelectorAll<HTMLCanvasElement>('canvas[aria-label^="Resume page 1 of"]'),
					)
						.filter((element) => {
							for (let current: Element | null = element; current; current = current.parentElement) {
								const style = getComputedStyle(current);
								if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
									return false;
								}
							}
							return true;
						})
						.sort((left, right) => {
							const intersection = (element: Element) => {
								const rect = element.getBoundingClientRect();
								const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
								const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
								return width * height;
							};
							return intersection(right) - intersection(left);
						})[0];
					if (!source) throw new Error("Expected a visible first-page canvas.");
					return source.toDataURL();
				});
				const stable = current === previous;
				previous = current;
				return stable;
			},
			{ intervals: [250], timeout: 15_000 },
		)
		.toBe(true);
	const dimensions = await page.evaluate(() => {
		const source = Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[aria-label^="Resume page 1 of"]'))
			.filter((element) => {
				for (let current: Element | null = element; current; current = current.parentElement) {
					const style = getComputedStyle(current);
					if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;
				}
				return true;
			})
			.sort((left, right) => {
				const intersection = (element: Element) => {
					const rect = element.getBoundingClientRect();
					const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
					const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
					return width * height;
				};
				return intersection(right) - intersection(left);
			})[0];
		if (!source) throw new Error("Expected a visible first-page canvas.");
		const box = source.getBoundingClientRect();
		const width = Math.ceil(box.width);
		const height = Math.ceil(box.height);
		document.querySelector("[data-semantic-css-visual-page]")?.remove();
		const surface = document.createElement("div");
		surface.dataset.semanticCssVisualPage = "";
		Object.assign(surface.style, {
			background: "white",
			height: "632px",
			left: "0",
			position: "fixed",
			top: "0",
			width: "447px",
			zIndex: "2147483647",
		});
		const snapshot = document.createElement("canvas");
		snapshot.width = source.width;
		snapshot.height = source.height;
		snapshot.style.width = "447px";
		snapshot.style.height = "632px";
		const context = snapshot.getContext("2d");
		if (!context) throw new Error("Expected a 2D canvas context for the visual snapshot.");
		context.drawImage(source, 0, 0);
		surface.append(snapshot);
		document.body.append(surface);
		return { width, height };
	});
	const { width, height } = dimensions;
	expect({ width, height }).toEqual({ width: 447, height: 632 });
	const surface = page.locator("[data-semantic-css-visual-page]");
	const surfaceBox = await surface.boundingBox();
	if (!surfaceBox) throw new Error("Expected a visible page-only visual snapshot surface.");
	const clip = {
		x: Math.floor(surfaceBox.x),
		y: Math.floor(surfaceBox.y),
		width: Math.ceil(surfaceBox.x + surfaceBox.width) - Math.floor(surfaceBox.x),
		height: Math.ceil(surfaceBox.y + surfaceBox.height) - Math.floor(surfaceBox.y),
	};
	expect({ width: clip.width, height: clip.height }).toEqual({ width: 447, height: 632 });
	return clip;
}

test("@semantic-css renders deterministic first-page previews for all templates", async ({
	authPage: page,
}, testInfo) => {
	const resumeId = await createSemanticCssResume(page, testInfo);
	const portable = { languageVersion: 1, text: PORTABLE_STYLESHEET };
	await seedSemanticCssResume(page, resumeId, {
		basicsName: "Semantic CSS Acceptance",
		experienceItemId: "experience-item-2",
		hidePicture: true,
		stylesheet: { mode: "semantic", source: portable, applied: portable },
	});

	for (const template of templates) {
		await switchTemplate(page, template);
		await expect(page).toHaveScreenshot(`${template.toLowerCase()}-first-page.png`, {
			animations: "disabled",
			caret: "hide",
			clip: await previewClip(page),
			maxDiffPixelRatio: 0,
		});
		await page.locator("[data-semantic-css-visual-page]").evaluate((element) => element.remove());
	}
});
