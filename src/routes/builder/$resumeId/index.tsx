import { t } from "@lingui/core/macro";
import { FloppyDiskIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useHotkeys } from "react-hotkeys-hook";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { ResumePreview } from "@/components/resume/preview";
import { BuilderDock } from "./-components/dock";

export const Route = createFileRoute("/builder/$resumeId/")({
	component: RouteComponent,
});

function RouteComponent() {
	useHotkeys(
		["ctrl+s", "meta+s"],
		() => {
			toast.info(t`Your changes are saved automatically.`, {
				id: "auto-save",
				icon: <FloppyDiskIcon />,
			});
		},
		{ preventDefault: true, enableOnFormTags: true },
	);

	return (
		<div className="fixed inset-0">
			<TransformWrapper centerOnInit limitToBounds={false} minScale={0.3} initialScale={0.6} maxScale={6}>
				<TransformComponent wrapperClass="h-full! w-full!">
					<ResumePreview
						showPageNumbers
						className="flex items-start space-x-10 space-y-10"
						pageClassName="shadow-xl rounded-md overflow-hidden"
					/>
				</TransformComponent>

				<BuilderDock />
			</TransformWrapper>
		</div>
	);
}
