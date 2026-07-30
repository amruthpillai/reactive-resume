export const ACTIVE_PREVIEW_PAGE_SELECTOR = '[aria-hidden="false"] canvas[aria-label^="Resume page 1 of"]';

export function readPreviewPageDataUrl(selector: string) {
	const canvas = document.querySelector<HTMLCanvasElement>(selector);
	if (!canvas) throw new Error("Expected an active first-page canvas.");
	return canvas.toDataURL();
}
