import { describe, expect, it } from "vitest";
import { createCanvas } from "@napi-rs/canvas";
import { renderToBuffer } from "@react-pdf/renderer";
import { act, createElement } from "react";
import { defaultResumeData } from "@reactive-resume/schema/resume/default";
import { ResumeDocument } from "../../document";
import { rasterizePdf } from "../../semantic/test/rasterize-pdf";

type Fit = "cover" | "contain";
type Orientation = "square" | "landscape" | "portrait";

const dimensions = {
	square: [300, 300],
	landscape: [400, 300],
	portrait: [300, 400],
} as const;

const marker = {
	left: [255, 0, 0],
	right: [0, 255, 0],
	top: [0, 0, 255],
	bottom: [255, 255, 0],
} as const;

const frameColor = [255, 0, 255] as const;

function markedImage(orientation: Orientation) {
	const [width, height] = dimensions[orientation];
	const canvas = createCanvas(width, height);
	const context = canvas.getContext("2d");
	context.fillStyle = "#ffffff";
	context.fillRect(0, 0, width, height);
	const strip = Math.round(Math.min(width, height) * 0.08);
	context.fillStyle = "#ff0000";
	context.fillRect(0, 0, strip, height);
	context.fillStyle = "#00ff00";
	context.fillRect(width - strip, 0, strip, height);
	context.fillStyle = "#0000ff";
	context.fillRect(strip, 0, width - strip * 2, strip);
	context.fillStyle = "#ffff00";
	context.fillRect(strip, height - strip, width - strip * 2, strip);
	context.fillStyle = "#000000";
	context.fillRect(Math.floor(width / 2) - 3, strip, 6, height - strip * 2);
	context.fillRect(strip, Math.floor(height / 2) - 3, width - strip * 2, 6);
	return canvas.toDataURL("image/png");
}

async function rasterPicture(
	orientation: Orientation,
	fit: Fit,
	stylesheet = "@version 1;",
	frame = { borderWidth: 6, shadowWidth: 8 },
) {
	const data = structuredClone(defaultResumeData);
	data.basics.name = "Picture fit";
	data.metadata.typography.body.fontFamily = "Helvetica";
	data.metadata.typography.heading.fontFamily = "Helvetica";
	data.metadata.layout.pages = [{ fullWidth: false, main: [], sidebar: [] }];
	data.metadata.stylesheet = { mode: "semantic", source: { languageVersion: 1, text: stylesheet } };
	Object.assign(data.picture, {
		url: markedImage(orientation),
		hidden: false,
		fit,
		size: 100,
		aspectRatio: 1,
		borderRadius: 0,
		borderColor: "rgba(255, 0, 255, 1)",
		borderWidth: frame.borderWidth,
		shadowColor: "rgba(0, 255, 255, 1)",
		shadowWidth: frame.shadowWidth,
	});
	const element = createElement(ResumeDocument, { data, template: "onyx" }) as unknown as Parameters<
		typeof renderToBuffer
	>[0];
	let bytes = new Uint8Array();
	await act(async () => {
		bytes = new Uint8Array(await renderToBuffer(element));
	});
	const [page] = await rasterizePdf(bytes);
	if (!page) throw new Error("Missing rendered page");
	return page;
}

function colorBounds(page: Awaited<ReturnType<typeof rasterPicture>>, color: readonly number[]) {
	const points: { x: number; y: number }[] = [];
	for (let index = 0; index < page.data.length; index += 4) {
		if (color.every((channel, offset) => Math.abs((page.data[index + offset] ?? -255) - channel) <= 2)) {
			points.push({ x: (index / 4) % page.width, y: Math.floor(index / 4 / page.width) });
		}
	}
	if (points.length === 0) return undefined;
	return {
		left: Math.min(...points.map(({ x }) => x)),
		right: Math.max(...points.map(({ x }) => x)),
		top: Math.min(...points.map(({ y }) => y)),
		bottom: Math.max(...points.map(({ y }) => y)),
	};
}

describe("picture fit geometry (#2782)", () => {
	it.each(["square", "landscape", "portrait"] as const)(
		"keeps every %s source edge visible and centered in contain mode",
		async (orientation) => {
			const page = await rasterPicture(orientation, "contain");
			const left = colorBounds(page, marker.left);
			const right = colorBounds(page, marker.right);
			const top = colorBounds(page, marker.top);
			const bottom = colorBounds(page, marker.bottom);
			const frame = colorBounds(page, frameColor);
			expect([left, right, top, bottom, frame].every(Boolean)).toBe(true);
			const imageCenterX = ((left?.left ?? 0) + (right?.right ?? 0)) / 2;
			const imageCenterY = ((top?.top ?? 0) + (bottom?.bottom ?? 0)) / 2;
			const frameCenterX = ((frame?.left ?? 0) + (frame?.right ?? 0)) / 2;
			const frameCenterY = ((frame?.top ?? 0) + (frame?.bottom ?? 0)) / 2;
			expect(Math.abs(imageCenterX - frameCenterX)).toBeLessThanOrEqual(1);
			expect(Math.abs(imageCenterY - frameCenterY)).toBeLessThanOrEqual(1);
		},
	);

	it.each(["landscape", "portrait"] as const)("preserves cover crop geometry for %s sources", async (orientation) => {
		const page = await rasterPicture(orientation, "cover");
		const edgeBounds = Object.values(marker).map((color) => colorBounds(page, color));
		expect(edgeBounds.filter(Boolean)).toHaveLength(2);
	});

	it.each([
		{ borderWidth: 0, shadowWidth: 0 },
		{ borderWidth: 6, shadowWidth: 0 },
		{ borderWidth: 0, shadowWidth: 8 },
		{ borderWidth: 6, shadowWidth: 8 },
	])("retains every landscape edge with border $borderWidth and shadow $shadowWidth", async (frame) => {
		const page = await rasterPicture("landscape", "contain", "@version 1;", frame);
		for (const color of Object.values(marker)) expect(colorBounds(page, color)).toBeDefined();
	});

	it("lets semantic object-fit cover override selected contain", async () => {
		const cover = await rasterPicture("landscape", "cover");
		const overridden = await rasterPicture("landscape", "contain", "@version 1; picture { object-fit: cover; }");
		expect([...overridden.data]).toEqual([...cover.data]);
	});
});
