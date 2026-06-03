import { t } from "@lingui/core/macro";
import { PlusIcon } from "@phosphor-icons/react";
import { useDialogStore } from "@/dialogs/store";
import { BaseCard } from "../../resumes/-components/cards/base-card";

export function CreateTemplateCard() {
	const { openDialog } = useDialogStore();

	return (
		<BaseCard
			title={t`Create a new template`}
			description={t`Start from a built-in template`}
			onClick={() => openDialog("custom-template.create", undefined)}
		>
			<div className="absolute inset-0 flex items-center justify-center">
				<PlusIcon weight="thin" className="size-12" />
			</div>
		</BaseCard>
	);
}
