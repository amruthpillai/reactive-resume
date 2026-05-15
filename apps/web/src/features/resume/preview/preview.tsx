import type { ResumePreviewProps } from "./preview.shared";
import { lazy, Suspense } from "react";
import { useIsClient } from "usehooks-ts";
import { useResumeData } from "../builder/draft";
import { getResumePreviewPageCount, normalizeResumePreviewProps, ResumePreviewLoader } from "./preview.shared";

const ResumePreviewClient = lazy(() =>
	import("./preview.browser").then((module) => ({ default: module.ResumePreviewClient })),
);

export type { ResumePreviewProps };

export function ResumePreview(props: ResumePreviewProps) {
	const isClient = useIsClient();
	const resolvedProps = normalizeResumePreviewProps(props);
	const builderResumeData = useResumeData();
	const resumeData = resolvedProps.data ?? builderResumeData;
	const pageCount = getResumePreviewPageCount(resumeData);

	if (!isClient) return null;

	return (
		<Suspense
			fallback={
				<ResumePreviewLoader
					pageCount={pageCount}
					pageClassName={resolvedProps.pageClassName}
					pageGap={resolvedProps.pageGap}
					pageLayout={resolvedProps.pageLayout}
					pageScale={resolvedProps.pageScale}
					showPageNumbers={resolvedProps.showPageNumbers}
				/>
			}
		>
			<ResumePreviewClient {...resolvedProps} />
		</Suspense>
	);
}
