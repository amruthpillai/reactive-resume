import { t } from "@lingui/core/macro";
import { MagicWandIcon } from "@phosphor-icons/react";
import { useDialogStore } from "@/dialogs/store";
import { BaseCard } from "./base-card";

export function WizardResumeCard() {
	const { openDialog } = useDialogStore();

	return (
		<BaseCard
			title={t`Wizard mode`}
			description={t`Turn your story or a job offer into a tailored resume`}
			onClick={() => openDialog("resume.wizard", undefined)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<MagicWandIcon weight="thin" className="size-12" />
			</div>
		</BaseCard>
	);
}
