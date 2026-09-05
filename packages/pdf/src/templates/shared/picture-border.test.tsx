import type { Style } from "@react-pdf/types";
import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { renderToBuffer } from "@react-pdf/renderer";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { resolveResumeRuntime } from "../../semantic/resolve";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

const source = createCanvas(100, 100);
const context = source.getContext("2d");
context.fillStyle = "#00aa00";
context.fillRect(0, 0, 100, 100);

async function picturePixels(
	template: "onyx" | "ditto" | "glalie",
	borderWidth: number,
	mode: "semantic" | "legacy" = "semantic",
	stylesheet = "@version 1;",
	shadowWidth = 0,
	url = source.toDataURL("image/png"),
	styleOverride?: Style,
) {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Picture";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.stylesheet = { mode, source: { languageVersion: 1, text: stylesheet } };
	data.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: [] }];
	Object.assign(data.picture, {
		url,
		hidden: false,
		size: 100,
		borderRadius: 0,
		borderColor: "rgba(255, 0, 255, 1)",
		borderWidth,
		shadowWidth,
		shadowColor: "rgba(0, 0, 255, 1)",
	});
	let runtime = resolveResumeRuntime({ data, template, mode });
	if (styleOverride) {
		const entry = Object.entries(runtime.presentation).find(([key]) => key.endsWith("/picture"));
		if (!entry) throw new Error("Missing picture presentation");
		const [key, picture] = entry;
		runtime = {
			...runtime,
			presentation: { ...runtime.presentation, [key]: { ...picture, style: { ...picture.style, ...styleOverride } } },
		};
	}
	const element = createElement(ResumeDocument, {
		data,
		template,
		semanticRuntime: styleOverride ? runtime : undefined,
	}) as unknown as Parameters<typeof renderToBuffer>[0];
	let bytes = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const [page] = await rasterizePdf(bytes);
	if (!page) throw new Error("Missing rendered page");
	let borderPixels = 0;
	let imagePixels = 0;
	let shadowPixels = 0;
	const shadowBounds = {
		left: Number.POSITIVE_INFINITY,
		right: Number.NEGATIVE_INFINITY,
		top: Number.POSITIVE_INFINITY,
		bottom: Number.NEGATIVE_INFINITY,
	};
	const positions: { x: number; y: number }[] = [];
	for (let index = 0; index < page.data.length; index += 4) {
		if (
			(page.data[index + 2] ?? 0) > (page.data[index] ?? 0) + 5 &&
			(page.data[index + 2] ?? 0) > (page.data[index + 1] ?? 0) + 5
		) {
			shadowPixels++;
			const x = (index / 4) % page.width;
			const y = Math.floor(index / 4 / page.width);
			shadowBounds.left = Math.min(shadowBounds.left, x);
			shadowBounds.right = Math.max(shadowBounds.right, x);
			shadowBounds.top = Math.min(shadowBounds.top, y);
			shadowBounds.bottom = Math.max(shadowBounds.bottom, y);
		}
		if (page.data[index] === 255 && page.data[index + 1] === 0 && page.data[index + 2] === 255) borderPixels++;
		if (
			(page.data[index + 1] ?? 0) > (page.data[index] ?? 0) + 5 &&
			(page.data[index + 1] ?? 0) > (page.data[index + 2] ?? 0) + 5
		)
			imagePixels++;
		if (
			(page.data[index] === 255 && page.data[index + 1] === 0 && page.data[index + 2] === 255) ||
			((page.data[index + 1] ?? 0) > (page.data[index] ?? 0) + 5 &&
				(page.data[index + 1] ?? 0) > (page.data[index + 2] ?? 0) + 5)
		)
			positions.push({ x: (index / 4) % page.width, y: Math.floor(index / 4 / page.width) });
	}
	const bounds = {
		left: Math.min(...positions.map(({ x }) => x)),
		right: Math.max(...positions.map(({ x }) => x)),
		top: Math.min(...positions.map(({ y }) => y)),
		bottom: Math.max(...positions.map(({ y }) => y)),
	};
	const center =
		(Math.floor((bounds.top + bounds.bottom) / 2) * page.width + Math.floor((bounds.left + bounds.right) / 2)) * 4;
	return {
		borderPixels,
		imagePixels,
		shadowPixels,
		shadowBounds,
		bounds,
		center: [...page.data.slice(center, center + 3)],
	};
}

