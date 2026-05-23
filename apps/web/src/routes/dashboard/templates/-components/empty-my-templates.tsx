import { Trans } from "@lingui/react/macro";
import { UploadSimpleIcon } from "@phosphor-icons/react";
import { Button } from "@reactive-resume/ui/components/button";
import { useDialogStore } from "@/dialogs/store";

export function EmptyMyTemplates() {
	const openDialog = useDialogStore((state) => state.openDialog);

	return (
		<div className="flex flex-col items-center justify-center gap-y-4 rounded-lg border border-dashed py-16 text-center">
			<UploadSimpleIcon weight="thin" size={48} className="text-muted-foreground" />
			<div className="space-y-1">
				<p className="font-medium">
					<Trans>You haven't imported any custom templates yet.</Trans>
				</p>
				<p className="text-muted-foreground text-sm">
					<Trans>Import a .rxt file to add your own template.</Trans>
				</p>
			</div>
			<Button variant="outline" onClick={() => openDialog("template.import", undefined)}>
				<UploadSimpleIcon className="mr-2" />
				<Trans>Import Template</Trans>
			</Button>
		</div>
	);
}
