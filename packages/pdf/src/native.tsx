// The React Native adapter: the app injects the Forme engine (packages/forme-native) and, through
// `configureFontReader`, a persistent font cache. That wrapper must fall back to the network on disk errors.
// No React Native import, so the package stays runtime-neutral. Configure readers once before rendering.
import type { ResumeRenderOptions } from "./context";
import type { FormeEngine } from "./forme/render";
import type { PageMap } from "./page-map";
import type { SectionTitleResolver } from "./section-title";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import { parseResumeData } from "@reactive-resume/schema/resume/data";
import { assertPdfFonts, lostCharacters, renderResume } from "./forme/render";

export type { FormeEngine } from "./forme/render";
export type { PageMap } from "./page-map";
export { configureFontReader, downloadFont } from "./forme/fonts";
export { configureImageFetch } from "./forme/images";

export type RenderResumePdfOptions = {
	data: ResumeData;
	template?: Template | undefined;
	renderOptions?: ResumeRenderOptions | undefined;
	resolveSectionTitle?: SectionTitleResolver | undefined;
	/** Receives the header, section and item boxes of this render (see `page-map.ts`). */
	onPageMap?: ((pageMap: PageMap) => void) | undefined;
	/** Receives characters no font could draw; not called when every character rendered. */
	onLostCharacters?: ((characters: string[]) => void) | undefined;
};

/** Same contract as `createResumePdfBlob` in `browser.tsx`, with the engine injected; resolves to PDF bytes. */
export const renderResumePdf = async (
	engine: FormeEngine,
	{ onPageMap, onLostCharacters, ...input }: RenderResumePdfOptions,
): Promise<Uint8Array> => {
	const data = parseResumeData(input.data);
	const result = await renderResume(engine, { ...input, data });
	assertPdfFonts(result);
	onPageMap?.(result.pageMap);
	const lost = lostCharacters(result.warnings);
	if (lost) onLostCharacters?.(lost);
	return result.pdf;
};
