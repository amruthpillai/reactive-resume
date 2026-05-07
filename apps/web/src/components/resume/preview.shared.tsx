import { Spinner } from "@reactive-resume/ui/components/spinner";

export type ResumePreviewProps = {
	className?: string;
	pageGap?: React.CSSProperties["gap"];
	pageLayout?: "horizontal" | "vertical";
	pageScale?: number;
	pageClassName?: string;
	showPageNumbers?: boolean;
};

export type ResolvedResumePreviewProps = ResumePreviewProps & {
	pageGap: React.CSSProperties["gap"];
	pageLayout: "horizontal" | "vertical";
	pageScale: number;
	showPageNumbers: boolean;
};

export type PreviewPageSize = {
	height: number;
	width: number;
};

const PDF_PAGE_RENDER_SCALE = 4;
const MAX_PREVIEW_CANVAS_PIXELS = 16_777_216; // 4096 * 4096
export const DEFAULT_PDF_PAGE_SIZE: PreviewPageSize = {
	height: 841.89,
	width: 595.28,
};

export const normalizeResumePreviewProps = ({
	pageGap = 40,
	pageLayout = "horizontal",
	pageScale = 1,
	showPageNumbers = false,
	...props
}: ResumePreviewProps): ResolvedResumePreviewProps => ({
	...props,
	pageGap,
	pageLayout,
	pageScale,
	showPageNumbers,
});

export const getPreviewCanvasScale = (width: number, height: number) => {
	const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	const desiredScale = Math.max(PDF_PAGE_RENDER_SCALE, devicePixelRatio);
	const desiredPixels = width * height * desiredScale * desiredScale;

	if (desiredPixels <= MAX_PREVIEW_CANVAS_PIXELS) return desiredScale;

	return Math.sqrt(MAX_PREVIEW_CANVAS_PIXELS / (width * height));
};

export const getScaledPreviewPageSize = (pageSize: PreviewPageSize, pageScale: number): PreviewPageSize => ({
	height: pageSize.height * pageScale,
	width: pageSize.width * pageScale,
});

export function ResumePreviewLoader() {
	return (
		<figure className="shrink-0">
			<figcaption className="mb-1 font-medium text-[0.625rem] text-muted-foreground">Loading...</figcaption>

			<div style={DEFAULT_PDF_PAGE_SIZE} className="rounded-md bg-white">
				<Spinner className="size-10" />
			</div>
		</figure>
	);
}
