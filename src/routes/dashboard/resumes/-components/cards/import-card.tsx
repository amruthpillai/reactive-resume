import { DownloadSimpleIcon } from "@phosphor-icons/react";
import { useDialogStore } from "@/dialogs/store";
import { BaseCard } from "./base-card";

export function ImportResumeCard() {
	const { openDialog } = useDialogStore();

	return (
		<BaseCard
			title={"Import an existing resume"}
			description={"Continue where you left off"}
			onClick={() => openDialog("resume.import", undefined)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<DownloadSimpleIcon weight="thin" className="size-12" />
			</div>
		</BaseCard>
	);
}
