import { Trans } from "@lingui/react/macro";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useDialogStore } from "@/dialogs/store";

export function ImportTemplateButton() {
	const openDialog = useDialogStore((state) => state.openDialog);

	return (
		<Button variant="outline" onClick={() => openDialog("template.import", undefined)}>
			<UploadSimpleIcon className="mr-2" />
			<Trans>Import Template</Trans>
		</Button>
	);
}
