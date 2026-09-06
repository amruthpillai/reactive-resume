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

const cropMarker = {
	start: [255, 128, 0],
	end: [0, 128, 128],
} as const;

const frameColor = [255, 0, 255] as const;
const pictureBounds = { left: 21, right: 170, top: 18, bottom: 167 } as const;

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
	if (orientation === "landscape") {
		context.fillStyle = "#ff8000";
		context.fillRect(50, 0, 5, height);
		context.fillStyle = "#008080";
		context.fillRect(width - 55, 0, 5, height);
	}
	if (orientation === "portrait") {
		context.fillStyle = "#ff8000";
		context.fillRect(0, 50, width, 5);
		context.fillStyle = "#008080";
		context.fillRect(0, height - 55, width, 5);
	}
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

type Bounds = NonNullable<ReturnType<typeof colorBounds>>;

function requiredColorBounds(
	page: Awaited<ReturnType<typeof rasterPicture>>,
	color: readonly number[],
	label: string,
): Bounds {
	const bounds = colorBounds(page, color);
	expect(bounds, label).toBeDefined();
	if (!bounds) throw new Error(`Missing ${label}`);
	return bounds;
}

function mergedBounds(bounds: readonly Bounds[]): Bounds {
	return {
		left: Math.min(...bounds.map(({ left }) => left)),
		right: Math.max(...bounds.map(({ right }) => right)),
		top: Math.min(...bounds.map(({ top }) => top)),
		bottom: Math.max(...bounds.map(({ bottom }) => bottom)),
	};
}

function expectBoundsWithinPixel(actual: Bounds, expected: Bounds) {
	for (const edge of ["left", "right", "top", "bottom"] as const) {
		expect(Math.abs(actual[edge] - expected[edge]), edge).toBeLessThanOrEqual(1);
	}
}

function boundsCenter(bounds: Bounds) {
	return {
		x: (bounds.left + bounds.right) / 2,
		y: (bounds.top + bounds.bottom) / 2,
	};
}

function expectSameCenter(actual: Bounds, expected: Bounds) {
	const actualCenter = boundsCenter(actual);
	const expectedCenter = boundsCenter(expected);
	expect(Math.abs(actualCenter.x - expectedCenter.x), "center x").toBeLessThanOrEqual(1);
	expect(Math.abs(actualCenter.y - expectedCenter.y), "center y").toBeLessThanOrEqual(1);
}

function expectedContentBounds(borderWidth: number): Bounds {
	const inset = borderWidth * 1.5;
	return {
		left: pictureBounds.left + inset,
		right: pictureBounds.right - inset,
		top: pictureBounds.top + inset,
		bottom: pictureBounds.bottom - inset,
	};
}

function expectedContainBounds(orientation: Orientation, borderWidth: number): Bounds {
	const content = expectedContentBounds(borderWidth);
	const contentWidth = content.right - content.left + 1;
	const contentHeight = content.bottom - content.top + 1;
	const [sourceWidth, sourceHeight] = dimensions[orientation];
	const scale = Math.min(contentWidth / sourceWidth, contentHeight / sourceHeight);
	const width = sourceWidth * scale;
	const height = sourceHeight * scale;
	const center = boundsCenter(content);
	return {
		left: center.x - (width - 1) / 2,
		right: center.x + (width - 1) / 2,
		top: center.y - (height - 1) / 2,
		bottom: center.y + (height - 1) / 2,
	};
}

describe("picture fit geometry (#2782)", () => {
	it.each(["square", "landscape", "portrait"] as const)(
		"keeps every %s source edge visible and centered in contain mode",
		async (orientation) => {
			const page = await rasterPicture(orientation, "contain");
			const edges = Object.entries(marker).map(([name, color]) => requiredColorBounds(page, color, name));
			const image = mergedBounds(edges);
			expectBoundsWithinPixel(image, expectedContainBounds(orientation, 6));
			expectSameCenter(image, requiredColorBounds(page, frameColor, "frame"));
		},
	);

	it.each([
		{ orientation: "landscape", retained: ["top", "bottom"], cropped: ["left", "right"] },
		{ orientation: "portrait", retained: ["left", "right"], cropped: ["top", "bottom"] },
	] as const)(
		"preserves centered cover crop geometry for $orientation sources",
		async ({ orientation, retained, cropped }) => {
			const page = await rasterPicture(orientation, "cover");
			for (const edge of retained) expect(colorBounds(page, marker[edge]), `${edge} retained`).toBeDefined();
			for (const edge of cropped) expect(colorBounds(page, marker[edge]), `${edge} cropped`).toBeUndefined();

			const content = expectedContentBounds(6);
			const start = requiredColorBounds(page, cropMarker.start, "start crop marker");
			const end = requiredColorBounds(page, cropMarker.end, "end crop marker");
			const visibleImage = mergedBounds([
				...retained.map((edge) => requiredColorBounds(page, marker[edge], edge)),
				start,
				end,
			]);
			expectBoundsWithinPixel(visibleImage, content);
			expectSameCenter(mergedBounds([start, end]), content);

			if (orientation === "landscape") {
				expect(Math.abs(start.left - content.left)).toBeLessThanOrEqual(1);
				expect(Math.abs(end.right - content.right)).toBeLessThanOrEqual(1);
			} else {
				expect(Math.abs(start.top - content.top)).toBeLessThanOrEqual(1);
				expect(Math.abs(end.bottom - content.bottom)).toBeLessThanOrEqual(1);
			}
		},
	);

	it("keeps square cover source edges uncropped", async () => {
		const page = await rasterPicture("square", "cover");
		const image = mergedBounds(Object.entries(marker).map(([name, color]) => requiredColorBounds(page, color, name)));
		expectBoundsWithinPixel(image, expectedContentBounds(6));
		expectSameCenter(image, requiredColorBounds(page, frameColor, "frame"));
	});

	it.each([
		{ borderWidth: 0, shadowWidth: 0 },
		{ borderWidth: 6, shadowWidth: 0 },
		{ borderWidth: 0, shadowWidth: 8 },
		{ borderWidth: 6, shadowWidth: 8 },
	])("retains every landscape edge with border $borderWidth and shadow $shadowWidth", async (frame) => {
		const page = await rasterPicture("landscape", "contain", "@version 1;", frame);
		const image = mergedBounds(Object.entries(marker).map(([name, color]) => requiredColorBounds(page, color, name)));
		expectBoundsWithinPixel(image, expectedContainBounds("landscape", frame.borderWidth));
		expectSameCenter(image, expectedContentBounds(frame.borderWidth));
	});

	it("lets semantic object-fit cover override selected contain", async () => {
		const cover = await rasterPicture("landscape", "cover");
		const overridden = await rasterPicture("landscape", "contain", "@version 1; picture { object-fit: cover; }");
		expect([...overridden.data]).toEqual([...cover.data]);
	});
});