describe("picture border visibility (#3017)", () => {
	it("keeps the shadow centered on the outer border box when borders and padding change", async () => {
		const plain = await picturePixels("onyx", 0, "semantic", "@version 1;", 10);
		const bordered = await picturePixels("onyx", 10, "semantic", "@version 1; picture { padding: 5pt; }", 10);
		expect(bordered.shadowBounds).toEqual(plain.shadowBounds);
		const asymmetric = await picturePixels(
			"onyx",
			0,
			"semantic",
			"@version 1; picture { border-top: 12pt solid #ff00ff; border-right: 3pt solid #ff00ff; border-bottom: 8pt solid #ff00ff; border-left: 5pt solid #ff00ff; padding: 3pt 4pt 5pt 6pt; }",
			10,
		);
		expect(asymmetric.shadowBounds).toEqual(plain.shadowBounds);
	});
	it("preserves percentage dimensions, padding, rounded borders, rotation and opacity", async () => {
		const css =
			"@version 1; picture { width: 40%; height: 100pt; padding: 1%; border-radius: 25%; transform: rotate(15deg); }";
		const opaque = await picturePixels("onyx", 10, "semantic", css);
		const plain = await picturePixels("onyx", 10, "semantic", css, 0, undefined, { opacity: 0.5 });
		const shadow = await picturePixels("onyx", 10, "semantic", css, 10, undefined, { opacity: 0.5 });
		expect(opaque.borderPixels).toBeGreaterThan(1000);
		expect(plain.imagePixels).toBeGreaterThan(1000);
		expect(shadow).toEqual(plain); // Unresolved percentage dimensions omit the shadow.
		expect(plain.center[0]).toBeGreaterThanOrEqual(126);
		expect(plain.center[0]).toBeLessThanOrEqual(129);
	});
	it.each([0, 10])("keeps percentage picture padding outside the border inset (%s)", async (shadowWidth) => {
		const plain = await picturePixels("onyx", 10, "semantic", "@version 1;", shadowWidth);
		const padded = await picturePixels("onyx", 10, "semantic", "@version 1; picture { padding: 1%; }", shadowWidth);
		expect(padded.borderPixels).toBe(plain.borderPixels);
		expect(padded.imagePixels).toBeLessThan(plain.imagePixels);
	});
	it.each([0, 10])("preserves border and authored padding with shadow width %s", async (shadowWidth) => {
		const plain = await picturePixels("onyx", 10, "semantic", "@version 1;", shadowWidth);
		const zero = await picturePixels("onyx", 10, "semantic", "@version 1; picture { padding: 0; }", shadowWidth);
		const padded = await picturePixels("onyx", 10, "semantic", "@version 1; picture { padding: 5pt; }", shadowWidth);
		expect(zero).toEqual(plain);
		expect(padded.borderPixels).toBe(plain.borderPixels);
		expect(padded.imagePixels).toBeLessThan(plain.imagePixels);
	});
	it.each(["onyx", "ditto", "glalie"] as const)("draws the border around an opaque picture (%s)", async (template) => {
		const plain = await picturePixels(template, 0);
		const bordered = await picturePixels(template, 10);
		expect(plain.borderPixels).toBe(0);
		expect(bordered.borderPixels).toBeGreaterThan(1000);
		expect(bordered.imagePixels).toBeGreaterThan(1000);
		expect(bordered.imagePixels).toBeLessThan(plain.imagePixels);
		// Rasterized border/image edges can differ by one antialiased pixel.
		for (const edge of ["left", "right", "top", "bottom"] as const)
			expect(Math.abs(bordered.bounds[edge] - plain.bounds[edge])).toBeLessThanOrEqual(1);
	});
	it("honors semantic border width overrides", async () => {
		const metadataBorder = await picturePixels("onyx", 10);
		const overridden = await picturePixels(
			"onyx",
			0,
			"semantic",
			"@version 1; picture { border: 10pt solid #ff00ff; }",
		);
		expect(overridden).toEqual(metadataBorder);
	});
	it("keeps legacy picture borders visible", async () => {
		const bordered = await picturePixels("onyx", 10, "legacy");
		expect(bordered.borderPixels).toBeGreaterThan(1000);
	});
	it.each(["onyx", "ditto", "glalie"] as const)(
		"draws a soft centered shadow without moving the photo (%s)",
		async (template) => {
			const plain = await picturePixels(template, 0);
			const shadow = await picturePixels(template, 0, "semantic", "@version 1;", 10);
			expect(plain.shadowPixels).toBe(0);
			expect(shadow.shadowPixels).toBeGreaterThan(100);
			expect(shadow.bounds).toEqual(plain.bounds);
			expect(shadow.imagePixels).toBe(plain.imagePixels);
		},
	);
	it("resolves semantic shadow color, width, and rounded shape", async () => {
		const shadow = await picturePixels(
			"onyx",
			0,
			"semantic",
			"@version 1; picture { -resume-shadow-width: 10pt; -resume-shadow-color: rgba(0, 0, 255, 0.5); border-radius: 50pt; }",
		);
		expect(shadow.shadowPixels).toBeGreaterThan(100);
		expect(shadow.center).toEqual([0, 170, 0]);
	});
	it("does not tint a transparent photo interior", async () => {
		const transparent = createCanvas(100, 100);
		const context = transparent.getContext("2d");
		context.fillStyle = "#00aa00";
		context.fillRect(0, 0, 100, 100);
		context.clearRect(30, 30, 40, 40);
		const shadow = await picturePixels("onyx", 0, "semantic", "@version 1;", 10, transparent.toDataURL("image/png"));
		expect(shadow.shadowPixels).toBeGreaterThan(100);
		expect(shadow.center).toEqual([255, 255, 255]);
	});
	it("preserves rotated photo geometry and opacity", async () => {
		const css = "@version 1; picture { transform: rotate(25deg); }";
		const plain = await picturePixels("onyx", 0, "semantic", css, 0, undefined, { opacity: 0.5 });
		const shadow = await picturePixels("onyx", 0, "semantic", css, 10, undefined, { opacity: 0.5 });
		expect(shadow.shadowPixels).toBeGreaterThan(100);
		expect(shadow.bounds).toEqual(plain.bounds);
		expect(shadow.center).toEqual(plain.center);
	});
	it("keeps the outer shadow visible when the picture clips its contents", async () => {
		const shadow = await picturePixels("onyx", 0, "semantic", "@version 1;", 10, undefined, { overflow: "hidden" });
		expect(shadow.shadowPixels).toBeGreaterThan(100);
	});
	it("matches percentage and absolute picture corner radii", async () => {
		const absolute = await picturePixels("onyx", 0, "semantic", "@version 1; picture { border-radius: 50pt; }", 10);
		const percent = await picturePixels("onyx", 0, "semantic", "@version 1; picture { border-radius: 50%; }", 10);
		expect(percent).toEqual(absolute);
	});
});
