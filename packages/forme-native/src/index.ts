import type { RenderWithLayoutResult } from "@formepdf/core";
import { requireNativeModule } from "expo-modules-core";

type NativeRenderResult = { pdf: Uint8Array; layout: string; warnings: string };
type FormeNative = {
	renderWithLayout(json: string): Promise<NativeRenderResult>;
	subsetFont(bytes: Uint8Array, text: string): Promise<Uint8Array>;
};
const native = requireNativeModule<FormeNative>("FormeNative");

/** Assets must already be resolved to data URIs; this bridge performs no network requests. */
export async function renderSerializedDocWithLayout(doc: Record<string, unknown>): Promise<RenderWithLayoutResult> {
	const json = JSON.stringify(doc, (_key, value: unknown) => {
		if (!(value instanceof Uint8Array)) return value;
		let binary = "";
		for (let offset = 0; offset < value.length; offset += 0x8000) {
			binary += String.fromCharCode(...value.subarray(offset, offset + 0x8000));
		}
		return `data:font/ttf;base64,${btoa(binary)}`;
	});
	const result = await native.renderWithLayout(json);
	return { pdf: result.pdf, layout: JSON.parse(result.layout), warnings: JSON.parse(result.warnings) };
}

/** Runs on the module's worker queue. Wire directly into async FormeEngine.prepareFont. */
export function subsetFont(bytes: Uint8Array, text: string): Promise<Uint8Array> {
	return native.subsetFont(bytes, text);
}
