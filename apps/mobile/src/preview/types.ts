// The preview pipeline's contract (M3-T4 implements it): draft data in, rasterised pages and the page map out.
// Renders run on the device through @reactive-resume/pdf/native and @reactive-resume/forme-native.
import type { ResumeDocument } from "@reactive-resume/pdf/document";
import type { PageMap } from "@reactive-resume/pdf/page-map";
import type { ResumeData } from "@reactive-resume/schema/resume/data";
import type { Template } from "@reactive-resume/schema/templates";
import type { ComponentProps } from "react";

/**
 * `ResumeRenderOptions` from packages/pdf (for example `includeCoverLetterHeader` for letters). No public entry exports
 * it by name yet, so it is read off `ResumeDocument`'s props; switch to the named type once `./native` exports it.
 */
export type ResumeRenderOptions = NonNullable<ComponentProps<typeof ResumeDocument>["renderOptions"]>;

export type RenderRequest = {
	/** Increases with every request. The scheduler drops a result when a newer request has been made. */
	id: number;
	data: ResumeData;
	/** Renders with another template than `data.metadata.template` (Design → Template thumbnails). */
	template?: Template | undefined;
	/** Passed through to the renderer unchanged. */
	renderOptions?: ResumeRenderOptions | undefined;
	/** A field has focus: the debounce is 250 ms instead of 100 ms (the web values). */
	focused?: boolean | undefined;
	/** Rasterise only these zero-based pages; all pages when omitted. */
	pages?: number[] | undefined;
	/** Pixels per PDF point for the PNGs, for example the screen scale times the zoom. */
	scale: number;
};

export type RenderedPage = {
	/** Zero-based page number. */
	index: number;
	/** A `file://` PNG in the cache directory. */
	uri: string;
	/** Page size in PDF points. */
	width: number;
	height: number;
};

export type RenderedPages = {
	/** The `RenderRequest.id` this answers. */
	requestId: number;
	pageCount: number;
	pages: RenderedPage[];
	/** Header, section and item boxes per page, for the tap-to-edit overlay. */
	pageMap: PageMap;
	/** Characters no font could draw (`"₹" (U+20B9)`); empty when everything rendered. */
	lostCharacters: string[];
	/** The PDF itself, for download, share and print. */
	pdf: Uint8Array;
};
