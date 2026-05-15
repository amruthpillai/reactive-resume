import { Dialog } from "@reactive-resume/ui/components/dialog";
import { renderDialog } from "./renderers";
import { useDialogStore } from "./store";

export function DialogManager() {
	const { open, activeDialog, onOpenChange } = useDialogStore();

	const DialogContent = renderDialog(activeDialog);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{DialogContent}
		</Dialog>
	);
}
