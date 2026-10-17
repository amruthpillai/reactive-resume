import type { RenderWithLayoutResult } from "@formepdf/core";
import { requireNativeModule } from "expo-modules-core";

type NativeRenderResult = { pdf: Uint8Array; layout: string; warnings: string };
type FormeNative = {
	renderWithLayout(json: string): Promise<NativeRenderResult>;
	subsetFont(bytes: Uint8Array, text: string): Promise<Uint8Array>;
};
const native = requireNativeModule<FormeNative>("FormeNative");

const fontDataUri = (bytes: Uint8Array): string => {
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return `data:font/ttf;base64,${btoa(binary)}`;
};

/** Assets must already be resolved to data URIs; this bridge performs no network requests. */
export async function renderSerializedDocWithLayout(doc: Record<string, unknown>): Promise<RenderWithLayoutResult> {
	const fonts: unknown[] = Array.isArray(doc.fonts) ? doc.fonts : [];
	const json = JSON.stringify(doc, function (this: unknown, key, value: unknown) {
		if (key !== "src" || !fonts.includes(this) || !(value instanceof Uint8Array)) return value;
		return fontDataUri(value);
	});
	const result = await native.renderWithLayout(json);
	return { pdf: result.pdf, layout: JSON.parse(result.layout), warnings: JSON.parse(result.warnings) };
}

/** Runs on the module's worker queue. Wire directly into async FormeEngine.prepareFont. */
export function subsetFont(bytes: Uint8Array, text: string): Promise<Uint8Array> {
	return native.subsetFont(bytes, text);
}

// Keep the browser preparer's generated digits, break hyphens and fallback punctuation too.
const ALWAYS_KEPT = `${Array.from({ length: 95 }, (_, index) => String.fromCharCode(32 + index)).join("")}\u00a0\u00ad\u2010\u2011\u2026`;
const prepared = new WeakMap<Uint8Array, { text: string; src: Promise<string> }>();

/** A ready, structurally compatible FormeEngine; no runtime dependency on the PDF package. */
export const nativeEngine = {
	renderSerializedDocWithLayout,
	prepareFont(bytes: Uint8Array, text: string): Promise<string> {
		const cached = prepared.get(bytes);
		if (cached?.text === text) return cached.src;
		const src = subsetFont(bytes, text + ALWAYS_KEPT)
			// A font HarfBuzz can't cut still renders, embedded whole, as in the browser adapter.
			.catch(() => bytes)
			.then(fontDataUri);
		prepared.set(bytes, { text, src });
		return src;
	},
};
