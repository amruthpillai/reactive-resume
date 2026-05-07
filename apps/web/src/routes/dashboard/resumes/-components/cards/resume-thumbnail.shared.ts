type PageSize = {
	height: number;
	width: number;
};

export const RESUME_THUMBNAIL_TARGET_WIDTH = 420;
const MAX_THUMBNAIL_PIXEL_RATIO = 2;

export const getResumeThumbnailCacheKey = (resumeId: string, updatedAt: Date) => {
	return `${resumeId}:${updatedAt.getTime()}`;
};

export const getResumeThumbnailRenderSize = (
	pageSize: PageSize,
	targetWidth = RESUME_THUMBNAIL_TARGET_WIDTH,
	pixelRatio = 1,
) => {
	const outputScale = Math.min(Math.max(pixelRatio, 1), MAX_THUMBNAIL_PIXEL_RATIO);
	const pageScale = targetWidth / pageSize.width;

	return {
		height: Math.round(pageSize.height * pageScale * outputScale),
		scale: pageScale * outputScale,
		width: Math.round(targetWidth * outputScale),
	};
};
