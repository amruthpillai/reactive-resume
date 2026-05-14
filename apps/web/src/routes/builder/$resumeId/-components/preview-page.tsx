import { t } from "@lingui/core/macro";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Suspense, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { LoadingScreen } from "@/components/layout/loading-screen";
import { ResumePreview } from "@/components/resume/preview";
import { BuilderDock } from "./dock";
import { DEFAULT_BUILDER_PREVIEW_PAGE_LAYOUT, getNextBuilderPreviewPageLayout } from "./page-layout";

export function PreviewPage() {
	const [pageLayout, setPageLayout] = useState(DEFAULT_BUILDER_PREVIEW_PAGE_LAYOUT);

	useHotkey("Mod+S", () => {
		toast.info(t`Your changes are saved automatically.`, { id: "auto-save", icon: <FloppyDiskIcon /> });
	});

	return (
		<Suspense fallback={<LoadingScreen />}>
			<div className="fixed inset-0">
				<TransformWrapper
					centerOnInit
					maxScale={5}
					minScale={0.5}
					initialScale={0.75}
					limitToBounds={false}
					wheel={{ step: 0.001 }}
				>
					<TransformComponent wrapperClass="h-full! w-full!">
						<ResumePreview showPageNumbers pageLayout={pageLayout} />
					</TransformComponent>

					<BuilderDock
						pageLayout={pageLayout}
						onTogglePageLayout={() => {
							setPageLayout((current) => getNextBuilderPreviewPageLayout(current));
						}}
					/>
				</TransformWrapper>
			</div>
		</Suspense>
	);
}
