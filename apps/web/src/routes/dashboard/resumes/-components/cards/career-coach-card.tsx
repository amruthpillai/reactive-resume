import { t } from "@lingui/core/macro";
import { BrainIcon } from "@phosphor-icons/react";
import { useDialogStore } from "@/dialogs/store";
import { BaseCard } from "./base-card";

export function CareerCoachCard() {
	const { openDialog } = useDialogStore();

	return (
		<BaseCard
			title={t`Career coach`}
			description={t`Get a practical plan for roles, skills, interviews, LinkedIn, and salary`}
			onClick={() => openDialog("resume.career-coach", undefined)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<BrainIcon weight="thin" className="size-12" />
			</div>
		</BaseCard>
	);
}
