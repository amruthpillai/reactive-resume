/// <reference lib="webworker" />

import type { PdfWorkerRequest, PdfWorkerResponse } from "./pdf-document";
import type { PageMap } from "@reactive-resume/pdf/page-map";
import { createResumePdfBlob, preloadResumePdf } from "@reactive-resume/pdf/browser";
import { createSectionTitleResolverForLocale } from "@/libs/resume/section-title-locale";

// Renders off the main thread, so typing, scrolling and the gallery stay smooth while a page is laid out.
self.addEventListener("message", async ({ data: request }: MessageEvent<PdfWorkerRequest>) => {
	const { id, data, template, renderOptions } = request;
	try {
		preloadResumePdf(data);
		let pageMap: PageMap | undefined;
		let lostCharacters: string[] | undefined;
		const blob = await createResumePdfBlob({
			data,
			template,
			renderOptions,
			resolveSectionTitle: await createSectionTitleResolverForLocale(data.metadata.page.locale),
			onPageMap: (map) => {
				pageMap = map;
			},
			onLostCharacters: (characters) => {
				lostCharacters = characters;
			},
		});
		self.postMessage({ id, blob, pageMap, lostCharacters } satisfies PdfWorkerResponse);
	} catch (error) {
		const cause = error instanceof Error && typeof error.cause === "string" ? error.cause : undefined;
		self.postMessage({
			id,
			error: error instanceof Error ? error.message : String(error),
			cause,
		} satisfies PdfWorkerResponse);
	}
});
