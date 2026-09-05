export type ResumeThumbnailSize = {
	height: number;
	width: number;
};

// A single-column Grid card is at most 608 CSS px before the sm breakpoint.
// Its A4 container at DPR 3 needs 1824 x 2580 px. This budget accommodates it
// with room for size buckets, while limiting extreme zoom/ultrawide canvases
// to 24 MiB of RGBA pixels and 3072 px on either side.
const MAX_THUMBNAIL_PIXELS = 2048 * 3072;
const MAX_THUMBNAIL_DIMENSION = 3072;
const THUMBNAIL_SIZE_STEP = 64;

export const getResumeThumbnailCacheKey = (resumeId: string, updatedAt: Date) => {
	return `${resumeId}:${updatedAt.getTime()}`;
};

const limitThumbnailSize = ({ width, height }: ResumeThumbnailSize): ResumeThumbnailSize => {
	const scale = Math.min(
		1,
		MAX_THUMBNAIL_DIMENSION / Math.max(width, height),
		Math.sqrt(MAX_THUMBNAIL_PIXELS / (width * height)),
	);
	return { width: Math.floor(width * scale), height: Math.floor(height * scale) };
};

export const getResumeThumbnailSize = (container: ResumeThumbnailSize, pixelRatio: number): ResumeThumbnailSize => {
	const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
	return limitThumbnailSize({
		width: Math.ceil((container.width * ratio) / THUMBNAIL_SIZE_STEP) * THUMBNAIL_SIZE_STEP,
		height: Math.ceil((container.height * ratio) / THUMBNAIL_SIZE_STEP) * THUMBNAIL_SIZE_STEP,
	});
};

export const getResumeThumbnailRenderSize = (pageSize: ResumeThumbnailSize, target: ResumeThumbnailSize) => {
	const bounds = limitThumbnailSize(target);
	// Match background-size: contain, including landscape and unpaginated PDFs.
	const scale = Math.min(bounds.width / pageSize.width, bounds.height / pageSize.height);

	return {
		height: Math.min(bounds.height, Math.ceil(pageSize.height * scale)),
		scale,
		width: Math.min(bounds.width, Math.ceil(pageSize.width * scale)),
	};
};
