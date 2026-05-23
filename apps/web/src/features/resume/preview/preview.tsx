import type { ResumePreviewProps } from "./preview.shared";
import { lazy, Suspense } from "react";
import { useIsClient } from "usehooks-ts";
import { normalizeResumePreviewProps, ResumePreviewLoader } from "./preview.shared";

const ResumePreviewClient = lazy(() =>
	import("./preview.browser").then((module) => ({ default: module.ResumePreviewClient })),
);

export type { ResumePreviewProps };

export function ResumePreview(props: ResumePreviewProps) {
	const isClient = useIsClient();
	const resolvedProps = normalizeResumePreviewProps(props);
	if (!isClient) return null;

	return (
		<Suspense
			fallback={
				<ResumePreviewLoader
					pageCount={1}
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
